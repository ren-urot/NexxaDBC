import { NextResponse, type NextRequest } from 'next/server';
import { getDraftById } from '@/lib/db/drafts';
import { SESSION_COOKIE } from '@/lib/session';
import type { CardDraftRow } from '@/lib/db/schema';

export type DraftAccess =
  | { ok: true; draft: CardDraftRow }
  | { ok: false; response: NextResponse };

function notFound(): NextResponse {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Loads a draft and verifies the caller's session cookie owns it.
 *
 * Draft ids are unguessable UUIDs, but they travel in URLs, so possession of an
 * id alone must not be enough to read the PII on a draft, mutate it, or submit
 * it. Every per-draft route funnels through here.
 *
 * A session mismatch answers 404 rather than 403 deliberately: a 403 would
 * confirm to a prober that the id exists.
 */
export async function loadOwnedDraft(req: NextRequest, id: string): Promise<DraftAccess> {
  const draft = await getDraftById(id);
  if (!draft) return { ok: false, response: notFound() };

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId || draft.sessionId !== sessionId) {
    return { ok: false, response: notFound() };
  }

  return { ok: true, draft };
}

/**
 * Guards mutations against drafts that are no longer editable. Returns a 409
 * response when the draft has already been submitted or has expired, or null
 * when the mutation may proceed.
 */
export function editableDraftConflict(draft: CardDraftRow): NextResponse | null {
  if (draft.status !== 'draft') {
    return NextResponse.json(
      { error: `Draft has already been ${draft.status} and can no longer be modified` },
      { status: 409 }
    );
  }
  return null;
}
