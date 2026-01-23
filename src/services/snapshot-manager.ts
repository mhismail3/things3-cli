/**
 * Snapshot Manager Service
 *
 * High-level service for creating and managing snapshots.
 * Handles the business logic for rollback operations.
 */

import { SnapshotRepository, generateSnapshotId } from '../db/snapshot-repo';
import type { Snapshot, SnapshotStatus, ItemType } from '../types/snapshot';

export interface AddSnapshotData {
  title: string;
  itemType: ItemType;
  thingsId: string;
  parentId?: string;
  command: string;
}

export interface UpdateSnapshotData {
  thingsId: string;
  itemType: ItemType;
  previousState: Record<string, unknown>;
  modifiedFields: string[];
  command: string;
}

export interface StatusChangeData {
  thingsId: string;
  itemType: ItemType;
  title: string;
  previousStatus: string;
  newStatus: string;
  command: string;
}

export interface BulkSnapshotData {
  command: string;
  createdItems: Array<{
    thingsId: string;
    itemType: ItemType;
    title: string;
    parentId?: string;
  }>;
  modifiedItems: Array<{
    thingsId: string;
    itemType: ItemType;
    previousState: Record<string, unknown>;
    modifiedFields: string[];
  }>;
  statusChanges: Array<{
    thingsId: string;
    itemType: ItemType;
    previousStatus: string;
    newStatus: string;
  }>;
}

export interface RollbackAction {
  action: 'cancel' | 'restore' | 'revert-status';
  thingsId: string;
  itemType: ItemType;
  data?: Record<string, unknown>;
}

export interface RollbackPlan {
  snapshotId: string;
  operationType: string;
  description: string;
  actions: RollbackAction[];
  warnings: string[];
}

export class SnapshotManager {
  constructor(private repo: SnapshotRepository) {}

  /**
   * Create a snapshot for an add operation
   */
  createAddSnapshot(data: AddSnapshotData): Snapshot {
    const snapshot = this.repo.createSnapshot({
      description: `Added ${data.itemType} "${data.title}"`,
      operationType: 'add',
      command: data.command,
    });

    this.repo.addSnapshotCreated(snapshot.id, {
      thingsId: data.thingsId,
      itemType: data.itemType,
      title: data.title,
      parentId: data.parentId,
    });

    return snapshot;
  }

  /**
   * Create a snapshot for an add-project operation
   */
  createAddProjectSnapshot(data: AddSnapshotData): Snapshot {
    const snapshot = this.repo.createSnapshot({
      description: `Added project "${data.title}"`,
      operationType: 'add-project',
      command: data.command,
    });

    this.repo.addSnapshotCreated(snapshot.id, {
      thingsId: data.thingsId,
      itemType: 'project',
      title: data.title,
      parentId: data.parentId,
    });

    return snapshot;
  }

  /**
   * Create a snapshot for an update operation
   */
  createUpdateSnapshot(data: UpdateSnapshotData): Snapshot {
    const snapshot = this.repo.createSnapshot({
      description: `Updated ${data.itemType} ${data.thingsId}`,
      operationType: 'update',
      command: data.command,
    });

    this.repo.addSnapshotModified(snapshot.id, {
      thingsId: data.thingsId,
      itemType: data.itemType,
      previousState: data.previousState,
      modifiedFields: data.modifiedFields,
    });

    return snapshot;
  }

  /**
   * Create a snapshot for a status change (complete/cancel)
   */
  createStatusChangeSnapshot(data: StatusChangeData): Snapshot {
    const operationType = data.newStatus === 'completed' ? 'complete' : 'cancel';

    const snapshot = this.repo.createSnapshot({
      description: `${operationType === 'complete' ? 'Completed' : 'Canceled'} ${data.itemType} "${data.title}"`,
      operationType,
      command: data.command,
    });

    this.repo.addSnapshotStatus(snapshot.id, {
      thingsId: data.thingsId,
      itemType: data.itemType,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
    });

    return snapshot;
  }

  /**
   * Create a snapshot for a bulk JSON operation
   */
  createBulkSnapshot(data: BulkSnapshotData): Snapshot {
    const itemCount =
      data.createdItems.length + data.modifiedItems.length + data.statusChanges.length;

    const snapshot = this.repo.createSnapshot({
      description: `Bulk operation: ${itemCount} items`,
      operationType: 'json',
      command: data.command,
    });

    for (const item of data.createdItems) {
      this.repo.addSnapshotCreated(snapshot.id, {
        thingsId: item.thingsId,
        itemType: item.itemType,
        title: item.title,
        parentId: item.parentId,
      });
    }

    for (const item of data.modifiedItems) {
      this.repo.addSnapshotModified(snapshot.id, {
        thingsId: item.thingsId,
        itemType: item.itemType,
        previousState: item.previousState,
        modifiedFields: item.modifiedFields,
      });
    }

    for (const item of data.statusChanges) {
      this.repo.addSnapshotStatus(snapshot.id, {
        thingsId: item.thingsId,
        itemType: item.itemType,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
      });
    }

    return snapshot;
  }

  /**
   * Get a rollback plan for a snapshot
   */
  getRollbackPlan(snapshotId: string): RollbackPlan | null {
    const details = this.repo.getSnapshotDetails(snapshotId);
    if (!details) return null;

    // Cannot rollback already rolled back snapshots
    if (details.status !== 'active') return null;

    const actions: RollbackAction[] = [];
    const warnings: string[] = [];

    // Add cancel actions for created items
    for (const item of details.createdItems) {
      actions.push({
        action: 'cancel',
        thingsId: item.thingsId,
        itemType: item.itemType,
      });
    }

    // Add restore actions for modified items
    for (const item of details.modifiedItems) {
      const previousState = JSON.parse(item.previousState);
      actions.push({
        action: 'restore',
        thingsId: item.thingsId,
        itemType: item.itemType,
        data: previousState,
      });
    }

    // Add status revert actions
    for (const item of details.statusChanges) {
      if (item.newStatus === 'canceled') {
        warnings.push(
          `Item ${item.thingsId} was canceled. Cancellation is irreversible in Things.`
        );
      } else {
        actions.push({
          action: 'revert-status',
          thingsId: item.thingsId,
          itemType: item.itemType,
          data: { previousStatus: item.previousStatus },
        });
      }
    }

    return {
      snapshotId: details.id,
      operationType: details.operationType,
      description: details.description,
      actions,
      warnings,
    };
  }

  /**
   * Mark a snapshot as rolled back
   */
  markRolledBack(snapshotId: string, status: 'rolled-back' | 'partial-rollback'): void {
    this.repo.updateSnapshotStatus(snapshotId, status);
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): Snapshot | null {
    return this.repo.getSnapshot(snapshotId);
  }

  /**
   * List snapshots
   */
  listSnapshots(options?: { status?: SnapshotStatus; limit?: number; offset?: number }) {
    return this.repo.listSnapshots(options);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.repo.deleteSnapshot(snapshotId);
  }

  /**
   * Purge old snapshots
   */
  purgeOldSnapshots(days: number): number {
    return this.repo.purgeOldSnapshots(days);
  }
}
