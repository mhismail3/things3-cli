/**
 * Auth Command Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTempDir, cleanupTempDir } from '../setup';
import {
  authSetup,
  authShow,
  authClear,
  authTest,
  AuthResult,
} from '../../src/commands/auth';
import { getAuthToken, setAuthToken, clearAuthToken } from '../../src/core/auth';

describe('Auth Command', () => {
  let tempDir: string;
  let originalStorageDir: string | undefined;

  beforeEach(() => {
    tempDir = createTempDir();
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

  describe('authSetup', () => {
    test('stores provided token', () => {
      const result = authSetup('test-token-12345');
      expect(result.success).toBe(true);
      expect(getAuthToken()).toBe('test-token-12345');
    });

    test('validates token format', () => {
      const result = authSetup('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('authShow', () => {
    test('shows token when set', () => {
      setAuthToken('my-secret-token');
      const result = authShow();

      expect(result.success).toBe(true);
      expect(result.tokenMasked).toContain('****');
      expect(result.hasToken).toBe(true);
    });

    test('indicates when no token set', () => {
      const result = authShow();
      expect(result.success).toBe(true);
      expect(result.hasToken).toBe(false);
    });
  });

  describe('authClear', () => {
    test('clears existing token', () => {
      setAuthToken('token-to-clear');
      expect(getAuthToken()).not.toBeNull();

      const result = authClear();
      expect(result.success).toBe(true);
      expect(getAuthToken()).toBeNull();
    });

    test('succeeds even when no token', () => {
      const result = authClear();
      expect(result.success).toBe(true);
    });
  });

  describe('authTest', () => {
    test('fails when no token set', async () => {
      const result = await authTest({ dryRun: true });
      expect(result.success).toBe(false);
    });

    test('succeeds in dry run with token', async () => {
      setAuthToken('test-token-valid');
      const result = await authTest({ dryRun: true });
      expect(result.success).toBe(true);
    });
  });
});
