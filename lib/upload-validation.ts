const RASTER_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateUploadedImage(file: File): string | null {
  if (!RASTER_IMAGE_TYPES.has(file.type)) {
    return 'File must be a PNG, JPEG, or WebP image';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'File must be 5MB or smaller';
  }
  return null;
}

// Logos additionally accept SVG — the source most brand kits ship in. The
// upload pipeline sanitizes SVG content (lib/svg-sanitize.ts) before it's
// ever stored, so this widened allowlist doesn't reopen the stored-XSS risk
// raw SVG uploads normally carry.
const LOGO_IMAGE_TYPES = new Set([...RASTER_IMAGE_TYPES, 'image/svg+xml']);

export function validateUploadedLogo(file: File): string | null {
  if (!LOGO_IMAGE_TYPES.has(file.type)) {
    return 'File must be a PNG, JPEG, WebP, or SVG image';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'File must be 5MB or smaller';
  }
  return null;
}
