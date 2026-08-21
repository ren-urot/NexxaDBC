import { NextRequest, NextResponse } from 'next/server';
import { submitDraft } from '@/lib/db/drafts';
import { cardDataSchema } from '@/lib/validation/card-schema';
import { editableDraftConflict, loadOwnedDraft } from '@/lib/draft-access';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await loadOwnedDraft(req, id);
    if (!access.ok) return access.response;

    const { draft } = access;

    // Only a live draft can be submitted — no re-submitting or reviving an
    // expired draft through the API.
    const conflict = editableDraftConflict(draft);
    if (conflict) return conflict;

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
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
