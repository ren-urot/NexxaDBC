const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateUploadedImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'File must be a PNG, JPEG, or WebP image';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'File must be 5MB or smaller';
  }
  return null;
}
