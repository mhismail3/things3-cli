/**
 * Snapshots Command
 *
 * Manage rollback snapshots.
 */

import { getDatabase } from '../db/connection';
import { SnapshotRepository } from '../db/snapshot-repo';
import type { Snapshot, SnapshotDetails, SnapshotStatus } from '../types/snapshot';

export interface ListSnapshotsOptions {
  status?: SnapshotStatus;
  limit?: number;
  offset?: number;
  json?: boolean;
}

export interface ListSnapshotsResult {
  success: boolean;
  snapshots: Snapshot[];
  error?: string;
}

export interface ShowSnapshotResult {
  success: boolean;
  snapshot?: SnapshotDetails;
  error?: string;
}

export interface DeleteSnapshotResult {
  success: boolean;
  deleted: boolean;
  error?: string;
}

export interface PurgeSnapshotsOptions {
  days: number;
  json?: boolean;
}

export interface PurgeSnapshotsResult {
  success: boolean;
  purgedCount: number;
  error?: string;
}

/**
 * List snapshots
 */
export function listSnapshots(options: ListSnapshotsOptions): ListSnapshotsResult {
  try {
    const db = getDatabase();
    const repo = new SnapshotRepository(db);

    const snapshots = repo.listSnapshots({
      status: options.status,
      limit: options.limit,
      offset: options.offset,
    });

    return {
      success: true,
      snapshots,
    };
  } catch (error) {
    return {
      success: false,
      snapshots: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Show snapshot details
 */
export function showSnapshot(snapshotId: string): ShowSnapshotResult {
  try {
    const db = getDatabase();
    const repo = new SnapshotRepository(db);

    const snapshot = repo.getSnapshotDetails(snapshotId);

    if (!snapshot) {
      return {
        success: false,
        error: `Snapshot not found: ${snapshotId}`,
      };
    }

    return {
      success: true,
      snapshot,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a snapshot
 */
export function deleteSnapshot(snapshotId: string): DeleteSnapshotResult {
  try {
    const db = getDatabase();
    const repo = new SnapshotRepository(db);

    const deleted = repo.deleteSnapshot(snapshotId);

    if (!deleted) {
      return {
        success: false,
        deleted: false,
        error: `Snapshot not found: ${snapshotId}`,
      };
    }

    return {
      success: true,
      deleted: true,
    };
  } catch (error) {
    return {
      success: false,
      deleted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Purge old snapshots
 */
export function purgeSnapshots(options: PurgeSnapshotsOptions): PurgeSnapshotsResult {
  try {
    const db = getDatabase();
    const repo = new SnapshotRepository(db);

    const purgedCount = repo.purgeOldSnapshots(options.days);

    return {
      success: true,
      purgedCount,
    };
  } catch (error) {
    return {
      success: false,
      purgedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
