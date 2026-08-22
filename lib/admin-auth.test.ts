import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
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
