import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './api-error';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 400 });
}

describe('extractErrorMessage', () => {
  it('returns a plain string error message from the response body', async () => {
    const res = jsonResponse({ error: 'File must be a PNG, JPEG, or WebP image' });
    expect(await extractErrorMessage(res, 'fallback')).toBe('File must be a PNG, JPEG, or WebP image');
  });

  it('extracts the first field error from a Zod-flattened error shape', async () => {
    const res = jsonResponse({
      error: { formErrors: [], fieldErrors: { paymentReference: ['Reference is required'] } },
    });
    expect(await extractErrorMessage(res, 'fallback')).toBe('Reference is required');
  });

  it('falls back when the body has no error field', async () => {
    const res = jsonResponse({ ok: false });
    expect(await extractErrorMessage(res, 'fallback')).toBe('fallback');
  });

  it('falls back when the body is not JSON', async () => {
    const res = new Response('not json', { status: 500 });
    expect(await extractErrorMessage(res, 'fallback')).toBe('fallback');
  });
});
