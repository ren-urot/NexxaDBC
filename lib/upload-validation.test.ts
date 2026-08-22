import { describe, it, expect } from 'vitest';
import { validateUploadedImage } from './upload-validation';

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'test-file', { type });
}

describe('validateUploadedImage', () => {
  it('accepts a png under the size limit', () => {
    expect(validateUploadedImage(makeFile('image/png', 1024))).toBeNull();
  });

  it('accepts a jpeg', () => {
    expect(validateUploadedImage(makeFile('image/jpeg', 1024))).toBeNull();
  });

  it('accepts a webp', () => {
    expect(validateUploadedImage(makeFile('image/webp', 1024))).toBeNull();
  });

  it('rejects a non-image type', () => {
    expect(validateUploadedImage(makeFile('text/html', 1024))).not.toBeNull();
  });

  it('rejects a file over the size limit', () => {
    expect(validateUploadedImage(makeFile('image/png', 6 * 1024 * 1024))).not.toBeNull();
  });
});
