import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, getDraftById, updateDraft } from '@/lib/db/drafts';
import { eq } from 'drizzle-orm';

vi.mock('@/lib/blob', () => ({
  deleteLogo: vi.fn().mockResolvedValue(undefined),
  uploadLogo: vi.fn(),
}));

import { deleteLogo } from '@/lib/blob';
import { GET } from './route';

function cronRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/expire-drafts', { headers });
}

async function makeStaleDraft() {
  const draft = await createDraft({
    sessionId: 's1',
    templateId: 'corporate-vertical',
    orientation: 'vertical',
  });
  await db
    .update(cardDrafts)
    .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
    .where(eq(cardDrafts.id, draft.id));
  return draft;
}

beforeEach(async () => {
  await db.delete(cardDrafts);
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/expire-drafts', () => {
  it('expires drafts older than 48 hours and reports the count', async () => {
    const stale = await makeStaleDraft();

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expiredCount).toBe(1);
    expect((await getDraftById(stale.id))?.status).toBe('expired');
  });

  it('deletes the blob of every expired draft that has a logo', async () => {
    const withLogo = await makeStaleDraft();
    await updateDraft(withLogo.id, { logoUrl: 'https://blob.example.com/logos/one.png' });
    // updateDraft touches updatedAt, so push it back into the stale window again.
    await db
      .update(cardDrafts)
      .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
      .where(eq(cardDrafts.id, withLogo.id));
    await makeStaleDraft(); // no logo — must not trigger a delete

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(body.expiredCount).toBe(2);
    expect(body.deletedLogoCount).toBe(1);
    expect(deleteLogo).toHaveBeenCalledTimes(1);
    expect(deleteLogo).toHaveBeenCalledWith('https://blob.example.com/logos/one.png');
  });

  it('nulls out logo_url after successfully deleting the blob, so the row stops pointing at a deleted file', async () => {
    const withLogo = await makeStaleDraft();
    await updateDraft(withLogo.id, { logoUrl: 'https://blob.example.com/logos/one.png' });
    await db
      .update(cardDrafts)
      .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
      .where(eq(cardDrafts.id, withLogo.id));

    await GET(cronRequest());

    expect((await getDraftById(withLogo.id))?.logoUrl).toBeNull();
  });

  it('leaves logo_url intact when the blob delete fails', async () => {
    vi.mocked(deleteLogo).mockRejectedValueOnce(new Error('blob delete failed'));
    const withLogo = await makeStaleDraft();
    await updateDraft(withLogo.id, { logoUrl: 'https://blob.example.com/logos/one.png' });
    await db
      .update(cardDrafts)
      .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
      .where(eq(cardDrafts.id, withLogo.id));

    const res = await GET(cronRequest());

    expect(res.status).toBe(200);
    expect((await getDraftById(withLogo.id))?.logoUrl).toBe('https://blob.example.com/logos/one.png');
  });

  it('rejects a request without the cron secret when one is configured', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it('accepts a request carrying the configured cron secret', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest({ authorization: 'Bearer top-secret' }));
    expect(res.status).toBe(200);
  });
});
