import { put } from '@vercel/blob';

export async function uploadLogo(file: File, draftId: string): Promise<string> {
  const blob = await put(`logos/${draftId}-${Date.now()}-${file.name}`, file, {
    access: 'public',
  });
  return blob.url;
}
