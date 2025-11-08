import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { ensureOperatorAuth } from '@/lib/security/auth';
import {
  checkRateLimit,
  clearAttempts,
  registerFailedAttempt,
} from '@/lib/security/rate-limit';
import { getRequestFingerprint } from '@/lib/security/request';

export async function POST(request: NextRequest) {
  const authResponse = ensureOperatorAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const { password } = await request.json();

    if (!password) {
      registerFailedAttempt(getRequestFingerprint(request));
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const fingerprint = getRequestFingerprint(request);
    const rateLimitResponse = checkRateLimit(fingerprint);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Use reinitialize to ensure fresh state when start button is clicked
    console.log('[API] Start button clicked - reinitializing orchestrator...');
    await miningOrchestrator.reinitialize(password);

    clearAttempts(fingerprint);

    return NextResponse.json({
      success: true,
      message: 'Mining started',
      stats: miningOrchestrator.getStats(),
    });
  } catch (error: any) {
    console.error('[API] Mining start error:', error);
    const fingerprint = getRequestFingerprint(request);
    registerFailedAttempt(fingerprint);

    const responseMessage =
      'Unable to start mining with the provided credentials or configuration.';

    const lowerMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
    const statusCode = lowerMessage.includes('decrypt') || lowerMessage.includes('incorrect password') ? 403 : 500;

    return NextResponse.json({ error: responseMessage }, { status: statusCode });
  }
}
