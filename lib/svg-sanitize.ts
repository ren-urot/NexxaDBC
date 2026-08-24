import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * Strips scripts, event handler attributes, and other executable content
 * from an uploaded SVG before it's stored. Without this, a logo upload is a
 * stored-XSS vector: the file is served back from our own origin (local dev)
 * or a public blob URL, and a browser executes an SVG's embedded script if
 * anyone ever navigates to that file URL directly rather than loading it
 * through an <img> tag.
 *
 * jsdom's own dependency tree pulls in ESM-only packages a CJS `require()`
 * can't load in Vercel's serverless bundle — but that only actually breaks
 * anything if this module gets loaded at all. lib/blob.ts imports it
 * dynamically, only for the rare SVG-upload path, so the common PNG/JPEG
 * logo and payment-proof uploads never touch jsdom or hit that crash.
 * (linkedom was tried as a lighter jsdom replacement here — rejected: it
 * doesn't crash, but DOMPurify silently returns input unsanitized against
 * its window, which is worse than a crash for a stored-XSS guard.)
 */
export async function sanitizeSvg(file: File): Promise<File> {
  const raw = await file.text();
  const window = new JSDOM('').window;
  const purify = createDOMPurify(window as unknown as Window & typeof globalThis);
  const clean = purify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  return new File([clean], file.name, { type: 'image/svg+xml' });
}
