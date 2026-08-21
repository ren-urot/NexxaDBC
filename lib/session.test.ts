import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { resolveSessionId, SESSION_COOKIE, generateSessionId } from './session';

describe('generateSessionId', () => {
  it('generates a UUID-shaped string', () => {
    expect(generateSessionId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('resolveSessionId', () => {
  it('reuses an existing session cookie', () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      headers: { cookie: `${SESSION_COOKIE}=existing-id` },
    });
    const { sessionId, isNew } = resolveSessionId(req);
    expect(sessionId).toBe('existing-id');
    expect(isNew).toBe(false);
  });

  it('generates a new session id when no cookie is present', () => {
    const req = new NextRequest('http://localhost/api/drafts');
    const { sessionId, isNew } = resolveSessionId(req);
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(isNew).toBe(true);
  });
});
