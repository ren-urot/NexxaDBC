import type { CardData, StyleOverrides } from '@/lib/templates/types';

const DB_NAME = 'dbc-holder';
// v1 kept one record in a "card" store under a fixed key — a phone could
// hold only its own card. v2 moves to a "cards" store keyed by a generated
// id, one row per card, so the holder can carry cards collected from other
// people too, not just the one this phone was provisioned with.
const DB_VERSION = 2;
const STORE_NAME = 'cards';

export interface HolderCard {
  id: string;
  data: CardData;
  style: StyleOverrides;
  templateId: string;
  savedAt: string;
}

const IDENTITY_FIELDS: (keyof CardData)[] = [
  'firstName',
  'lastName',
  'jobTitle',
  'company',
  'mobile',
  'email',
  'address',
  'website',
  'logoUrl',
  'facebook',
  'linkedin',
  'instagram',
  'whatsapp',
  'messenger',
];

export function isSameCard(
  a: { data: CardData; templateId: string },
  b: { data: CardData; templateId: string }
): boolean {
  if (a.templateId !== b.templateId) return false;
  return IDENTITY_FIELDS.every(key => a.data[key] === b.data[key]);
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains('card')) db.deleteObjectStore('card');
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(card: Omit<HolderCard, 'id' | 'savedAt'>): Promise<HolderCard> {
  const db = await openDb();
  const record: HolderCard = { ...card, id: generateId(), savedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function getCards(): Promise<HolderCard[]> {
  const db = await openDb();
  const records = await new Promise<HolderCard[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
  db.close();

  // Self-heals any exact duplicates left over from a since-fixed race (React
  // Strict Mode double-invoking the install effect could write the same
  // scanned card twice before either write had committed). Keeps the
  // earliest-saved copy of each identity, deletes the rest from the store
  // so this cleanup only ever needs to run once.
  const sorted = records.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  const unique: HolderCard[] = [];
  const duplicateIds: string[] = [];
  for (const record of sorted) {
    if (unique.some(kept => isSameCard(kept, record))) {
      duplicateIds.push(record.id);
    } else {
      unique.push(record);
    }
  }
  if (duplicateIds.length > 0) {
    await Promise.all(duplicateIds.map(id => deleteCard(id)));
  }

  // Newest first — the card someone just scanned is the one they want to see.
  return unique.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getCardById(id: string): Promise<HolderCard | null> {
  const db = await openDb();
  const record = await new Promise<HolderCard | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record ?? null;
}

export async function hasCards(): Promise<boolean> {
  return (await getCards()).length > 0;
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
