/**
 * Pulls a human-readable message out of an API error response, so a form
 * can show the customer the actual reason a request failed (e.g. "File must
 * be a PNG, JPEG, or WebP image") instead of a generic "please try again"
 * that leaves them guessing. Falls back to `fallback` when the body isn't
 * JSON, or the error shape isn't one this recognizes.
 */
export async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return fallback;
  }
  const error = (body as { error?: unknown } | null)?.error;
  if (typeof error === 'string' && error.trim()) return error;

  // Zod's `.flatten()` shape: { formErrors: string[], fieldErrors: Record<string, string[]> }.
  const fieldErrors = (error as { fieldErrors?: Record<string, unknown> } | null)?.fieldErrors;
  if (fieldErrors) {
    for (const value of Object.values(fieldErrors)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
  }
  return fallback;
}
