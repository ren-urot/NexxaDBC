import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginRoute = pathname === '/admin/login' || pathname === '/api/admin/login';
  if (isLoginRoute) return NextResponse.next();

  if (!isAdminRequest(req)) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
