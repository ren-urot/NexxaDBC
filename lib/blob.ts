import { del, put } from '@vercel/blob';

export async function uploadLogo(file: File, draftId: string): Promise<string> {
  const blob = await put(`logos/${draftId}-${Date.now()}-${file.name}`, file, {
    access: 'public',
  });
  return blob.url;
}

/**
 * Removes an uploaded logo from blob storage. Used when a draft expires so we
 * stop paying to store a file no one can reach any more.
 */
export async function deleteLogo(url: string): Promise<void> {
  await del(url);
}

export async function uploadPaymentProof(file: File, orderId: string): Promise<string> {
  const blob = await put(`payment-proofs/${orderId}-${Date.now()}-${file.name}`, file, {
    access: 'public',
  });
  return blob.url;
}
