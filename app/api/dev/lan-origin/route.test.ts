import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/dev-lan', () => ({
  getLanIPv4: vi.fn(),
}));

import { getLanIPv4 } from '@/lib/dev-lan';
import { GET } from './route';

afterEach(() => {
  vi.mocked(getLanIPv4).mockReset();
  vi.unstubAllEnvs();
});

describe('GET /api/dev/lan-origin', () => {
  it('returns 404 in production, without calling getLanIPv4', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await GET(new NextRequest('http://localhost:3000/api/dev/lan-origin'));
    expect(res.status).toBe(404);
    expect(getLanIPv4).not.toHaveBeenCalled();
  });

  it('returns the LAN origin with the request port in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getLanIPv4).mockReturnValue('192.168.1.9');
    const res = await GET(new NextRequest('http://localhost:3000/api/dev/lan-origin'));
    const body = await res.json();
    expect(body).toEqual({ origin: 'http://192.168.1.9:3000' });
  });

  it('returns a null origin when no LAN address is found', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getLanIPv4).mockReturnValue(null);
    const res = await GET(new NextRequest('http://localhost:3000/api/dev/lan-origin'));
    const body = await res.json();
    expect(body).toEqual({ origin: null });
  });
});
