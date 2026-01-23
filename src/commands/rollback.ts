/**
 * Rollback Command
 *
 * Roll back changes from a snapshot.
 */

import { getDatabase } from '../db/connection';
import { SnapshotRepository } from '../db/snapshot-repo';
import { SnapshotManager, RollbackPlan } from '../services/snapshot-manager';
import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { RollbackResult } from '../types/snapshot';

export interface RollbackOptions {
  dryRun?: boolean;
  json?: boolean;
  force?: boolean;
}

export interface RollbackCommandResult {
  success: boolean;
  snapshotId: string;
  plan?: RollbackPlan;
  result?: RollbackResult;
  error?: string;
  warnings?: string[];
}

/**
 * Roll back changes from a snapshot
 */
export async function rollbackCommand(
  snapshotId: string,
  options: RollbackOptions
): Promise<RollbackCommandResult> {
  const authToken = getAuthToken();

  if (!authToken) {
    return {
      success: false,
      snapshotId,
      error: 'Authentication required. Run "things3 auth setup <token>" first.',
    };
  }

  try {
    const db = getDatabase();
    const repo = new SnapshotRepository(db);
    const manager = new SnapshotManager(repo);

    // Get rollback plan
    const plan = manager.getRollbackPlan(snapshotId);

    if (!plan) {
      const snapshot = repo.getSnapshot(snapshotId);
      if (!snapshot) {
        return {
          success: false,
          snapshotId,
          error: `Snapshot not found: ${snapshotId}`,
        };
      }
      if (snapshot.status !== 'active') {
        return {
          success: false,
          snapshotId,
          error: `Snapshot already rolled back: ${snapshotId}`,
        };
      }
      return {
        success: false,
        snapshotId,
        error: 'Cannot create rollback plan',
      };
    }

    // In dry run mode, just return the plan
    if (options.dryRun) {
      return {
        success: true,
        snapshotId,
        plan,
        warnings: plan.warnings,
      };
    }

    // Execute rollback
    const client = new ThingsClient({ authToken });
    let itemsRolledBack = 0;
    let itemsFailed = 0;
    const errors: string[] = [];

    for (const action of plan.actions) {
      try {
        let result;

        switch (action.action) {
          case 'cancel':
            result = await client.cancelTodo(action.thingsId);
            break;
          case 'restore':
            if (action.data) {
              result = await client.updateTodo({
                id: action.thingsId,
                ...action.data,
              });
            }
            break;
          case 'revert-status':
            // Status reversion is limited - can only "uncomplete"
            // by updating with the previous state
            if (action.data?.previousStatus === 'open') {
              // Can't reliably revert status in Things
              errors.push(`Cannot revert status for ${action.thingsId} - status changes are difficult to reverse`);
              itemsFailed++;
              continue;
            }
            break;
        }

        if (result?.success) {
          itemsRolledBack++;
        } else {
          itemsFailed++;
          errors.push(result?.error ?? `Failed to rollback ${action.thingsId}`);
        }
      } catch (error) {
        itemsFailed++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Update snapshot status
    const status = itemsFailed === 0 ? 'rolled-back' : 'partial-rollback';
    manager.markRolledBack(snapshotId, status);

    return {
      success: itemsFailed === 0,
      snapshotId,
      plan,
      result: {
        success: itemsFailed === 0,
        snapshotId,
        itemsRolledBack,
        itemsFailed,
        errors,
      },
      warnings: plan.warnings,
    };
  } catch (error) {
    return {
      success: false,
      snapshotId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
