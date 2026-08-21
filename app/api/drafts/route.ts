import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDraft } from '@/lib/db/drafts';
import { getTemplate } from '@/lib/templates/registry';
import { resolveSessionId, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

const createDraftSchema = z.object({
  templateId: z.string().min(1),
  // Accepted for backwards compatibility with existing clients, but never
  // trusted: the stored orientation always comes from the template itself.
  orientation: z.enum(['vertical', 'horizontal']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let template;
    try {
      template = getTemplate(parsed.data.templateId);
    } catch {
      return NextResponse.json({ error: `Unknown template: ${parsed.data.templateId}` }, { status: 400 });
    }

    const { sessionId, isNew } = resolveSessionId(req);
    // Orientation is a property of the template, so derive it rather than
    // letting a client persist a row whose orientation contradicts its template.
    const draft = await createDraft({
      sessionId,
      templateId: template.id,
      orientation: template.orientation,
    });

    const res = NextResponse.json(draft, { status: 201 });
    if (isNew) {
      res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    }
    return res;
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
