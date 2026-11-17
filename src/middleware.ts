import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/policy';

/**
 * Filtre rapide : sans cookie de session, retour à la connexion. Ce n'est PAS
 * la vérification de sécurité — chaque page et chaque route la refait en base.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname === '/admin/invitation') return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
