import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { ensureOperatorAuth } from '@/lib/security/auth';

export async function POST(request: NextRequest) {
  const authResponse = ensureOperatorAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    miningOrchestrator.stop();

    return NextResponse.json({
      success: true,
      message: 'Mining stopped',
    });
  } catch (error: any) {
    console.error('[API] Mining stop error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop mining' },
      { status: 500 }
    );
  }
}
