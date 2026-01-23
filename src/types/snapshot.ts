/**
 * Snapshot types for rollback support
 */

export type OperationType = 'add' | 'add-project' | 'update' | 'update-project' | 'complete' | 'cancel' | 'json';

export type SnapshotStatus = 'active' | 'rolled-back' | 'partial-rollback' | 'expired';

export type ItemType = 'to-do' | 'project';

export interface Snapshot {
  id: string;
  description: string;
  operationType: OperationType;
  command: string;
  createdAt: string;
  rolledBackAt?: string;
  status: SnapshotStatus;
}

export interface SnapshotCreatedItem {
  id: number;
  snapshotId: string;
  thingsId: string;
  itemType: ItemType;
  title: string;
  parentId?: string;
}

export interface SnapshotModifiedItem {
  id: number;
  snapshotId: string;
  thingsId: string;
  itemType: ItemType;
  previousState: string;
  modifiedFields: string;
}

export interface SnapshotStatusChange {
  id: number;
  snapshotId: string;
  thingsId: string;
  itemType: ItemType;
  previousStatus: string;
  newStatus: string;
}

export interface SnapshotDetails extends Snapshot {
  createdItems: SnapshotCreatedItem[];
  modifiedItems: SnapshotModifiedItem[];
  statusChanges: SnapshotStatusChange[];
}

export interface CreateSnapshotInput {
  description: string;
  operationType: OperationType;
  command: string;
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  itemsRolledBack: number;
  itemsFailed: number;
  errors: string[];
}
