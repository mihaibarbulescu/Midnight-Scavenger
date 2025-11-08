import crypto from 'crypto';

import { MiningEvent, MiningStats } from '@/lib/mining/types';

type WorkerStatus = 'idle' | 'mining' | 'submitting' | 'completed';

export interface SanitizedAddressInfo {
  alias: string;
  masked: string;
}

export interface SanitizedMiningEvent
  extends Record<string, unknown> {
  type: string;
}

export interface SanitizedWorkerUpdateEvent extends SanitizedMiningEvent {
  type: 'worker_update';
  workerId: number;
  addressAlias: string;
  addressMasked: string;
  hashesComputed: number;
  hashRate: number;
  solutionsFound: number;
  status: WorkerStatus;
  currentChallenge: string | null;
}

export type SanitizedEvent =
  | { type: 'status'; active: boolean; challengeId: string | null }
  | { type: 'stats'; stats: MiningStats }
  | {
      type: 'registration_progress';
      current: number;
      total: number;
      success: boolean;
      message: string;
      addressAlias: string;
      addressMasked: string;
    }
  | {
      type: 'mining_start';
      challengeId: string;
      addressAlias: string;
      addressMasked: string;
    }
  | {
      type: 'hash_progress';
      hashesComputed: number;
      addressAlias: string;
    }
  | {
      type: 'solution_submit';
      challengeId: string;
      message: string;
      addressAlias: string;
    }
  | {
      type: 'solution_result';
      success: boolean;
      message: string;
      addressAlias: string;
    }
  | SanitizedWorkerUpdateEvent
  | { type: 'error'; message: string }
  | { type: 'solution'; timestamp: string; addressAlias: string };

export function maskIdentifier(
  identifier: string,
  visiblePrefix = 6,
  visibleSuffix = 4
): string {
  if (!identifier) {
    return '';
  }

  if (identifier.length <= visiblePrefix + visibleSuffix) {
    return identifier;
  }

  return `${identifier.slice(0, visiblePrefix)}…${identifier.slice(-visibleSuffix)}`;
}

export function buildAlias(identifier: string, prefix = 'id'): string {
  const hash = crypto.createHash('sha256').update(identifier).digest('hex');
  return `${prefix}-${hash.slice(0, 10)}`;
}

export function describeAddress(address: string): SanitizedAddressInfo {
  return {
    alias: buildAlias(address, 'addr'),
    masked: maskIdentifier(address),
  };
}

function sanitizeRegistrationMessage(
  message: string | undefined,
  addressAlias: string
): string {
  if (!message) {
    return `Registering address ${addressAlias}…`;
  }

  if (message.startsWith('Failed to register address')) {
    const [, ...rest] = message.split(':');
    const detail = rest.join(':').trim();
    return detail
      ? `Address ${addressAlias}: ${detail}`
      : `Address ${addressAlias}: registration failed`;
  }

  if (message.includes('registered successfully')) {
    return `Address ${addressAlias} registered successfully`;
  }

  return `Registering address ${addressAlias}…`;
}

export function sanitizeStats(stats: MiningStats): MiningStats {
  return { ...stats };
}

export function sanitizeMiningEvent(event: MiningEvent): SanitizedEvent | null {
  switch (event.type) {
    case 'status':
      return { type: 'status', active: event.active, challengeId: event.challengeId };
    case 'stats':
      return { type: 'stats', stats: sanitizeStats(event.stats) };
    case 'error':
      return { type: 'error', message: event.message };
    case 'solution': {
      const { alias } = describeAddress(event.address);
      return { type: 'solution', timestamp: event.timestamp, addressAlias: alias };
    }
    case 'registration_progress': {
      const { alias, masked } = describeAddress(event.address);
      return {
        type: 'registration_progress',
        current: event.current,
        total: event.total,
        success: event.success,
        message: sanitizeRegistrationMessage(event.message, alias),
        addressAlias: alias,
        addressMasked: masked,
      };
    }
    case 'mining_start': {
      const { alias, masked } = describeAddress(event.address);
      return {
        type: 'mining_start',
        challengeId: event.challengeId,
        addressAlias: alias,
        addressMasked: masked,
      };
    }
    case 'hash_progress': {
      const { alias } = describeAddress(event.address);
      return {
        type: 'hash_progress',
        hashesComputed: event.hashesComputed,
        addressAlias: alias,
      };
    }
    case 'solution_submit': {
      const { alias } = describeAddress(event.address);
      return {
        type: 'solution_submit',
        challengeId: event.challengeId,
        message: 'Solution submitted for verification',
        addressAlias: alias,
      };
    }
    case 'solution_result': {
      const { alias } = describeAddress(event.address);
      return {
        type: 'solution_result',
        success: event.success,
        message: event.message,
        addressAlias: alias,
      };
    }
    case 'worker_update': {
      const { alias, masked } = describeAddress(event.address);
      return {
        type: 'worker_update',
        workerId: event.workerId,
        addressAlias: alias,
        addressMasked: masked,
        hashesComputed: event.hashesComputed,
        hashRate: event.hashRate,
        solutionsFound: event.solutionsFound,
        status: event.status,
        currentChallenge: event.currentChallenge,
      };
    }
    default:
      return null;
  }
}
