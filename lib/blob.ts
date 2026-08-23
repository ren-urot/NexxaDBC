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

// file.name is client-supplied and untrustworthy on two axes: as a path
// component (an uploaded name like "../../../etc/x" would let putLocal
// write outside uploads/), and as a stored extension (a request can declare
// Content-Type: image/png while naming the part "evil.html" — Next's static
// file server infers Content-Type from the stored filename's extension at
// serve time, not from anything declared at upload, so trusting file.name's
// extension would let a same-origin HTML/script response be served back).
// Both callers already validate file.type against an image allowlist before
// calling these, so deriving the extension from that validated type — never
// from file.name — closes both issues at once.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function safeExtension(file: File): string {
  return EXTENSION_BY_MIME_TYPE[file.type] ?? 'bin';
}

// Resolves a pathname under LOCAL_UPLOADS_DIR and asserts the result actually
// stays inside it — pathnames are built entirely from draftId/orderId, a
// timestamp, and safeExtension's fixed lookup table, so this should never
// trip, but it's cheap defense in depth to assert rather than assume.
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
  const pathname = `logos/${draftId}-${Date.now()}.${safeExtension(file)}`;
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
  const pathname = `payment-proofs/${orderId}-${Date.now()}.${safeExtension(file)}`;
  if (!hasBlobToken()) return putLocal(pathname, file);
  const blob = await put(pathname, file, { access: 'public' });
  return blob.url;
}

export async function deletePaymentProof(url: string): Promise<void> {
  if (!hasBlobToken()) return delLocal(url);
  await del(url);
}
