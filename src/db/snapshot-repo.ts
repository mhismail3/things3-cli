/**
 * Snapshot Repository
 *
 * Data access layer for snapshot storage and retrieval.
 */

import type Database from 'bun:sqlite';
import { TABLES } from './migrations';
import type {
  Snapshot,
  SnapshotDetails,
  SnapshotCreatedItem,
  SnapshotModifiedItem,
  SnapshotStatusChange,
  SnapshotStatus,
  CreateSnapshotInput,
  ItemType,
} from '../types/snapshot';

/**
 * Generate a unique snapshot ID
 */
export function generateSnapshotId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `snap-${timestamp}-${random}`;
}

/**
 * Repository for snapshot operations
 */
export class SnapshotRepository {
  constructor(private db: Database) {}

  /**
   * Create a new snapshot
   */
  createSnapshot(input: CreateSnapshotInput, id?: string): Snapshot {
    const snapshotId = id ?? generateSnapshotId();

    this.db.run(
      `INSERT INTO ${TABLES.SNAPSHOTS} (id, description, operation_type, command)
       VALUES (?, ?, ?, ?)`,
      [snapshotId, input.description, input.operationType, input.command]
    );

    return this.getSnapshot(snapshotId)!;
  }

  /**
   * Add a created item to a snapshot
   */
  addSnapshotCreated(
    snapshotId: string,
    item: {
      thingsId: string;
      itemType: ItemType;
      title: string;
      parentId?: string;
    }
  ): void {
    this.db.run(
      `INSERT INTO ${TABLES.SNAPSHOT_CREATED} (snapshot_id, things_id, item_type, title, parent_id)
       VALUES (?, ?, ?, ?, ?)`,
      [snapshotId, item.thingsId, item.itemType, item.title, item.parentId ?? null]
    );
  }

  /**
   * Add a modified item to a snapshot
   */
  addSnapshotModified(
    snapshotId: string,
    item: {
      thingsId: string;
      itemType: ItemType;
      previousState: Record<string, unknown>;
      modifiedFields: string[];
    }
  ): void {
    this.db.run(
      `INSERT INTO ${TABLES.SNAPSHOT_MODIFIED} (snapshot_id, things_id, item_type, previous_state, modified_fields)
       VALUES (?, ?, ?, ?, ?)`,
      [
        snapshotId,
        item.thingsId,
        item.itemType,
        JSON.stringify(item.previousState),
        JSON.stringify(item.modifiedFields),
      ]
    );
  }

  /**
   * Add a status change to a snapshot
   */
  addSnapshotStatus(
    snapshotId: string,
    item: {
      thingsId: string;
      itemType: ItemType;
      previousStatus: string;
      newStatus: string;
    }
  ): void {
    this.db.run(
      `INSERT INTO ${TABLES.SNAPSHOT_STATUS} (snapshot_id, things_id, item_type, previous_status, new_status)
       VALUES (?, ?, ?, ?, ?)`,
      [snapshotId, item.thingsId, item.itemType, item.previousStatus, item.newStatus]
    );
  }

  /**
   * Get a snapshot by ID
   */
  getSnapshot(id: string): Snapshot | null {
    const row = this.db
      .query(
        `SELECT id, description, operation_type, command, created_at, rolled_back_at, status
         FROM ${TABLES.SNAPSHOTS} WHERE id = ?`
      )
      .get(id) as SnapshotRow | null;

    if (!row) return null;

    return rowToSnapshot(row);
  }

  /**
   * Get snapshot with all related details
   */
  getSnapshotDetails(id: string): SnapshotDetails | null {
    const snapshot = this.getSnapshot(id);
    if (!snapshot) return null;

    const createdItems = this.db
      .query(
        `SELECT id, snapshot_id, things_id, item_type, title, parent_id
         FROM ${TABLES.SNAPSHOT_CREATED} WHERE snapshot_id = ?`
      )
      .all(id) as SnapshotCreatedRow[];

    const modifiedItems = this.db
      .query(
        `SELECT id, snapshot_id, things_id, item_type, previous_state, modified_fields
         FROM ${TABLES.SNAPSHOT_MODIFIED} WHERE snapshot_id = ?`
      )
      .all(id) as SnapshotModifiedRow[];

    const statusChanges = this.db
      .query(
        `SELECT id, snapshot_id, things_id, item_type, previous_status, new_status
         FROM ${TABLES.SNAPSHOT_STATUS} WHERE snapshot_id = ?`
      )
      .all(id) as SnapshotStatusRow[];

    return {
      ...snapshot,
      createdItems: createdItems.map(rowToCreatedItem),
      modifiedItems: modifiedItems.map(rowToModifiedItem),
      statusChanges: statusChanges.map(rowToStatusChange),
    };
  }

  /**
   * List snapshots with optional filtering and pagination
   */
  listSnapshots(options?: {
    status?: SnapshotStatus;
    limit?: number;
    offset?: number;
  }): Snapshot[] {
    const { status, limit = 100, offset = 0 } = options ?? {};

    let query = `SELECT id, description, operation_type, command, created_at, rolled_back_at, status
                 FROM ${TABLES.SNAPSHOTS}`;
    const params: (string | number)[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.query(query).all(...params) as SnapshotRow[];
    return rows.map(rowToSnapshot);
  }

  /**
   * Update snapshot status
   */
  updateSnapshotStatus(id: string, status: SnapshotStatus): void {
    const rolledBackAt = status === 'rolled-back' || status === 'partial-rollback'
      ? new Date().toISOString()
      : null;

    this.db.run(
      `UPDATE ${TABLES.SNAPSHOTS} SET status = ?, rolled_back_at = ? WHERE id = ?`,
      [status, rolledBackAt, id]
    );
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(id: string): boolean {
    const result = this.db.run(`DELETE FROM ${TABLES.SNAPSHOTS} WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  /**
   * Purge snapshots older than specified days
   */
  purgeOldSnapshots(days: number): number {
    const result = this.db.run(
      `DELETE FROM ${TABLES.SNAPSHOTS}
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    );
    return result.changes;
  }
}

// Row types for database queries
interface SnapshotRow {
  id: string;
  description: string;
  operation_type: string;
  command: string;
  created_at: string;
  rolled_back_at: string | null;
  status: string;
}

interface SnapshotCreatedRow {
  id: number;
  snapshot_id: string;
  things_id: string;
  item_type: string;
  title: string;
  parent_id: string | null;
}

interface SnapshotModifiedRow {
  id: number;
  snapshot_id: string;
  things_id: string;
  item_type: string;
  previous_state: string;
  modified_fields: string;
}

interface SnapshotStatusRow {
  id: number;
  snapshot_id: string;
  things_id: string;
  item_type: string;
  previous_status: string;
  new_status: string;
}

// Row to model converters
function rowToSnapshot(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    description: row.description,
    operationType: row.operation_type as Snapshot['operationType'],
    command: row.command,
    createdAt: row.created_at,
    rolledBackAt: row.rolled_back_at ?? undefined,
    status: row.status as SnapshotStatus,
  };
}

function rowToCreatedItem(row: SnapshotCreatedRow): SnapshotCreatedItem {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    thingsId: row.things_id,
    itemType: row.item_type as ItemType,
    title: row.title,
    parentId: row.parent_id ?? undefined,
  };
}

function rowToModifiedItem(row: SnapshotModifiedRow): SnapshotModifiedItem {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    thingsId: row.things_id,
    itemType: row.item_type as ItemType,
    previousState: row.previous_state,
    modifiedFields: row.modified_fields,
  };
}

function rowToStatusChange(row: SnapshotStatusRow): SnapshotStatusChange {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    thingsId: row.things_id,
    itemType: row.item_type as ItemType,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
  };
}
