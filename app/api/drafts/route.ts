import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDraft } from '@/lib/db/drafts';
import { getTemplate } from '@/lib/templates/registry';
import { resolveSessionId, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

const createDraftSchema = z.object({
  templateId: z.string().min(1),
  orientation: z.enum(['vertical', 'horizontal']),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    getTemplate(parsed.data.templateId);
  } catch {
    return NextResponse.json({ error: `Unknown template: ${parsed.data.templateId}` }, { status: 400 });
  }

  const { sessionId, isNew } = resolveSessionId(req);
  const draft = await createDraft({ sessionId, ...parsed.data });

  const res = NextResponse.json(draft, { status: 201 });
  if (isNew) {
    res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
  }
  return res;
}
