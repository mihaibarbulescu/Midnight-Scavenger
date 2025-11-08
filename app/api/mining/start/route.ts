import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { requireOperatorAuth, unauthorizedResponse } from '@/app/api/_middleware/auth';
import { getRateLimitKey, passwordAttemptLimiter } from '@/app/api/_middleware/rate-limit';
import { isAuthenticationError } from '@/lib/errors/authentication-error';

export async function POST(request: NextRequest) {
  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rateLimitKey = getRateLimitKey(request, auth.operatorId);
  const rateLimitResult = passwordAttemptLimiter.consume(rateLimitKey);
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter ?? 1),
        },
      },
    );
  }

  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Use reinitialize to ensure fresh state when start button is clicked
    console.log(`[API] Start button clicked by ${auth.operatorId} - reinitializing orchestrator...`);
    await miningOrchestrator.reinitialize(password);

    return NextResponse.json({
      success: true,
      message: 'Mining started',
      stats: miningOrchestrator.getStats(),
    });
  } catch (error: any) {
    if (isAuthenticationError(error)) {
      console.warn('[API] Unauthorized mining start attempt');
      return unauthorizedResponse();
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    console.error('[API] Mining start error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start mining' },
      { status: 500 }
    );
  }
}
