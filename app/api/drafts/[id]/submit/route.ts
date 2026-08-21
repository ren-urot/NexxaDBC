import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, submitDraft } from '@/lib/db/drafts';
import { cardDataSchema } from '@/lib/validation/card-schema';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Extract only the fields that cardDataSchema expects, converting null to undefined
  const cardData = {
    firstName: draft.firstName,
    lastName: draft.lastName,
    jobTitle: draft.jobTitle,
    company: draft.company,
    mobile: draft.mobile,
    email: draft.email,
    address: draft.address ?? undefined,
    website: draft.website ?? undefined,
    logoUrl: draft.logoUrl ?? undefined,
    facebook: draft.facebook ?? undefined,
    linkedin: draft.linkedin ?? undefined,
    instagram: draft.instagram ?? undefined,
    whatsapp: draft.whatsapp ?? undefined,
    messenger: draft.messenger ?? undefined,
  };

  const parsed = cardDataSchema.safeParse(cardData);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const submitted = await submitDraft(id);
  return NextResponse.json(submitted);
}
