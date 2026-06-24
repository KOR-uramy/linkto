import { NextResponse } from 'next/server';

function getAllowedOrigins() {
  const origins = new Set([
    'http://localhost:3000',
    'https://linkto.nxnl.app',
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (appUrl) origins.add(appUrl);

  return origins;
}

function withCors(response, origin, allowed) {
  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export function middleware(request) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const allowed = allowedOrigins.has(origin);

  if (request.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }), origin, allowed);
  }

  return withCors(NextResponse.next(), origin, allowed);
}

export const config = {
  matcher: '/api/:path*',
};
