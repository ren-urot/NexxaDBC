import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCard, getCards, getCardById, hasCards, deleteCard } from './holder-storage';
import type { CardData } from '@/lib/templates/types';

const juan: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

const maria: CardData = {
  firstName: 'Maria',
  lastName: 'Santos',
  jobTitle: 'CEO',
  company: 'XYZ Trading',
  mobile: '+639171234568',
  email: 'maria@xyz.com',
};

beforeEach(() => {
  // A fresh in-memory IndexedDB per test — real IndexedDB persists across a
  // browser session, so each test needs its own isolated instance rather
  // than inheriting state from the previous one.
  globalThis.indexedDB = new IDBFactory();
});

describe('holder-storage', () => {
  it('reports no cards when nothing has been saved', async () => {
    expect(await hasCards()).toBe(false);
    expect(await getCards()).toEqual([]);
  });

  it('saves and retrieves a card', async () => {
    const saved = await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    expect(await hasCards()).toBe(true);
    const card = await getCardById(saved.id);
    expect(card?.data).toEqual(juan);
    expect(card?.templateId).toBe('corporate-vertical');
    expect(card?.savedAt).toBeDefined();
  });

  it('holds more than one card — the point of a card holder', async () => {
    await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    await saveCard({ data: maria, style: {}, templateId: 'modern-horizontal' });
    const cards = await getCards();
    expect(cards).toHaveLength(2);
    expect(cards.map(c => c.data.firstName).sort()).toEqual(['Juan', 'Maria']);
  });

  it('lists newest-saved card first', async () => {
    await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    await new Promise(resolve => setTimeout(resolve, 5));
    await saveCard({ data: maria, style: {}, templateId: 'modern-horizontal' });
    const cards = await getCards();
    expect(cards[0].data.firstName).toBe('Maria');
    expect(cards[1].data.firstName).toBe('Juan');
  });

  it('removes a card by id', async () => {
    const saved = await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    await saveCard({ data: maria, style: {}, templateId: 'modern-horizontal' });
    await deleteCard(saved.id);
    const cards = await getCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].data.firstName).toBe('Maria');
  });

  it('returns null for an id that was never saved', async () => {
    expect(await getCardById('does-not-exist')).toBeNull();
  });

  it('self-heals leftover duplicate cards, keeping the earliest one and deleting the rest', async () => {
    // Regression: before the install page's Strict Mode re-entrancy guard,
    // a single scan could write the same card twice. Cards saved that way
    // are already on real devices, so getCards() cleans them up rather than
    // requiring a fresh install to fix it.
    const first = await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    await new Promise(resolve => setTimeout(resolve, 5));
    await saveCard({ data: juan, style: {}, templateId: 'corporate-vertical' });
    await new Promise(resolve => setTimeout(resolve, 5));
    await saveCard({ data: maria, style: {}, templateId: 'modern-horizontal' });

    const cards = await getCards();
    expect(cards).toHaveLength(2);
    expect(cards.filter(c => c.data.firstName === 'Juan')).toHaveLength(1);
    expect(cards.find(c => c.data.firstName === 'Juan')?.id).toBe(first.id);

    // The cleanup actually deleted the duplicate from the store, not just
    // filtered it out of this one response.
    const cardsAgain = await getCards();
    expect(cardsAgain).toHaveLength(2);
  });
});
