/**
 * Configuration constants for Things 3 CLI
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CLI version
 */
export const CLI_VERSION = '1.0.0';

/**
 * Things 3 URL scheme base
 */
export const THINGS_URL_SCHEME = 'things:///';

/**
 * Storage paths
 */
export const TRON_DIR = join(homedir(), '.tron');
export const AUTH_JSON_PATH = join(TRON_DIR, 'auth.json');
export const DATABASE_DIR = join(TRON_DIR, 'db');
export const DATABASE_PATH = join(DATABASE_DIR, 'things3.db');

// Legacy paths (for migration)
export const LEGACY_STORAGE_DIR = join(TRON_DIR, 'things3');
export const LEGACY_AUTH_TOKEN_PATH = join(LEGACY_STORAGE_DIR, 'auth-token');

/**
 * Binary installation path
 */
export const BINARY_PATH = join(homedir(), '.tron', 'mods', 'things3');

/**
 * Rate limiting
 * Things URL scheme has a limit of 250 calls per 10 seconds
 */
export const RATE_LIMIT_MAX_CALLS = 250;
export const RATE_LIMIT_WINDOW_MS = 10_000;

/**
 * Snapshot retention
 */
export const DEFAULT_SNAPSHOT_RETENTION_DAYS = 30;

/**
 * Things lists
 */
export const THINGS_LISTS = [
  'inbox',
  'today',
  'anytime',
  'upcoming',
  'someday',
  'logbook',
  'trash',
] as const;

/**
 * Valid "when" values
 */
export const THINGS_WHEN_VALUES = [
  'today',
  'tomorrow',
  'evening',
  'anytime',
  'someday',
] as const;
