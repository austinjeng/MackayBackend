import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('X-API-Key');
  if (!apiKey) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: API key is required.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', 'X-Middleware-Version': '3' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
