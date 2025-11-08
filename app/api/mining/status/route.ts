import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { requireOperatorAuth } from '@/app/api/_middleware/auth';

export async function GET(request: NextRequest) {
  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
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
