/**
 * Version Command
 *
 * Show CLI and Things 3 version information.
 */

import { CLI_VERSION } from '../config';
import { getThingsVersion } from '../core/applescript';
import { isThingsRunning } from '../core/url-executor';

export interface VersionOptions {
  json?: boolean;
}

export interface VersionResult {
  cliVersion: string;
  thingsVersion?: string;
  thingsRunning: boolean;
}

/**
 * Get version information
 */
export async function versionCommand(options: VersionOptions): Promise<VersionResult> {
  const [thingsVersion, thingsRunning] = await Promise.all([
    getThingsVersion().catch(() => undefined),
    isThingsRunning().catch(() => false),
  ]);

  return {
    cliVersion: CLI_VERSION,
    thingsVersion: thingsVersion ?? undefined,
    thingsRunning,
  };
}
