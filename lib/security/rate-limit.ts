import { NextResponse } from 'next/server';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

type AttemptWindow = {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
};

const attempts = new Map<string, AttemptWindow>();

export function checkRateLimit(identifier: string): NextResponse | null {
  const record = attempts.get(identifier);
  const now = Date.now();

  if (!record) {
    return null;
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    return NextResponse.json(
      {
        error: 'Too many attempts. Please wait before retrying.',
      },
      { status: 429 }
    );
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(identifier);
    return null;
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + COOLDOWN_MS;
    return NextResponse.json(
      {
        error: 'Too many attempts. Please wait before retrying.',
      },
      { status: 429 }
    );
  }

  return null;
}

export function registerFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = attempts.get(identifier);
  if (!record) {
    attempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    return;
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  record.count += 1;
}

export function clearAttempts(identifier: string): void {
  attempts.delete(identifier);
}
