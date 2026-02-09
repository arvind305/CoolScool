import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/parent', '/settings', '/profile'];

// Routes that require specific roles
const parentRoutes = ['/parent'];
const childRoutes = ['/dashboard'];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const user = req.auth?.user;
  const pathname = nextUrl.pathname;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (isAuthenticated && user) {
    // Check parent routes
    const isParentRoute = parentRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isParentRoute && user.role !== 'parent' && user.role !== 'admin') {
      // Redirect non-parents to their dashboard
      return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
    }

    // Check child routes (only children and admins can access dashboard)
    const isChildRoute = childRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isChildRoute && user.role === 'parent') {
      // Redirect parents to parent dashboard
      return NextResponse.redirect(new URL('/parent', nextUrl.origin));
    }
  }

  // Handle session errors (token refresh failures)
  if (req.auth?.error === 'RefreshAccessTokenError') {
    // Clear session and redirect to login
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    loginUrl.searchParams.set('error', 'SessionExpired');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/parent/:path*',
    '/settings/:path*',
    '/profile/:path*',
    // Auth routes (for session error handling)
    '/browse/:path*',
    '/practice/:path*',
    '/quiz/:path*',
  ],
};
