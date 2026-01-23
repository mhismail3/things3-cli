/**
 * Show Command
 *
 * Navigate to a list or item in Things 3.
 */

import { ThingsClient } from '../services/things-client';
import type { ExecutionResult } from '../core/url-executor';

export interface ShowOptions {
  dryRun?: boolean;
  json?: boolean;
  filter?: string;
}

export interface ShowResult extends ExecutionResult {
  target: string;
}

/**
 * Show a list or item in Things
 */
export async function showCommand(
  target: string,
  options: ShowOptions
): Promise<ShowResult> {
  const client = new ThingsClient({ dryRun: options.dryRun });

  const result = await client.show({
    id: target,
    filter: options.filter,
  });

  return {
    ...result,
    target,
  };
}
