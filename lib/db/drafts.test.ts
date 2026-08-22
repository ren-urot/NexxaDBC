import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { cardDrafts, orders } from './schema';
import { createDraft, getDraftById, updateDraft, submitDraft, expireStaleDrafts } from './drafts';

beforeEach(async () => {
  // orders.draftId references card_drafts.id — must clear the referencing
  // table first or a leftover order from a Commerce test run blocks this.
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('createDraft', () => {
  it('creates a draft with defaults', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    expect(draft.status).toBe('draft');
    expect(draft.styleOverrides).toEqual({});
  });
});

describe('getDraftById', () => {
  it('returns the draft when it exists', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const fetched = await getDraftById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('returns null when it does not exist', async () => {
    expect(await getDraftById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('updateDraft', () => {
  it('patches fields and bumps updatedAt', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const updated = await updateDraft(created.id, { firstName: 'Juan', email: 'juan@abc.com' });
    expect(updated?.firstName).toBe('Juan');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it('normalizes an empty-string patch value to NULL instead of storing ""', async () => {
    // cardDataPartialSchema now lets '' through for optional URL/email fields
    // (so clearing them can save at all); updateDraft is where that '' gets
    // turned into a genuine "unset" so it doesn't linger as a distinct value.
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await updateDraft(created.id, { website: 'https://abc.com' });

    const cleared = await updateDraft(created.id, { website: '' });

    expect(cleared?.website).toBeNull();
  });
});

describe('submitDraft', () => {
  it('marks the draft submitted', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const submitted = await submitDraft(created.id);
    expect(submitted?.status).toBe('submitted');
  });
});

describe('expireStaleDrafts', () => {
  it('expires only draft-status rows older than the cutoff', async () => {
    const stale = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await db.update(cardDrafts).set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) }).where(eq(cardDrafts.id, stale.id));
    const fresh = await createDraft({ sessionId: 's2', templateId: 'corporate-vertical', orientation: 'vertical' });

    await expireStaleDrafts(new Date(Date.now() - 1000 * 60 * 60 * 48));

    expect((await getDraftById(stale.id))?.status).toBe('expired');
    expect((await getDraftById(fresh.id))?.status).toBe('draft');
  });
});
