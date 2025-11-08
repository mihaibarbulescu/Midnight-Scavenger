import { NextRequest, NextResponse } from 'next/server';
import { receiptsLogger } from '@/lib/storage/receipts-logger';
import { requireOperatorAuth } from '@/app/api/_middleware/auth';

interface AddressHistory {
  addressIndex: number;
  address: string;
  challengeId: string;
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  status: 'success' | 'failed' | 'pending';
  lastAttempt: string;
  failures: Array<{
    ts: string;
    nonce: string;
    hash: string;
    error: string;
  }>;
  successTimestamp?: string;
}

export async function GET(request: NextRequest) {
  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const receipts = receiptsLogger.readReceipts();
    const errors = receiptsLogger.readErrors();

    // Sort by timestamp descending (most recent first)
    receipts.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    errors.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    // Group by address index and challenge
    const addressHistoryMap = new Map<string, AddressHistory>();

    // Process errors first
    errors.forEach(error => {
      const key = `${error.addressIndex ?? '?'}:${error.challenge_id}`;

      if (!addressHistoryMap.has(key)) {
        addressHistoryMap.set(key, {
          addressIndex: error.addressIndex ?? -1,
          address: error.address,
          challengeId: error.challenge_id,
          successCount: 0,
          failureCount: 0,
          totalAttempts: 0,
          status: 'pending',
          lastAttempt: error.ts,
          failures: [],
        });
      }

      const history = addressHistoryMap.get(key)!;
      history.failureCount++;
      history.totalAttempts++;
      history.failures.push({
        ts: error.ts,
        nonce: error.nonce,
        hash: error.hash,
        error: error.error,
      });

      // Update last attempt if this is more recent
      if (new Date(error.ts) > new Date(history.lastAttempt)) {
        history.lastAttempt = error.ts;
      }
    });

    // Process successes
    receipts.forEach(receipt => {
      const key = `${receipt.addressIndex ?? '?'}:${receipt.challenge_id}`;

      if (!addressHistoryMap.has(key)) {
        addressHistoryMap.set(key, {
          addressIndex: receipt.addressIndex ?? -1,
          address: receipt.address,
          challengeId: receipt.challenge_id,
          successCount: 0,
          failureCount: 0,
          totalAttempts: 0,
          status: 'pending',
          lastAttempt: receipt.ts,
          failures: [],
        });
      }

      const history = addressHistoryMap.get(key)!;
      history.successCount++;
      history.totalAttempts++;
      history.status = 'success';
      history.successTimestamp = receipt.ts;

      // Update last attempt if this is more recent
      if (new Date(receipt.ts) > new Date(history.lastAttempt)) {
        history.lastAttempt = receipt.ts;
      }
    });

    // Update status for entries with only failures
    addressHistoryMap.forEach(history => {
      if (history.successCount === 0 && history.failureCount > 0) {
        history.status = 'failed';
      }
    });

    // Convert to array and sort by last attempt (most recent first)
    const addressHistory = Array.from(addressHistoryMap.values())
      .sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());

    return NextResponse.json({
      success: true,
      receipts,
      errors,
      addressHistory,
      summary: {
        totalSolutions: receipts.length,
        totalErrors: errors.length,
        successRate: receipts.length + errors.length > 0
          ? ((receipts.length / (receipts.length + errors.length)) * 100).toFixed(2) + '%'
          : '0%'
      }
    });
  } catch (error: any) {
    console.error('[API] Mining history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mining history' },
      { status: 500 }
    );
  }
}
