import { NextRequest, NextResponse } from 'next/server';
import * as os from 'os';
import { miningOrchestrator } from '@/lib/mining/orchestrator';
import { requireOperatorAuth } from '@/app/api/_middleware/auth';

/**
 * System Specs API - Returns hardware specifications for scaling recommendations
 */
export async function GET(request: NextRequest) {
  // Allow operators to disable specs in production by default while keeping an override for trusted environments.
  const disableFlag = process.env.DISABLE_SYSTEM_SPECS_ENDPOINT === 'true';
  const enableFlag = process.env.ENABLE_SYSTEM_SPECS_ENDPOINT === 'true';
  const disableEndpoint = disableFlag || (process.env.NODE_ENV === 'production' && !enableFlag);

  if (disableEndpoint) {
    return NextResponse.json(
      {
        success: false,
        error: 'System specifications endpoint is disabled for this deployment.',
        specs: null,
        recommendations: null,
      },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const auth = requireOperatorAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const platform = os.platform();
    const arch = os.arch();
    const loadAvg = os.loadavg();

    // Get CPU info
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCount = cpus.length;
    const cpuSpeed = cpus[0]?.speed || 0;

    // Calculate memory in GB (numbers rounded to 2 decimals)
    const totalMemoryGB = Number((totalMemory / 1024 ** 3).toFixed(2));
    const freeMemoryGB = Number((freeMemory / 1024 ** 3).toFixed(2));
    const usedMemoryGB = Number(((totalMemory - freeMemory) / 1024 ** 3).toFixed(2));
    const memoryUsagePercent = Number((((totalMemory - freeMemory) / totalMemory) * 100).toFixed(1));

    // Get current configuration from orchestrator
    const currentConfig = miningOrchestrator.getCurrentConfiguration();

    // Calculate recommendations
    const recommendations = calculateRecommendations({
      cpuCount,
      cpuSpeed,
      totalMemoryGB,
      platform,
      currentWorkerThreads: currentConfig.workerThreads,
      currentBatchSize: currentConfig.batchSize,
    });

    const specs = {
      cpuModel,
      cpuCores: cpuCount,
      cpuLoad1m: Number(loadAvg[0].toFixed(2)),
      totalMemoryGB,
      freeMemoryGB,
      usedMemoryGB,
      memoryUsagePercent,
      platform,
      arch,
    };

    return NextResponse.json(
      {
        success: true,
        specs,
        recommendations,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      },
    );
  } catch (error: any) {
    console.error('[System Specs API] Failed to get system specs:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system specifications',
        specs: null,
        recommendations: null,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}

/**
 * Calculate optimal BATCH_SIZE and workerThreads based on system specs
 */
function calculateRecommendations(specs: {
  cpuCount: number;
  cpuSpeed: number;
  totalMemoryGB: number;
  platform: string;
  currentWorkerThreads: number;
  currentBatchSize: number;
}) {
  const { cpuCount, cpuSpeed, totalMemoryGB, currentWorkerThreads, currentBatchSize } = specs;

  // Worker threads recommendation
  // Rule: Use 80% of CPU cores to leave headroom for OS and other processes
  // Absolute maximum: 20 threads (diminishing returns beyond this for most mining workloads)
  const ABSOLUTE_MAX_WORKERS = 20;

  // Calculate max workers based on CPU count (can go higher than optimal for high-end systems)
  let maxWorkers: number;
  if (cpuCount >= 24) {
    maxWorkers = Math.min(ABSOLUTE_MAX_WORKERS, Math.floor(cpuCount * 0.85)); // 85% for very high-end
  } else if (cpuCount >= 16) {
    maxWorkers = Math.min(ABSOLUTE_MAX_WORKERS, Math.floor(cpuCount * 0.8)); // 80% for high-end
  } else if (cpuCount >= 8) {
    maxWorkers = Math.floor(cpuCount * 0.75); // 75% for mid-range
  } else {
    maxWorkers = Math.max(4, cpuCount - 1); // Leave 1 core free for low-end
  }

  // Optimal workers (recommended for best balance of performance and stability)
  let optimalWorkers: number;
  if (cpuCount >= 24) {
    optimalWorkers = Math.floor(cpuCount * 0.67); // ~67% for very high-end (16 workers for 24 cores)
  } else if (cpuCount >= 16) {
    optimalWorkers = Math.floor(cpuCount * 0.7); // 70% for high-end (11 workers for 16 cores)
  } else if (cpuCount >= 8) {
    optimalWorkers = Math.floor(cpuCount * 0.65); // 65% for mid-range (5-6 workers for 8 cores)
  } else if (cpuCount >= 4) {
    optimalWorkers = Math.max(2, cpuCount - 2); // Leave 2 cores free for low-end
  } else {
    optimalWorkers = Math.max(1, Math.floor(cpuCount * 0.5)); // 50% for very low-end
  }

  // Conservative workers (for systems with other workloads running)
  const conservativeWorkers = Math.max(2, Math.floor(cpuCount * 0.5));

  // Ensure optimal is never higher than max
  optimalWorkers = Math.min(optimalWorkers, maxWorkers);

  // Ensure conservative is never higher than optimal
  const finalConservativeWorkers = Math.min(conservativeWorkers, optimalWorkers);

  // Batch size recommendation
  // Rule: Larger batches = fewer API calls but more memory usage
  // Base on CPU speed and memory
  let optimalBatchSize = 300; // Default
  let maxBatchSize = 500;
  let conservativeBatchSize = 200;

  // Adjust based on CPU cores and speed
  if (cpuCount >= 12 && cpuSpeed >= 2500 && totalMemoryGB >= 16) {
    // High-end system
    optimalBatchSize = 400;
    maxBatchSize = 600;
    conservativeBatchSize = 300;
  } else if (cpuCount >= 8 && cpuSpeed >= 2000 && totalMemoryGB >= 8) {
    // Mid-range system
    optimalBatchSize = 350;
    maxBatchSize = 500;
    conservativeBatchSize = 250;
  } else if (cpuCount >= 4 && totalMemoryGB >= 4) {
    // Entry-level system
    optimalBatchSize = 250;
    maxBatchSize = 350;
    conservativeBatchSize = 150;
  } else {
    // Low-end system
    optimalBatchSize = 150;
    maxBatchSize = 250;
    conservativeBatchSize = 100;
  }

  // System tier classification
  let systemTier: 'low-end' | 'entry-level' | 'mid-range' | 'high-end';
  if (cpuCount >= 12 && totalMemoryGB >= 16) {
    systemTier = 'high-end';
  } else if (cpuCount >= 8 && totalMemoryGB >= 8) {
    systemTier = 'mid-range';
  } else if (cpuCount >= 4 && totalMemoryGB >= 4) {
    systemTier = 'entry-level';
  } else {
    systemTier = 'low-end';
  }

  return {
    systemTier,
    workerThreads: {
      current: currentWorkerThreads,
      optimal: optimalWorkers,
      conservative: finalConservativeWorkers,
      max: maxWorkers,
      explanation: `Based on ${cpuCount} CPU cores. Optimal uses ~${Math.round((optimalWorkers / cpuCount) * 100)}% of cores, leaving headroom for OS tasks.`,
    },
    batchSize: {
      current: currentBatchSize,
      optimal: optimalBatchSize,
      conservative: conservativeBatchSize,
      max: maxBatchSize,
      explanation: `Larger batches reduce API calls but increase memory usage. Optimal based on ${cpuCount} cores, ${cpuSpeed}MHz CPU, and ${totalMemoryGB}GB RAM.`,
    },
    warnings: generateWarnings(specs, optimalWorkers, optimalBatchSize),
    performanceNotes: [
      'Worker threads should not exceed CPU core count to avoid context switching overhead',
      'Batch size affects hash computation time and memory usage',
      'Monitor CPU usage and hash rate to fine-tune these values',
      'If you see 408 timeouts, reduce batch size',
      'If CPU usage is low, increase worker threads',
    ],
  };
}

/**
 * Generate warnings based on system specs
 */
function generateWarnings(
  specs: { cpuCount: number; cpuSpeed: number; totalMemoryGB: number; platform: string },
  optimalWorkers: number,
  optimalBatchSize: number
): string[] {
  const warnings: string[] = [];

  if (specs.totalMemoryGB < 4) {
    warnings.push('⚠️ Low memory detected. Consider reducing batch size to avoid out-of-memory errors.');
  }

  if (specs.cpuCount < 4) {
    warnings.push('⚠️ Limited CPU cores. Mining performance may be limited. Consider using conservative settings.');
  }

  if (specs.cpuSpeed < 2000) {
    warnings.push('⚠️ Low CPU clock speed. May experience slower hash rates. Consider reducing batch size.');
  }

  if (specs.totalMemoryGB >= 32 && specs.cpuCount >= 16) {
    warnings.push('✅ High-performance system detected. You can push settings higher for maximum throughput.');
  }

  if (optimalWorkers > 12) {
    warnings.push('💡 System has many cores. Consider testing with max worker threads for optimal performance.');
  }

  return warnings;
}
