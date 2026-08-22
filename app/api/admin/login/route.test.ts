import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/admin-auth';

const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD;
const ORIGINAL_SECRET = process.env.ADMIN_SESSION_SECRET;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple';
  process.env.ADMIN_SESSION_SECRET = 'test-secret';
});

afterEach(() => {
  process.env.ADMIN_PASSWORD = ORIGINAL_PASSWORD;
  process.env.ADMIN_SESSION_SECRET = ORIGINAL_SECRET;
});

describe('POST /api/admin/login', () => {
  it('sets a valid admin session cookie on the correct password', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ password: 'correct-horse-battery-staple' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(ADMIN_SESSION_COOKIE);
    expect(cookie).toBeDefined();
    expect(isValidAdminSessionToken(cookie!.value)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.cookies.get(ADMIN_SESSION_COOKIE)).toBeUndefined();
  });

  it('rejects a missing password', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
