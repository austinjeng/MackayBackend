import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // For API routes that are not auth-related, perform API key check
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
      const apiKey = req.headers.get('x-api-key') ?? req.headers.get('X-API-Key');
      if (!apiKey) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized: API key is required.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Here you could add logic to validate the API key against the database
      // For now, we just check for its presence.
    }

    // If the request is for a web page and the user is authenticated (which withAuth checks),
    // or if it's a valid API request, allow it.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // API routes are protected by the API key check inside the main middleware function.
        // They do not require a web session token.
        if (pathname.startsWith('/api/')) {
          // Let the main middleware function handle API key logic.
          // We return true here to indicate that `withAuth` should not block the request itself.
          return true;
        }

        // For all other matched routes (i.e., /patients/*), a valid web session token is required.
        return token != null;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  // The matcher protects all patient data pages and the relevant API routes.
  // /api/health and /api/auth are not matched and remain public.
  matcher: ['/', '/patients/:path*', '/api/patients/:path*', '/api/sessions/:path*'],
};
