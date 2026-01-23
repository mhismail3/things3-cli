/**
 * Database Migrations
 *
 * Creates and updates the snapshot database schema.
 */

import type Database from 'bun:sqlite';

/**
 * Table names
 */
export const TABLES = {
  SNAPSHOTS: 'snapshots',
  SNAPSHOT_CREATED: 'snapshot_created',
  SNAPSHOT_MODIFIED: 'snapshot_modified',
  SNAPSHOT_STATUS: 'snapshot_status',
} as const;

/**
 * Index names
 */
export const INDEXES = [
  'idx_snapshots_status',
  'idx_snapshots_created_at',
  'idx_snapshot_created_snapshot_id',
  'idx_snapshot_modified_snapshot_id',
  'idx_snapshot_status_snapshot_id',
] as const;

/**
 * Run all migrations
 */
export function runMigrations(db: Database): void {
  createSnapshotsTable(db);
  createSnapshotCreatedTable(db);
  createSnapshotModifiedTable(db);
  createSnapshotStatusTable(db);
  createIndexes(db);
}

/**
 * Create the snapshots table
 */
function createSnapshotsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SNAPSHOTS} (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      command TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      rolled_back_at TEXT,
      status TEXT DEFAULT 'active'
    )
  `);
}

/**
 * Create the snapshot_created table
 * Tracks items created by operations (for rollback via cancel)
 */
function createSnapshotCreatedTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SNAPSHOT_CREATED} (
      id INTEGER PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES ${TABLES.SNAPSHOTS}(id) ON DELETE CASCADE,
      things_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      parent_id TEXT
    )
  `);
}

/**
 * Create the snapshot_modified table
 * Tracks items modified by operations (stores previous state for rollback)
 */
function createSnapshotModifiedTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SNAPSHOT_MODIFIED} (
      id INTEGER PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES ${TABLES.SNAPSHOTS}(id) ON DELETE CASCADE,
      things_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      previous_state TEXT NOT NULL,
      modified_fields TEXT NOT NULL
    )
  `);
}

/**
 * Create the snapshot_status table
 * Tracks status changes (completed/canceled) for rollback
 */
function createSnapshotStatusTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SNAPSHOT_STATUS} (
      id INTEGER PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES ${TABLES.SNAPSHOTS}(id) ON DELETE CASCADE,
      things_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL
    )
  `);
}

/**
 * Create indexes for efficient querying
 */
function createIndexes(db: Database): void {
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_status
    ON ${TABLES.SNAPSHOTS}(status)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_created_at
    ON ${TABLES.SNAPSHOTS}(created_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snapshot_created_snapshot_id
    ON ${TABLES.SNAPSHOT_CREATED}(snapshot_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snapshot_modified_snapshot_id
    ON ${TABLES.SNAPSHOT_MODIFIED}(snapshot_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snapshot_status_snapshot_id
    ON ${TABLES.SNAPSHOT_STATUS}(snapshot_id)
  `);
}
