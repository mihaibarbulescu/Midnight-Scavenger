import { NextRequest } from 'next/server';

export function getRequestFingerprint(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }

  const address = request.headers.get('x-real-ip');
  if (address) {
    return address;
  }

  return 'unknown';
}
