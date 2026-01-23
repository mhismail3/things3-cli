/**
 * Database Connection Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupTempDir } from '../setup';
import {
  getDatabase,
  closeDatabase,
  withTransaction,
  resetDatabaseInstance,
} from '../../src/db/connection';

describe('Database Connection', () => {
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

  describe('getDatabase', () => {
    test('creates database file if missing', () => {
      const dbPath = join(tempDir, 'things3.db');
      expect(existsSync(dbPath)).toBe(false);

      getDatabase();

      expect(existsSync(dbPath)).toBe(true);
    });

    test('returns same instance on repeated calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });

    test('creates storage directory if needed', () => {
      const nestedDir = join(tempDir, 'nested', 'dir');
      process.env.THINGS3_STORAGE_DIR = nestedDir;
      resetDatabaseInstance();

      expect(existsSync(nestedDir)).toBe(false);
      getDatabase();
      expect(existsSync(nestedDir)).toBe(true);
    });
  });

  describe('withTransaction', () => {
    test('commits on success', () => {
      const db = getDatabase();

      // Create a test table
      db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, value TEXT)');

      withTransaction(db, () => {
        db.run('INSERT INTO test_table (value) VALUES (?)', ['test-value']);
      });

      const result = db.query('SELECT value FROM test_table').get() as { value: string } | null;
      expect(result?.value).toBe('test-value');
    });

    test('rolls back on error', () => {
      const db = getDatabase();

      db.run('CREATE TABLE IF NOT EXISTS test_table2 (id INTEGER PRIMARY KEY, value TEXT)');

      try {
        withTransaction(db, () => {
          db.run('INSERT INTO test_table2 (value) VALUES (?)', ['should-rollback']);
          throw new Error('Intentional error');
        });
      } catch {
        // Expected
      }

      const result = db.query('SELECT COUNT(*) as count FROM test_table2').get() as { count: number };
      expect(result.count).toBe(0);
    });

    test('returns value from callback', () => {
      const db = getDatabase();
      const result = withTransaction(db, () => {
        return 'returned-value';
      });
      expect(result).toBe('returned-value');
    });
  });

  describe('closeDatabase', () => {
    test('closes the database connection', () => {
      getDatabase();
      closeDatabase();
      // Should not throw and should reset the instance
      const db = getDatabase(); // Should create new instance
      expect(db).toBeDefined();
    });
  });
});
