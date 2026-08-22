import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'dbc_admin_session';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours — matches the cookie's maxAge

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

function sign(expiresAt: number): string {
  return createHmac('sha256', getSecret()).update(String(expiresAt)).digest('hex');
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

// Token format is `${expiresAtEpochMs}.${hmacOfExpiresAt}` — the expiry is
// itself part of what's signed, so it can't be tampered with independently
// of the signature, and a stolen token stops working after ADMIN_SESSION_TTL_MS
// even though nothing revokes it server-side.
export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiresAtStr, signature] = token.split('.');
  if (!expiresAtStr || !signature) return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signature, sign(expiresAt));
}

export function isAdminRequest(req: NextRequest): boolean {
  return isValidAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
