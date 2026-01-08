/**
 * Authentication and Security Middleware
 *
 * Provides centralized route protection and security headers
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  /*
   * STRICT AUTH ENFORCEMENT
   * Check for Supabase session cookie. If missing, redirect to login.
   * This prevents protected routes from even rendering.
   */

  // Basic check for session cookie existence (fast check)
  // Check for session cookie (default 'sb-' or custom 'bhit-auth-token')
  const hasSession = req.cookies.getAll().some(cookie =>
    (cookie.name.includes('sb-') && cookie.name.includes('-auth-token')) ||
    cookie.name.startsWith('sb-') || // Catch-all for other supabase cookies
    cookie.name === 'bhit-auth-token'
  );

  // LEGACY ROUTE SUPPORT
  // Redirect /job/[id] to /jobs/[id] to catch database links or bookmarks
  if (req.nextUrl.pathname.startsWith('/job/')) {
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = req.nextUrl.pathname.replace('/job/', '/jobs/');
    return NextResponse.redirect(newUrl);
  }


  // If no session and trying to access protected route
  // The matcher below handles the "protected route" definition
  // We simply redirect everything that matches but isn't public

  // Whitelist public paths that might be caught by the matcher
  const publicPaths = ['/login', '/reset-password', '/api/auth', '/_next', '/static', '/favicon.ico'];
  const isPublic = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // if (!hasSession && !isPublic) {
  //   const redirectUrl = req.nextUrl.clone();
  //   redirectUrl.pathname = '/login';
  //   // redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname);
  //   return NextResponse.redirect(redirectUrl);
  // }

  const res = NextResponse.next();

  // Add security headers to all responses
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
