import { NextRequest, NextResponse } from 'next/server';
import { getLanIPv4 } from '@/lib/dev-lan';

/**
 * Dev-only helper for LocalhostWarning: returns the LAN address this dev
 * server is reachable at, so a page viewed at `localhost` can offer a
 * one-click link to the address a phone on the same WiFi can actually
 * reach. Never responds outside development — there's no "wrong host"
 * concept once the app is on a real deployed domain.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ origin: null }, { status: 404 });
  }
  const ip = getLanIPv4();
  if (!ip) return NextResponse.json({ origin: null });

  const port = req.nextUrl.port || '3000';
  return NextResponse.json({ origin: `http://${ip}:${port}` });
}
