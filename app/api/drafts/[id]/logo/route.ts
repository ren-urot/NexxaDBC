import { NextRequest, NextResponse } from 'next/server';
import { updateDraft } from '@/lib/db/drafts';
import { uploadLogo } from '@/lib/blob';
import { editableDraftConflict, loadOwnedDraft } from '@/lib/draft-access';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await loadOwnedDraft(req, id);
    if (!access.ok) return access.response;

    // A logo upload is just another field patch, so it follows the same status
    // rule as PATCH — and it additionally costs blob storage, which is not
    // worth spending on a draft that can never be edited again.
    const conflict = editableDraftConflict(access.draft);
    if (conflict) return conflict;

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const logoUrl = await uploadLogo(file, id);
    const updated = await updateDraft(id, { logoUrl });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
