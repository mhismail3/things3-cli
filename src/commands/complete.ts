/**
 * Complete Command
 *
 * Mark a to-do as complete in Things 3.
 */

import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { ExecutionResult } from '../core/url-executor';

export interface CompleteOptions {
  dryRun?: boolean;
  json?: boolean;
}

export interface CompleteResult extends ExecutionResult {
  itemId: string;
  snapshotId?: string;
}

/**
 * Mark a to-do as complete
 */
export async function completeCommand(
  itemId: string,
  options: CompleteOptions
): Promise<CompleteResult> {
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

  const result = await client.completeTodo(itemId);

  return {
    ...result,
    itemId,
  };
}
