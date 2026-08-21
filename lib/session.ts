import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'dbc_session';
export const SESSION_MAX_AGE = 60 * 60 * 48; // 48 hours, seconds

export function generateSessionId(): string {
  return randomUUID();
}

export function resolveSessionId(req: NextRequest): { sessionId: string; isNew: boolean } {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) return { sessionId: existing, isNew: false };
  return { sessionId: generateSessionId(), isNew: true };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}
