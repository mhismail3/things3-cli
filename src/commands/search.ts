/**
 * Search Command
 *
 * Open Things search with a query.
 */

import { ThingsClient } from '../services/things-client';
import type { ExecutionResult } from '../core/url-executor';

export interface SearchOptions {
  dryRun?: boolean;
  json?: boolean;
}

export interface SearchResult extends ExecutionResult {
  query: string;
}

/**
 * Open Things search with a query
 */
export async function searchCommand(
  query: string,
  options: SearchOptions
): Promise<SearchResult> {
  const client = new ThingsClient({ dryRun: options.dryRun });

  const result = await client.search(query);

  return {
    ...result,
    query,
  };
}
