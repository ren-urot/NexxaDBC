import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'dbc_admin_session';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return secret;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

export function createAdminSessionToken(): string {
  return createHmac('sha256', getSecret()).update('admin').digest('hex');
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, createAdminSessionToken());
}

export function isAdminRequest(req: NextRequest): boolean {
  return isValidAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
