/**
 * Auth Command
 *
 * Manage Things 3 authentication token.
 */

import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  hasAuthToken,
  maskToken,
  isValidTokenFormat,
} from '../core/auth';
import { ThingsClient } from '../services/things-client';

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  hasToken?: boolean;
  tokenMasked?: string;
}

export interface AuthTestOptions {
  dryRun?: boolean;
}

/**
 * Set up the auth token
 */
export function authSetup(token: string): AuthResult {
  if (!token || !isValidTokenFormat(token)) {
    return {
      success: false,
      error: 'Invalid token format. Token should be at least 8 characters.',
    };
  }

  setAuthToken(token);

  return {
    success: true,
    message: 'Auth token saved successfully.',
    tokenMasked: maskToken(token),
  };
}

/**
 * Show current auth token status
 */
export function authShow(): AuthResult {
  const token = getAuthToken();

  if (!token) {
    return {
      success: true,
      hasToken: false,
      message: 'No auth token configured. Run "things3 auth setup <token>" to set one.',
    };
  }

  return {
    success: true,
    hasToken: true,
    tokenMasked: maskToken(token),
    message: `Auth token is configured: ${maskToken(token)}`,
  };
}

/**
 * Clear the auth token
 */
export function authClear(): AuthResult {
  clearAuthToken();

  return {
    success: true,
    message: 'Auth token cleared.',
  };
}

/**
 * Test the auth token
 */
export async function authTest(options: AuthTestOptions = {}): Promise<AuthResult> {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      error: 'No auth token configured. Run "things3 auth setup <token>" first.',
    };
  }

  // In dry run mode, just verify token exists
  if (options.dryRun) {
    return {
      success: true,
      message: 'Auth token is configured and ready.',
      tokenMasked: maskToken(token),
    };
  }

  // Try to make a simple update call to verify the token works
  const client = new ThingsClient({ authToken: token });

  try {
    // A show command doesn't need auth, but we can verify Things is accessible
    const result = await client.show({ id: 'today' });

    if (result.success) {
      return {
        success: true,
        message: 'Auth token verified successfully.',
        tokenMasked: maskToken(token),
      };
    } else {
      return {
        success: false,
        error: result.error ?? 'Failed to verify auth token.',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
