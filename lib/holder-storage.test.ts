import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCard, getCard, hasCard } from './holder-storage';
import type { CardData } from '@/lib/templates/types';

const sampleData: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

beforeEach(() => {
  // A fresh in-memory IndexedDB per test — real IndexedDB persists across a
  // browser session, so each test needs its own isolated instance rather
  // than inheriting state from the previous one.
  globalThis.indexedDB = new IDBFactory();
});

describe('holder-storage', () => {
  it('reports no card when nothing has been saved', async () => {
    expect(await hasCard()).toBe(false);
    expect(await getCard()).toBeNull();
  });

  it('saves and retrieves a card', async () => {
    await saveCard({ data: sampleData, style: {}, templateId: 'corporate-vertical' });
    expect(await hasCard()).toBe(true);
    const card = await getCard();
    expect(card?.data).toEqual(sampleData);
    expect(card?.templateId).toBe('corporate-vertical');
    expect(card?.savedAt).toBeDefined();
  });

  it('overwrites a previously saved card', async () => {
    await saveCard({ data: sampleData, style: {}, templateId: 'corporate-vertical' });
    const updated: CardData = { ...sampleData, jobTitle: 'CEO' };
    await saveCard({ data: updated, style: {}, templateId: 'modern-horizontal' });
    const card = await getCard();
    expect(card?.data.jobTitle).toBe('CEO');
    expect(card?.templateId).toBe('modern-horizontal');
  });
});
