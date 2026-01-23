/**
 * URL Executor
 *
 * Executes Things URL scheme commands using the `open` command on macOS.
 */

import { getGlobalRateLimiter } from './rate-limiter';

export interface ExecutionResult {
  success: boolean;
  url: string;
  error?: string;
  dryRun?: boolean;
}

export interface ExecutionOptions {
  dryRun?: boolean;
  skipRateLimit?: boolean;
}

/**
 * Execute a Things URL scheme command
 */
export async function executeUrl(
  url: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const { dryRun = false, skipRateLimit = false } = options;

  // Validate URL scheme
  if (!url.startsWith('things:///')) {
    return {
      success: false,
      url,
      error: 'Invalid URL scheme. Must start with "things:///"',
    };
  }

  // Check rate limit
  if (!skipRateLimit) {
    const limiter = getGlobalRateLimiter();
    if (!limiter.canAcquire()) {
      const waitTime = Math.ceil(limiter.getWaitTime() / 1000);
      return {
        success: false,
        url,
        error: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      };
    }
    limiter.acquire();
  }

  // In dry run mode, don't actually execute
  if (dryRun) {
    return {
      success: true,
      url,
      dryRun: true,
    };
  }

  try {
    // Use the open command to execute the URL
    // -g flag keeps Things in the background (doesn't bring to foreground)
    const proc = Bun.spawn(['open', '-g', url], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      return {
        success: false,
        url,
        error: stderr || `Command failed with exit code ${exitCode}`,
      };
    }

    return {
      success: true,
      url,
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Things 3 is installed
 */
export async function isThingsInstalled(): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      ['mdfind', 'kMDItemCFBundleIdentifier == "com.culturedcode.ThingsMac"'],
      { stdout: 'pipe', stderr: 'pipe' }
    );

    const exitCode = await proc.exited;
    if (exitCode !== 0) return false;

    const output = await new Response(proc.stdout).text();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if Things 3 is currently running
 */
export async function isThingsRunning(): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      ['pgrep', '-x', 'Things3'],
      { stdout: 'pipe', stderr: 'pipe' }
    );

    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Open Things 3 if not already running
 */
export async function ensureThingsRunning(): Promise<boolean> {
  if (await isThingsRunning()) {
    return true;
  }

  try {
    const proc = Bun.spawn(['open', '-a', 'Things3'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) return false;

    // Wait a moment for the app to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}
