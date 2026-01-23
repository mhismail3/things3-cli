/**
 * Cancel Command
 *
 * Mark a to-do as canceled in Things 3.
 * WARNING: Cancellation is irreversible!
 */

import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { ExecutionResult } from '../core/url-executor';

export interface CancelOptions {
  dryRun?: boolean;
  json?: boolean;
  force?: boolean;
}

export interface CancelResult extends ExecutionResult {
  itemId: string;
  warning?: string;
  snapshotId?: string;
}

/**
 * Mark a to-do as canceled
 */
export async function cancelCommand(
  itemId: string,
  options: CancelOptions
): Promise<CancelResult> {
  const authToken = getAuthToken();

  if (!authToken) {
    return {
      success: false,
      url: '',
      error: 'Authentication required. Run "things3 auth setup <token>" first.',
      itemId,
    };
  }

  const client = new ThingsClient({
    dryRun: options.dryRun,
    authToken,
  });

  const result = await client.cancelTodo(itemId);

  return {
    ...result,
    itemId,
    warning: 'Cancellation is irreversible in Things 3.',
  };
}
