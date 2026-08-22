import type { CardData, StyleOverrides } from '@/lib/templates/types';

const DB_NAME = 'dbc-holder';
const DB_VERSION = 1;
const STORE_NAME = 'card';
const RECORD_KEY = 'current';

export interface HolderCard {
  data: CardData;
  style: StyleOverrides;
  templateId: string;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(card: Omit<HolderCard, 'savedAt'>): Promise<void> {
  const db = await openDb();
  const record: HolderCard = { ...card, savedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCard(): Promise<HolderCard | null> {
  const db = await openDb();
  const record = await new Promise<HolderCard | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record ?? null;
}

export async function hasCard(): Promise<boolean> {
  return (await getCard()) !== null;
}
