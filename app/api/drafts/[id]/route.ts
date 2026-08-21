import { NextRequest, NextResponse } from 'next/server';
import { updateDraft } from '@/lib/db/drafts';
import { cardDataPartialSchema, styleOverridesSchema } from '@/lib/validation/card-schema';
import { editableDraftConflict, loadOwnedDraft } from '@/lib/draft-access';
import { getTemplate } from '@/lib/templates/registry';

const patchSchema = cardDataPartialSchema.extend({
  styleOverrides: styleOverridesSchema.optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await loadOwnedDraft(req, id);
    if (!access.ok) return access.response;
    return NextResponse.json(access.draft);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await loadOwnedDraft(req, id);
    if (!access.ok) return access.response;

    const conflict = editableDraftConflict(access.draft);
    if (conflict) return conflict;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // The generic schema allows a wide fontSizeStep range; the real bounds are
    // whatever this draft's template declares as customizable.
    if (parsed.data.styleOverrides) {
      const styleError = validateAgainstTemplate(access.draft.templateId, parsed.data.styleOverrides);
      if (styleError) return NextResponse.json({ error: styleError }, { status: 400 });
    }

    const updated = await updateDraft(id, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

function validateAgainstTemplate(
  templateId: string,
  style: { accentColor?: string; fontSizeStep?: number }
): string | null {
  let template;
  try {
    template = getTemplate(templateId);
  } catch {
    return `Unknown template: ${templateId}`;
  }

  const { customizable } = template;

  if (style.accentColor !== undefined && !customizable.accentColor) {
    return `Template ${templateId} does not allow an accent color override`;
  }

  if (style.fontSizeStep !== undefined) {
    const bounds = customizable.fontSizeStep;
    if (!bounds) {
      return `Template ${templateId} does not allow a font size override`;
    }
    if (style.fontSizeStep < bounds.min || style.fontSizeStep > bounds.max) {
      return `fontSizeStep must be between ${bounds.min} and ${bounds.max} for template ${templateId}`;
    }
  }

  return null;
}
