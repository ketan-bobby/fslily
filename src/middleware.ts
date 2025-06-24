
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This middleware will be VERY simple for now, primarily to ensure
// it doesn't cause parsing errors.
// Actual auth redirection based on Firebase client-side SDK state
// will handle most UI-level auth flows.
// API routes should be protected by checking Firebase ID tokens within the route handlers themselves
// or by using Firebase App Check.

export function middleware(request: NextRequest) {
  // For now, allow all requests through.
  // Future: Could inspect `request.cookies.get('firebaseIdToken')` or similar
  // if server-side page protection beyond client-side SDK is needed.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except for Next.js internals, static files,
  // specific API routes (like auth if handled differently), and favicon.
  // This is a common pattern to avoid middleware running on unnecessary requests.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth(?:/.*)?).*)',
  ],
};
