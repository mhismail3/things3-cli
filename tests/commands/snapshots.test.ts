/**
 * Snapshots Command Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTempDir, cleanupTempDir } from '../setup';
import {
  listSnapshots,
  showSnapshot,
  deleteSnapshot,
  purgeSnapshots,
} from '../../src/commands/snapshots';
import { getDatabase, closeDatabase, resetDatabaseInstance } from '../../src/db/connection';
import { SnapshotRepository } from '../../src/db/snapshot-repo';

describe('Snapshots Command', () => {
  let tempDir: string;
  let originalStorageDir: string | undefined;

  beforeEach(() => {
    tempDir = createTempDir();
    originalStorageDir = process.env.THINGS3_STORAGE_DIR;
    process.env.THINGS3_STORAGE_DIR = tempDir;
    resetDatabaseInstance();
  });

  afterEach(() => {
    closeDatabase();
    cleanupTempDir(tempDir);
    if (originalStorageDir) {
      process.env.THINGS3_STORAGE_DIR = originalStorageDir;
    } else {
      delete process.env.THINGS3_STORAGE_DIR;
    }
  });

  describe('listSnapshots', () => {
    test('returns empty list when no snapshots', () => {
      const result = listSnapshots({});
      expect(result.success).toBe(true);
      expect(result.snapshots).toEqual([]);
    });

    test('returns snapshots when exist', () => {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);
      repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      const result = listSnapshots({});
      expect(result.snapshots.length).toBe(1);
    });

    test('respects limit option', () => {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);

      for (let i = 0; i < 5; i++) {
        repo.createSnapshot({
          description: `Test ${i}`,
          operationType: 'add',
          command: 'cmd',
        });
      }

      const result = listSnapshots({ limit: 2 });
      expect(result.snapshots.length).toBe(2);
    });
  });

  describe('showSnapshot', () => {
    test('returns null for non-existent snapshot', () => {
      const result = showSnapshot('nonexistent');
      expect(result.success).toBe(false);
    });

    test('returns snapshot details when exists', () => {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      const result = showSnapshot(snapshot.id);
      expect(result.success).toBe(true);
      expect(result.snapshot?.id).toBe(snapshot.id);
    });
  });

  describe('deleteSnapshot', () => {
    test('returns false for non-existent snapshot', () => {
      const result = deleteSnapshot('nonexistent');
      expect(result.success).toBe(false);
    });

    test('deletes existing snapshot', () => {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      const result = deleteSnapshot(snapshot.id);
      expect(result.success).toBe(true);
      expect(repo.getSnapshot(snapshot.id)).toBeNull();
    });
  });

  describe('purgeSnapshots', () => {
    test('returns count of purged snapshots', () => {
      const result = purgeSnapshots({ days: 30 });
      expect(result.success).toBe(true);
      expect(typeof result.purgedCount).toBe('number');
    });
  });
});
