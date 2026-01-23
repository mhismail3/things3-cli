/**
 * Database Migrations Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import Database from 'bun:sqlite';
import { createTestDatabase } from '../setup';
import { runMigrations, TABLES, INDEXES } from '../../src/db/migrations';

describe('Database Migrations', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe('runMigrations', () => {
    test('creates snapshots table', () => {
      runMigrations(db);

      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='snapshots'")
        .get();
      expect(tables).not.toBeNull();
    });

    test('creates snapshot_created table', () => {
      runMigrations(db);

      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='snapshot_created'")
        .get();
      expect(tables).not.toBeNull();
    });

    test('creates snapshot_modified table', () => {
      runMigrations(db);

      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='snapshot_modified'")
        .get();
      expect(tables).not.toBeNull();
    });

    test('creates snapshot_status table', () => {
      runMigrations(db);

      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='snapshot_status'")
        .get();
      expect(tables).not.toBeNull();
    });

    test('creates all required indexes', () => {
      runMigrations(db);

      const indexes = db
        .query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        .all() as { name: string }[];

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_snapshots_status');
      expect(indexNames).toContain('idx_snapshots_created_at');
      expect(indexNames).toContain('idx_snapshot_created_snapshot_id');
      expect(indexNames).toContain('idx_snapshot_modified_snapshot_id');
      expect(indexNames).toContain('idx_snapshot_status_snapshot_id');
    });

    test('is idempotent (safe to run multiple times)', () => {
      runMigrations(db);
      runMigrations(db);
      runMigrations(db);

      // Should not throw and tables should still exist
      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[];

      expect(tables.length).toBeGreaterThan(0);
    });

    test('creates correct snapshots table schema', () => {
      runMigrations(db);

      // Test by inserting valid data
      db.run(`
        INSERT INTO snapshots (id, description, operation_type, command)
        VALUES ('test-id', 'Test description', 'add', 'things3 add')
      `);

      const row = db.query('SELECT * FROM snapshots WHERE id = ?').get('test-id') as Record<string, unknown>;
      expect(row).not.toBeNull();
      expect(row.id).toBe('test-id');
      expect(row.description).toBe('Test description');
      expect(row.operation_type).toBe('add');
      expect(row.status).toBe('active'); // Default value
    });

    test('enforces foreign key constraint on snapshot_created', () => {
      runMigrations(db);

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Should fail without parent snapshot
      expect(() => {
        db.run(`
          INSERT INTO snapshot_created (snapshot_id, things_id, item_type, title)
          VALUES ('nonexistent', 'item-1', 'to-do', 'Test')
        `);
      }).toThrow();
    });

    test('cascade delete works', () => {
      runMigrations(db);
      db.run('PRAGMA foreign_keys = ON');

      // Create snapshot and related records
      db.run(`
        INSERT INTO snapshots (id, description, operation_type, command)
        VALUES ('snap-1', 'Test', 'add', 'cmd')
      `);
      db.run(`
        INSERT INTO snapshot_created (snapshot_id, things_id, item_type, title)
        VALUES ('snap-1', 'item-1', 'to-do', 'Task 1')
      `);

      // Verify related record exists
      let count = db.query('SELECT COUNT(*) as c FROM snapshot_created').get() as { c: number };
      expect(count.c).toBe(1);

      // Delete parent
      db.run('DELETE FROM snapshots WHERE id = ?', ['snap-1']);

      // Related record should be deleted
      count = db.query('SELECT COUNT(*) as c FROM snapshot_created').get() as { c: number };
      expect(count.c).toBe(0);
    });
  });

  describe('Table constants', () => {
    test('TABLES contains all table names', () => {
      expect(TABLES.SNAPSHOTS).toBe('snapshots');
      expect(TABLES.SNAPSHOT_CREATED).toBe('snapshot_created');
      expect(TABLES.SNAPSHOT_MODIFIED).toBe('snapshot_modified');
      expect(TABLES.SNAPSHOT_STATUS).toBe('snapshot_status');
    });

    test('INDEXES contains all index names', () => {
      expect(INDEXES.length).toBeGreaterThan(0);
    });
  });
});
