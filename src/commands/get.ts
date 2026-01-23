/**
 * Get Command
 *
 * Get a single item by ID with full details from Things 3.
 */

import { queryById } from '../core/applescript';
import type { ThingsItem } from '../types/things';

export interface GetOptions {
  json?: boolean;
}

export interface GetResult {
  success: boolean;
  item: ThingsItem | null;
  error?: string;
}

/**
 * Get a single item by ID
 */
export async function getCommand(itemId: string, options: GetOptions = {}): Promise<GetResult> {
  try {
    const item = await queryById(itemId);

    if (!item) {
      return {
        success: false,
        item: null,
        error: `Item not found: ${itemId}`,
      };
    }

    return {
      success: true,
      item,
    };
  } catch (error) {
    return {
      success: false,
      item: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
