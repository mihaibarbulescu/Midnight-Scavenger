import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type VerificationResult = {
  operatorId: string;
};

type AuthSuccess = { ok: true; operatorId: string };
type AuthFailure = { ok: false; response: NextResponse };

const UNAUTHORIZED_BODY = { error: 'Unauthorized' };

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=+$/u, '')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_');
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function buildUnauthorizedResponse(): NextResponse {
  return NextResponse.json(UNAUTHORIZED_BODY, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Bearer',
    },
  });
}

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const [scheme, value] = header.split(' ');
  if (!value) {
    return null;
  }

  if (scheme.toLowerCase() === 'bearer') {
    return value.trim();
  }

  return header.trim();
}

function verifyApiKey(token: string): VerificationResult | null {
  const configuredKeys = (process.env.OPERATOR_API_KEYS || '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  if (configuredKeys.length === 0) {
    return null;
  }

  for (const configuredKey of configuredKeys) {
    if (configuredKey.startsWith('sha256:')) {
      const hash = configuredKey.slice('sha256:'.length);
      const computed = crypto.createHash('sha256').update(token).digest('hex');
      if (timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) {
        return { operatorId: 'api-key' };
      }
      continue;
    }

    if (timingSafeEqual(Buffer.from(token), Buffer.from(configuredKey))) {
      return { operatorId: 'api-key' };
    }
  }

  return null;
}

function verifySignedToken(token: string): VerificationResult | null {
  const secret = process.env.OPERATOR_TOKEN_SECRET;
  if (!secret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = toBase64Url(
    crypto.createHmac('sha256', secret).update(payload).digest()
  );

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const operatorId = typeof decoded.operatorId === 'string' ? decoded.operatorId : 'operator';
    const exp = typeof decoded.exp === 'number' ? decoded.exp : undefined;

    if (exp && Date.now() >= exp) {
      return null;
    }

    return { operatorId };
  } catch (error) {
    console.warn('[Auth] Failed to parse operator token payload:', error);
    return null;
  }
}

function extractToken(request: NextRequest): string | null {
  const authorizationHeader = parseAuthorizationHeader(request.headers.get('authorization'));
  if (authorizationHeader) {
    return authorizationHeader;
  }

  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  return null;
}

export function requireOperatorAuth(request: NextRequest): AuthSuccess | AuthFailure {
  const token = extractToken(request);

  if (!token) {
    return { ok: false, response: buildUnauthorizedResponse() };
  }

  const verification = verifySignedToken(token) || verifyApiKey(token);

  if (!verification) {
    return { ok: false, response: buildUnauthorizedResponse() };
  }

  return { ok: true, operatorId: verification.operatorId };
}

export function unauthorizedResponse(): NextResponse {
  return buildUnauthorizedResponse();
}
