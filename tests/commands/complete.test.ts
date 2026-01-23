/**
 * Complete Command Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTempDir, cleanupTempDir } from '../setup';
import { completeCommand, CompleteOptions } from '../../src/commands/complete';
import { setAuthToken } from '../../src/core/auth';

describe('Complete Command', () => {
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

  test('exports completeCommand function', () => {
    expect(typeof completeCommand).toBe('function');
  });

  test('requires auth token', async () => {
    const options: CompleteOptions = {
      dryRun: true,
      json: false,
    };

    const result = await completeCommand('item-123', options);
    expect(result.success).toBe(false);
    expect(result.error).toContain('auth');
  });

  test('marks item as complete with auth', async () => {
    setAuthToken('test-token');

    const result = await completeCommand('item-123', { dryRun: true, json: false });
    expect(result.success).toBe(true);
    expect(result.url).toContain('completed=true');
  });
});
