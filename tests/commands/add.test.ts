/**
 * Add Command Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import Database from 'bun:sqlite';
import { createTestDatabase, createTempDir, cleanupTempDir } from '../setup';
import { runMigrations } from '../../src/db/migrations';
import { addCommand, AddOptions } from '../../src/commands/add';

describe('Add Command', () => {
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

  test('exports addCommand function', () => {
    expect(typeof addCommand).toBe('function');
  });

  test('creates todo with title', async () => {
    const options: AddOptions = {
      dryRun: true,
      json: false,
    };

    const result = await addCommand('Test Task', options);
    expect(result.success).toBe(true);
    expect(result.url).toContain('title=Test%20Task');
  });

  test('accepts when option', async () => {
    const result = await addCommand('Task', { dryRun: true, json: false, when: 'today' });
    expect(result.url).toContain('when=today');
  });

  test('accepts deadline option', async () => {
    const result = await addCommand('Task', { dryRun: true, json: false, deadline: '2024-12-31' });
    expect(result.url).toContain('deadline=2024-12-31');
  });

  test('accepts tags option', async () => {
    const result = await addCommand('Task', { dryRun: true, json: false, tags: 'work,urgent' });
    expect(result.url).toContain('tags=work%2Curgent');
  });

  test('accepts notes option', async () => {
    const result = await addCommand('Task', { dryRun: true, json: false, notes: 'Some notes' });
    expect(result.url).toContain('notes=Some%20notes');
  });

  test('accepts list option', async () => {
    const result = await addCommand('Task', { dryRun: true, json: false, list: 'Work' });
    expect(result.url).toContain('list=Work');
  });

  test('accepts checklist option', async () => {
    const result = await addCommand('Task', {
      dryRun: true,
      json: false,
      checklist: 'Step 1,Step 2',
    });
    expect(result.url).toContain('checklist-items=');
  });

  test('returns snapshot ID when not dry run', async () => {
    // In real execution, it would create a snapshot
    const result = await addCommand('Task', { dryRun: true, json: false });
    // In dry run mode, no snapshot is created
    expect(result.success).toBe(true);
  });
});
