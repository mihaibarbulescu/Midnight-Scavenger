/**
 * API endpoint to update mining orchestrator configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { ensureOperatorAuth } from '@/lib/security/auth';

export async function POST(req: NextRequest) {
  const authResponse = ensureOperatorAuth(req);
  if (authResponse) {
    return authResponse;
  }

  try {
    const { workerThreads, batchSize } = await req.json();

    // Validate inputs
    if (typeof workerThreads !== 'number' || workerThreads < 1 || workerThreads > 32) {
      return NextResponse.json(
        { success: false, error: 'Invalid workerThreads value (must be between 1 and 32)' },
        { status: 400 }
      );
    }

    if (typeof batchSize !== 'number' || batchSize < 50 || batchSize > 1000) {
      return NextResponse.json(
        { success: false, error: 'Invalid batchSize value (must be between 50 and 1000)' },
        { status: 400 }
      );
    }

    // Update configuration in the orchestrator
    miningOrchestrator.updateConfiguration({
      workerThreads,
      batchSize,
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        workerThreads,
        batchSize,
      },
    });
  } catch (error: any) {
    console.error('[API] Mining update-config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update configuration. Please try again later.',
      },
      { status: 500 }
    );
  }
}
