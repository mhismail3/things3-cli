/**
 * Auth Token Management
 *
 * Manages the Things 3 authorization token required for update operations.
 *
 * Token resolution order:
 * 1. CLI override via --auth-token flag (for using different Things accounts)
 * 2. Default token from ~/.tron/auth.json under the "things3" key
 *
 * IMPORTANT: This file is careful to preserve all existing auth.json content
 * and only modifies the "things3" property.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { AUTH_JSON_PATH, TRON_DIR } from '../config';

/**
 * Session-level auth token override (set via --auth-token CLI flag)
 * Takes precedence over the stored token in auth.json
 */
let sessionAuthToken: string | null = null;

/**
 * Set a session-level auth token override
 * This is used by the CLI when --auth-token is provided
 */
export function setSessionAuthToken(token: string | null): void {
  sessionAuthToken = token?.trim() || null;
}

/**
 * Get the current session auth token override (if any)
 */
export function getSessionAuthToken(): string | null {
  return sessionAuthToken;
}

/**
 * Custom error for auth token issues
 */
export class AuthTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthTokenError';
  }
}

/**
 * Auth.json file structure (partial - only what we care about)
 */
interface AuthJson {
  version?: number;
  providers?: Record<string, unknown>;
  things3?: {
    authToken?: string;
  };
  lastUpdated?: string;
  [key: string]: unknown; // Preserve any other properties
}

/**
 * Get the auth.json file path (allows override via env for testing)
 */
function getAuthJsonPath(): string {
  if (process.env.THINGS3_STORAGE_DIR) {
    // In test mode, use a test-specific auth.json
    return `${process.env.THINGS3_STORAGE_DIR}/auth.json`;
  }
  return AUTH_JSON_PATH;
}

/**
 * Read the entire auth.json file, or return default structure if it doesn't exist
 */
function readAuthJson(): AuthJson {
  const authPath = getAuthJsonPath();

  if (!existsSync(authPath)) {
    return { version: 1 };
  }

  try {
    const content = readFileSync(authPath, 'utf-8');
    return JSON.parse(content) as AuthJson;
  } catch {
    // If file is corrupted, don't overwrite - return empty object
    // This prevents data loss
    return {};
  }
}

/**
 * Write the auth.json file, preserving all existing content
 * Only modifies the things3 property and lastUpdated
 */
function writeAuthJson(authData: AuthJson): void {
  const authPath = getAuthJsonPath();
  const dir = dirname(authPath);

  // Create directory if needed
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Update lastUpdated timestamp
  authData.lastUpdated = new Date().toISOString();

  // Write with pretty formatting to match existing style
  writeFileSync(authPath, JSON.stringify(authData, null, 2), 'utf-8');

  // Set restrictive permissions (owner read/write only)
  chmodSync(authPath, 0o600);
}

/**
 * Get the auth token to use for this session
 *
 * Resolution order:
 * 1. Session override (--auth-token CLI flag) - for different Things accounts
 * 2. Stored token from ~/.tron/auth.json - default account
 *
 * @returns The auth token or null if not configured
 */
export function getAuthToken(): string | null {
  // Check for session override first (CLI --auth-token flag)
  if (sessionAuthToken) {
    return sessionAuthToken;
  }

  // Fall back to stored token in auth.json
  try {
    const authData = readAuthJson();
    const token = authData.things3?.authToken;
    return token?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Store the auth token securely in auth.json
 * Preserves all other auth.json content
 */
export function setAuthToken(token: string): void {
  // Read existing auth data to preserve it
  const authData = readAuthJson();

  // Set or create the things3 property with the auth token
  authData.things3 = {
    ...authData.things3,
    authToken: token.trim(),
  };

  // Write back, preserving all other data
  writeAuthJson(authData);
}

/**
 * Remove the stored auth token from auth.json
 * Preserves all other auth.json content
 */
export function clearAuthToken(): void {
  const authPath = getAuthJsonPath();

  if (!existsSync(authPath)) {
    return;
  }

  // Read existing auth data
  const authData = readAuthJson();

  // Remove the authToken but keep the things3 object if it has other properties
  if (authData.things3) {
    delete authData.things3.authToken;

    // If things3 is now empty, remove it entirely
    if (Object.keys(authData.things3).length === 0) {
      delete authData.things3;
    }
  }

  // Write back, preserving all other data
  writeAuthJson(authData);
}

/**
 * Check if an auth token is configured
 */
export function hasAuthToken(): boolean {
  return getAuthToken() !== null;
}

/**
 * Mask a token for safe display (shows first 4 chars, masks rest)
 */
export function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 4) return '*'.repeat(token.length);
  return token.slice(0, 4) + '*'.repeat(token.length - 4);
}

/**
 * Get the auth token or throw if not configured
 */
export function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new AuthTokenError(
      'No auth token configured. Run "things3 auth setup" to configure your Things 3 auth token.'
    );
  }
  return token;
}

/**
 * Validate token format (basic validation)
 */
export function isValidTokenFormat(token: string): boolean {
  // Things auth tokens are typically alphanumeric strings
  return /^[a-zA-Z0-9_-]{8,}$/.test(token.trim());
}
