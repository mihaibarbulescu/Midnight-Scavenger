import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const AUTH_SCHEME = 'Bearer ';

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  );
}

function getExpectedToken(): Buffer | null {
  const token = process.env.MINING_OPERATOR_TOKEN;
  if (!token) {
    console.error(
      '[Security] MINING_OPERATOR_TOKEN is not configured. All requests will be rejected.'
    );
    return null;
  }
  return Buffer.from(token, 'utf8');
}

export function ensureOperatorAuth(
  request: NextRequest
): NextResponse | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith(AUTH_SCHEME)) {
    return unauthorizedResponse();
  }

  const providedToken = header.slice(AUTH_SCHEME.length).trim();
  if (!providedToken) {
    return unauthorizedResponse();
  }

  const expectedBuffer = getExpectedToken();
  if (!expectedBuffer) {
    return unauthorizedResponse();
  }

  const providedBuffer = Buffer.from(providedToken, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return unauthorizedResponse();
  }

  const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!isValid) {
    return unauthorizedResponse();
  }

  return null;
}
