import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, getDraftById } from '@/lib/db/drafts';
import { eq } from 'drizzle-orm';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('GET /api/cron/expire-drafts', () => {
  it('expires drafts older than 48 hours and reports the count', async () => {
    const stale = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await db
      .update(cardDrafts)
      .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
      .where(eq(cardDrafts.id, stale.id));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expiredCount).toBe(1);
    expect((await getDraftById(stale.id))?.status).toBe('expired');
  });
});
