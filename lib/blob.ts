import { del, put } from '@vercel/blob';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

// Local dev/test only: without a real Vercel Blob store (BLOB_READ_WRITE_TOKEN
// unset), fall back to the filesystem under public/uploads so `next dev` can
// serve the file immediately and the app is fully testable offline. Every
// deployed environment sets BLOB_READ_WRITE_TOKEN, so this path never runs
// there — it exists purely so local dev/E2E doesn't need cloud credentials.
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const LOCAL_URL_PREFIX = '/uploads/';

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// file.name comes from the client-supplied multipart upload and must never be
// trusted as a path component — an uploaded filename like "../../../etc/x"
// would otherwise let putLocal/delLocal write or delete outside uploads/.
function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
}

// Resolves a pathname under LOCAL_UPLOADS_DIR and asserts the result actually
// stays inside it, as defense in depth beyond safeFilename.
function resolveLocalPath(pathname: string): string {
  const dest = path.join(LOCAL_UPLOADS_DIR, pathname);
  if (!dest.startsWith(LOCAL_UPLOADS_DIR + path.sep)) {
    throw new Error('Resolved upload path escapes the uploads directory');
  }
  return dest;
}

async function putLocal(pathname: string, file: File): Promise<string> {
  const dest = resolveLocalPath(pathname);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `${LOCAL_URL_PREFIX}${pathname}`;
}

async function delLocal(url: string): Promise<void> {
  if (!url.startsWith(LOCAL_URL_PREFIX)) return;
  await unlink(resolveLocalPath(url.slice(LOCAL_URL_PREFIX.length))).catch(() => {});
}

export async function uploadLogo(file: File, draftId: string): Promise<string> {
  const pathname = `logos/${draftId}-${Date.now()}-${safeFilename(file.name)}`;
  if (!hasBlobToken()) return putLocal(pathname, file);
  const blob = await put(pathname, file, { access: 'public' });
  return blob.url;
}

/**
 * Removes an uploaded logo from blob storage. Used when a draft expires so we
 * stop paying to store a file no one can reach any more.
 */
export async function deleteLogo(url: string): Promise<void> {
  if (!hasBlobToken()) return delLocal(url);
  await del(url);
}

export async function uploadPaymentProof(file: File, orderId: string): Promise<string> {
  const pathname = `payment-proofs/${orderId}-${Date.now()}-${safeFilename(file.name)}`;
  if (!hasBlobToken()) return putLocal(pathname, file);
  const blob = await put(pathname, file, { access: 'public' });
  return blob.url;
}
