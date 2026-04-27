import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://jotek.ng';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public files must bypass auth. If /jotek-logo.jpeg is redirected to login,
  // next/image receives HTML instead of JPEG bytes and the logo breaks.
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // The (auth) route group exposes these pages at the URL root, e.g. /login.
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  if (!sessionCookie) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL(STOREFRONT_URL));
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
