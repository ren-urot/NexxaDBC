import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { uploadLogo } from '@/lib/blob';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const logoUrl = await uploadLogo(file, id);
  const updated = await updateDraft(id, { logoUrl });
  return NextResponse.json(updated);
}
