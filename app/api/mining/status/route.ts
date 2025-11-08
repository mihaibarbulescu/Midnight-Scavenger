import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { ensureOperatorAuth } from '@/lib/security/auth';

export async function GET(request: NextRequest) {
  const authResponse = ensureOperatorAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const stats = miningOrchestrator.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[API] Mining status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get mining status' },
      { status: 500 }
    );
  }
}
