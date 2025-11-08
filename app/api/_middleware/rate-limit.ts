import { NextRequest } from 'next/server';

interface BucketState {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  capacity: number;
  refillIntervalMs: number;
  refillAmount: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
  tokensRemaining: number;
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, BucketState>();
  private readonly refillRatePerMs: number;

  constructor(private readonly options: RateLimitOptions) {
    this.refillRatePerMs = options.refillAmount / options.refillIntervalMs;
  }

  consume(identifier: string, tokens = 1): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(identifier) ?? {
      tokens: this.options.capacity,
      lastRefill: now,
    };

    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      bucket.tokens = Math.min(
        this.options.capacity,
        bucket.tokens + elapsed * this.refillRatePerMs
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens < tokens) {
      const deficit = tokens - bucket.tokens;
      const msUntilRefill = Math.ceil(deficit / this.refillRatePerMs);
      const retryAfter = Math.max(1, Math.ceil(msUntilRefill / 1000));

      this.buckets.set(identifier, bucket);
      return {
        ok: false,
        retryAfter,
        tokensRemaining: bucket.tokens,
      };
    }

    bucket.tokens -= tokens;
    this.buckets.set(identifier, bucket);

    return {
      ok: true,
      tokensRemaining: bucket.tokens,
    };
  }
}

export const passwordAttemptLimiter = new TokenBucketRateLimiter({
  capacity: 5,
  refillIntervalMs: 60_000,
  refillAmount: 5,
});

export function getRateLimitKey(request: NextRequest, operatorId?: string): string {
  if (operatorId) {
    return `operator:${operatorId}`;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    if (first) {
      return `ip:${first.trim()}`;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp.trim()}`;
  }

  const requestIp = (request as any).ip as string | undefined;
  if (requestIp) {
    return `ip:${requestIp}`;
  }

  return 'ip:unknown';
}
