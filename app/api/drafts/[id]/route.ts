import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { cardDataPartialSchema, styleOverridesSchema } from '@/lib/validation/card-schema';
import { z } from 'zod';

const patchSchema = cardDataPartialSchema.extend({
  styleOverrides: styleOverridesSchema.optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateDraft(id, parsed.data);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
