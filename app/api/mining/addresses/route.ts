import { NextRequest, NextResponse } from 'next/server';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { receiptsLogger } from '@/lib/storage/receipts-logger';
import { requireOperatorAuth } from '@/app/api/_middleware/auth';
import { describeAddress } from '@/lib/utils/redact';

export async function GET(request: NextRequest) {
  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const addressData = miningOrchestrator.getAddressesData();

    if (!addressData) {
      return NextResponse.json(
        { error: 'Mining not started or no wallet loaded' },
        { status: 400 }
      );
    }

    // Get all receipts to calculate total solutions per address
    const receipts = receiptsLogger.readReceipts();

    // Count solutions per address (excluding dev fee)
    const solutionsByAddress = new Map<string, number>();
    receipts.forEach(receipt => {
      if (!receipt.isDevFee) {
        const count = solutionsByAddress.get(receipt.address) || 0;
        solutionsByAddress.set(receipt.address, count + 1);
      }
    });

    // Build address list with solved status and solution counts
    const addresses = addressData.addresses.map((addr, idx) => {
      const { alias, masked } = describeAddress(addr.bech32);

      return {
        alias,
        displayLabel: `Address ${idx + 1}`,
        maskedAddress: masked,
        registered: addr.registered || false,
        solvedCurrentChallenge: addressData.currentChallengeId
          ? addressData.solvedAddressChallenges.get(addr.bech32)?.has(addressData.currentChallengeId) || false
          : false,
        totalSolutions: solutionsByAddress.get(addr.bech32) || 0,
      };
    });

    // Calculate summary stats
    const summary = {
      totalAddresses: addresses.length,
      registeredAddresses: addresses.filter(a => a.registered).length,
      solvedCurrentChallenge: addresses.filter(a => a.solvedCurrentChallenge).length,
    };

    return NextResponse.json({
      success: true,
      currentChallenge: addressData.currentChallengeId,
      addresses,
      summary,
    });
  } catch (error: any) {
    console.error('[API] Addresses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch address data' },
      { status: 500 }
    );
  }
}
