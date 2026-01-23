/**
 * JSON Command
 *
 * Execute bulk operations via JSON.
 */

import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { ExecutionResult } from '../core/url-executor';

export interface JsonOptions {
  dryRun?: boolean;
  reveal?: boolean;
  outputJson?: boolean;
}

export interface JsonResult extends ExecutionResult {
  itemCount: number;
  snapshotId?: string;
}

/**
 * Execute bulk JSON operation
 */
export async function jsonCommand(
  data: string | object[],
  options: JsonOptions
): Promise<JsonResult> {
  const authToken = getAuthToken();

  if (!authToken) {
    return {
      success: false,
      url: '',
      error: 'Authentication required. Run "things3 auth setup <token>" first.',
      itemCount: 0,
    };
  }

  // Parse data if string
  let items: object[];
  try {
    items = typeof data === 'string' ? JSON.parse(data) : data;
    if (!Array.isArray(items)) {
      items = [items];
    }
  } catch {
    return {
      success: false,
      url: '',
      error: 'Invalid JSON data',
      itemCount: 0,
    };
  }

  const client = new ThingsClient({
    dryRun: options.dryRun,
    authToken,
  });

  const result = await client.executeJson(items, options.reveal);

  return {
    ...result,
    itemCount: items.length,
  };
}
