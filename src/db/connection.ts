/**
 * Database Connection Management
 *
 * Manages SQLite database connection for snapshot storage.
 */

import Database from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DATABASE_DIR, DATABASE_PATH } from '../config';
import { runMigrations } from './migrations';

let dbInstance: Database | null = null;

/**
 * Get the database file path
 * In test mode (THINGS3_STORAGE_DIR set), uses temp directory
 * Otherwise uses ~/.tron/db/things3.db
 */
function getDatabasePath(): string {
  if (process.env.THINGS3_STORAGE_DIR) {
    // Test mode - use temp directory
    return join(process.env.THINGS3_STORAGE_DIR, 'things3.db');
  }
  return DATABASE_PATH;
}

/**
 * Get the database directory
 */
function getDatabaseDir(): string {
  if (process.env.THINGS3_STORAGE_DIR) {
    return process.env.THINGS3_STORAGE_DIR;
  }
  return DATABASE_DIR;
}

/**
 * Get or create the database instance
 */
export function getDatabase(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dir = getDatabaseDir();

  // Create directory if needed
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create database
  dbInstance = new Database(dbPath);

  // Enable WAL mode for better performance
  dbInstance.run('PRAGMA journal_mode = WAL');

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON');

  // Run migrations
  runMigrations(dbInstance);

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Reset the database instance (for testing)
 */
export function resetDatabaseInstance(): void {
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = null;
}

/**
 * Run a function within a transaction
 * Commits on success, rolls back on error
 */
export function withTransaction<T>(db: Database, fn: () => T): T {
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
