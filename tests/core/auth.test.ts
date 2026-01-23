/**
 * Auth Token Management Tests
 *
 * Tests for auth.json-based token storage
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupTempDir } from '../setup';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  hasAuthToken,
  maskToken,
  requireAuthToken,
  AuthTokenError,
} from '../../src/core/auth';

describe('Auth Token Management', () => {
  let tempDir: string;
  let originalStorageDir: string | undefined;

  beforeEach(() => {
    tempDir = createTempDir();
    // Set env var to use temp directory for tests
    originalStorageDir = process.env.THINGS3_STORAGE_DIR;
    process.env.THINGS3_STORAGE_DIR = tempDir;
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    if (originalStorageDir) {
      process.env.THINGS3_STORAGE_DIR = originalStorageDir;
    } else {
      delete process.env.THINGS3_STORAGE_DIR;
    }
  });

  describe('getAuthToken', () => {
    test('returns null when auth.json does not exist', () => {
      expect(getAuthToken()).toBeNull();
    });

    test('returns null when auth.json exists but has no things3 property', () => {
      const authPath = join(tempDir, 'auth.json');
      writeFileSync(authPath, JSON.stringify({ version: 1, providers: {} }));

      expect(getAuthToken()).toBeNull();
    });

    test('returns token when auth.json has things3.authToken', () => {
      const authPath = join(tempDir, 'auth.json');
      writeFileSync(authPath, JSON.stringify({
        version: 1,
        providers: {},
        things3: { authToken: 'test-token-12345' }
      }));

      expect(getAuthToken()).toBe('test-token-12345');
    });

    test('trims whitespace from token', () => {
      const authPath = join(tempDir, 'auth.json');
      writeFileSync(authPath, JSON.stringify({
        things3: { authToken: '  token-with-spaces  ' }
      }));

      expect(getAuthToken()).toBe('token-with-spaces');
    });
  });

  describe('setAuthToken', () => {
    test('creates directory if missing', () => {
      const storageDir = join(tempDir, 'nested', 'dir');
      process.env.THINGS3_STORAGE_DIR = storageDir;

      setAuthToken('new-token');

      expect(existsSync(storageDir)).toBe(true);
    });

    test('creates auth.json with token', () => {
      setAuthToken('my-auth-token');

      const authPath = join(tempDir, 'auth.json');
      expect(existsSync(authPath)).toBe(true);

      const content = JSON.parse(readFileSync(authPath, 'utf-8'));
      expect(content.things3.authToken).toBe('my-auth-token');
    });

    test('preserves existing auth.json content', () => {
      const authPath = join(tempDir, 'auth.json');
      const existingData = {
        version: 1,
        providers: {
          anthropic: { oauth: { accessToken: 'secret' } }
        }
      };
      writeFileSync(authPath, JSON.stringify(existingData));

      setAuthToken('my-token');

      const content = JSON.parse(readFileSync(authPath, 'utf-8'));
      // Should preserve existing providers
      expect(content.providers.anthropic.oauth.accessToken).toBe('secret');
      // Should add things3 token
      expect(content.things3.authToken).toBe('my-token');
    });

    test('sets restrictive file permissions', () => {
      setAuthToken('secret-token');

      const authPath = join(tempDir, 'auth.json');
      const stats = statSync(authPath);
      const mode = stats.mode & 0o777;

      // Should be readable/writable only by owner (0600)
      expect(mode).toBe(0o600);
    });

    test('overwrites existing token', () => {
      setAuthToken('first-token');
      setAuthToken('second-token');

      expect(getAuthToken()).toBe('second-token');
    });

    test('updates lastUpdated timestamp', () => {
      setAuthToken('token');

      const authPath = join(tempDir, 'auth.json');
      const content = JSON.parse(readFileSync(authPath, 'utf-8'));
      expect(content.lastUpdated).toBeDefined();
    });
  });

  describe('clearAuthToken', () => {
    test('removes token from auth.json', () => {
      setAuthToken('token-to-remove');
      expect(hasAuthToken()).toBe(true);

      clearAuthToken();
      expect(hasAuthToken()).toBe(false);
    });

    test('preserves other auth.json content when clearing', () => {
      const authPath = join(tempDir, 'auth.json');
      writeFileSync(authPath, JSON.stringify({
        version: 1,
        providers: { anthropic: { key: 'secret' } },
        things3: { authToken: 'token' }
      }));

      clearAuthToken();

      const content = JSON.parse(readFileSync(authPath, 'utf-8'));
      // Should preserve providers
      expect(content.providers.anthropic.key).toBe('secret');
      // Should remove things3 or just authToken
      expect(content.things3?.authToken).toBeUndefined();
    });

    test('does not throw when auth.json does not exist', () => {
      expect(() => clearAuthToken()).not.toThrow();
    });
  });

  describe('hasAuthToken', () => {
    test('returns false when token not set', () => {
      expect(hasAuthToken()).toBe(false);
    });

    test('returns true when token exists', () => {
      setAuthToken('test-token');
      expect(hasAuthToken()).toBe(true);
    });

    test('returns false after clearing', () => {
      setAuthToken('test-token');
      clearAuthToken();
      expect(hasAuthToken()).toBe(false);
    });
  });

  describe('maskToken', () => {
    test('masks token for display', () => {
      const masked = maskToken('abcdef123456');
      expect(masked).toBe('abcd********');
    });

    test('handles short tokens', () => {
      const masked = maskToken('abc');
      expect(masked).toBe('***');
    });

    test('handles empty token', () => {
      const masked = maskToken('');
      expect(masked).toBe('');
    });

    test('shows first 4 characters for longer tokens', () => {
      const masked = maskToken('verylongtoken12345');
      expect(masked.startsWith('very')).toBe(true);
      expect(masked).toBe('very**************');
    });
  });

  describe('requireAuthToken', () => {
    test('returns token when it exists', () => {
      setAuthToken('required-token');
      expect(requireAuthToken()).toBe('required-token');
    });

    test('throws AuthTokenError when token missing', () => {
      expect(() => requireAuthToken()).toThrow(AuthTokenError);
    });

    test('error message indicates setup needed', () => {
      try {
        requireAuthToken();
      } catch (e) {
        expect(e).toBeInstanceOf(AuthTokenError);
        expect((e as AuthTokenError).message).toContain('auth');
      }
    });
  });
});
