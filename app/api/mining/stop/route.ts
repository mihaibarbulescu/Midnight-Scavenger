import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { requireOperatorAuth } from '@/app/api/_middleware/auth';

export async function POST(request: NextRequest) {
  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
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
