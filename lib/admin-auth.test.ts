import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import {
  verifyAdminPassword,
  createAdminSessionToken,
  isValidAdminSessionToken,
  isAdminRequest,
  ADMIN_SESSION_COOKIE,
} from './admin-auth';

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

describe('verifyAdminPassword', () => {
  it('accepts the configured password', () => {
    expect(verifyAdminPassword('correct-horse-battery-staple')).toBe(true);
  });

  it('rejects an incorrect password', () => {
    expect(verifyAdminPassword('wrong')).toBe(false);
  });

  it('rejects when ADMIN_PASSWORD is unset', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(verifyAdminPassword('anything')).toBe(false);
  });
});

describe('createAdminSessionToken / isValidAdminSessionToken', () => {
  it('a freshly created token is valid', () => {
    expect(isValidAdminSessionToken(createAdminSessionToken())).toBe(true);
  });

  it('an arbitrary string is not valid', () => {
    expect(isValidAdminSessionToken('not-a-real-token')).toBe(false);
  });

  it('undefined is not valid', () => {
    expect(isValidAdminSessionToken(undefined)).toBe(false);
  });

  it('rejects an expired token even with a valid signature', () => {
    const expiresAt = Date.now() - 1000;
    const signature = createHmac('sha256', 'test-secret').update(String(expiresAt)).digest('hex');
    expect(isValidAdminSessionToken(`${expiresAt}.${signature}`)).toBe(false);
  });

  it('rejects a token whose expiry was tampered with', () => {
    const token = createAdminSessionToken();
    const [, signature] = token.split('.');
    const tamperedExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 365;
    expect(isValidAdminSessionToken(`${tamperedExpiresAt}.${signature}`)).toBe(false);
  });
});

describe('isAdminRequest', () => {
  it('is true when the request carries a valid session cookie', () => {
    const token = createAdminSessionToken();
    const req = new NextRequest('http://localhost', { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } });
    expect(isAdminRequest(req)).toBe(true);
  });

  it('is false with no cookie', () => {
    const req = new NextRequest('http://localhost');
    expect(isAdminRequest(req)).toBe(false);
  });
});
