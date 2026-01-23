/**
 * Snapshot Manager Service Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import Database from 'bun:sqlite';
import { createTestDatabase } from '../setup';
import { runMigrations } from '../../src/db/migrations';
import { SnapshotRepository } from '../../src/db/snapshot-repo';
import {
  SnapshotManager,
  AddSnapshotData,
  UpdateSnapshotData,
  StatusChangeData,
} from '../../src/services/snapshot-manager';

describe('Snapshot Manager', () => {
  let db: Database;
  let repo: SnapshotRepository;
  let manager: SnapshotManager;

  beforeEach(() => {
    db = createTestDatabase();
    runMigrations(db);
    repo = new SnapshotRepository(db);
    manager = new SnapshotManager(repo);
  });

  afterEach(() => {
    db.close();
  });

  describe('createAddSnapshot', () => {
    test('creates snapshot for add operation', () => {
      const data: AddSnapshotData = {
        title: 'New Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'things3 add "New Task"',
      };

      const snapshot = manager.createAddSnapshot(data);

      expect(snapshot.id).toMatch(/^snap-/);
      expect(snapshot.operationType).toBe('add');
      expect(snapshot.status).toBe('active');
    });

    test('records created item in snapshot', () => {
      const data: AddSnapshotData = {
        title: 'New Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'things3 add "New Task"',
      };

      const snapshot = manager.createAddSnapshot(data);
      const details = repo.getSnapshotDetails(snapshot.id);

      expect(details?.createdItems.length).toBe(1);
      expect(details?.createdItems[0].thingsId).toBe('things-123');
      expect(details?.createdItems[0].title).toBe('New Task');
    });

    test('records parent for project items', () => {
      const data: AddSnapshotData = {
        title: 'Subtask',
        itemType: 'to-do',
        thingsId: 'things-456',
        parentId: 'project-123',
        command: 'things3 add "Subtask" --list-id project-123',
      };

      const snapshot = manager.createAddSnapshot(data);
      const details = repo.getSnapshotDetails(snapshot.id);

      expect(details?.createdItems[0].parentId).toBe('project-123');
    });
  });

  describe('createUpdateSnapshot', () => {
    test('creates snapshot for update operation', () => {
      const data: UpdateSnapshotData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        previousState: { title: 'Old Title', notes: 'Old notes' },
        modifiedFields: ['title', 'notes'],
        command: 'things3 update things-123 --title "New Title"',
      };

      const snapshot = manager.createUpdateSnapshot(data);

      expect(snapshot.operationType).toBe('update');
      expect(snapshot.status).toBe('active');
    });

    test('captures previous state', () => {
      const previousState = { title: 'Original', when: 'today', tags: ['work'] };
      const data: UpdateSnapshotData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        previousState,
        modifiedFields: ['title'],
        command: 'things3 update ...',
      };

      const snapshot = manager.createUpdateSnapshot(data);
      const details = repo.getSnapshotDetails(snapshot.id);

      expect(details?.modifiedItems.length).toBe(1);
      const stored = JSON.parse(details?.modifiedItems[0].previousState ?? '{}');
      expect(stored.title).toBe('Original');
      expect(stored.when).toBe('today');
    });

    test('records modified fields', () => {
      const data: UpdateSnapshotData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        previousState: {},
        modifiedFields: ['title', 'notes', 'when'],
        command: 'things3 update ...',
      };

      const snapshot = manager.createUpdateSnapshot(data);
      const details = repo.getSnapshotDetails(snapshot.id);

      const fields = JSON.parse(details?.modifiedItems[0].modifiedFields ?? '[]');
      expect(fields).toContain('title');
      expect(fields).toContain('notes');
      expect(fields).toContain('when');
    });
  });

  describe('createStatusChangeSnapshot', () => {
    test('creates snapshot for complete operation', () => {
      const data: StatusChangeData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        title: 'Task to complete',
        previousStatus: 'open',
        newStatus: 'completed',
        command: 'things3 complete things-123',
      };

      const snapshot = manager.createStatusChangeSnapshot(data);

      expect(snapshot.operationType).toBe('complete');
    });

    test('creates snapshot for cancel operation', () => {
      const data: StatusChangeData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        title: 'Task to cancel',
        previousStatus: 'open',
        newStatus: 'canceled',
        command: 'things3 cancel things-123',
      };

      const snapshot = manager.createStatusChangeSnapshot(data);

      expect(snapshot.operationType).toBe('cancel');
    });

    test('records status change', () => {
      const data: StatusChangeData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        title: 'Task',
        previousStatus: 'open',
        newStatus: 'completed',
        command: 'things3 complete ...',
      };

      const snapshot = manager.createStatusChangeSnapshot(data);
      const details = repo.getSnapshotDetails(snapshot.id);

      expect(details?.statusChanges.length).toBe(1);
      expect(details?.statusChanges[0].previousStatus).toBe('open');
      expect(details?.statusChanges[0].newStatus).toBe('completed');
    });
  });

  describe('createBulkSnapshot', () => {
    test('handles multiple created items', () => {
      const snapshot = manager.createBulkSnapshot({
        command: 'things3 json ...',
        createdItems: [
          { thingsId: 'item-1', itemType: 'to-do', title: 'Task 1' },
          { thingsId: 'item-2', itemType: 'to-do', title: 'Task 2' },
          { thingsId: 'proj-1', itemType: 'project', title: 'Project 1' },
        ],
        modifiedItems: [],
        statusChanges: [],
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.createdItems.length).toBe(3);
    });

    test('handles mixed operations', () => {
      const snapshot = manager.createBulkSnapshot({
        command: 'things3 json ...',
        createdItems: [
          { thingsId: 'new-1', itemType: 'to-do', title: 'New Task' },
        ],
        modifiedItems: [
          {
            thingsId: 'mod-1',
            itemType: 'to-do',
            previousState: { title: 'Old' },
            modifiedFields: ['title'],
          },
        ],
        statusChanges: [
          {
            thingsId: 'status-1',
            itemType: 'to-do',
            previousStatus: 'open',
            newStatus: 'completed',
          },
        ],
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.createdItems.length).toBe(1);
      expect(details?.modifiedItems.length).toBe(1);
      expect(details?.statusChanges.length).toBe(1);
    });
  });

  describe('getRollbackPlan', () => {
    test('returns plan for add snapshot', () => {
      const data: AddSnapshotData = {
        title: 'Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'cmd',
      };

      const snapshot = manager.createAddSnapshot(data);
      const plan = manager.getRollbackPlan(snapshot.id);

      expect(plan).not.toBeNull();
      expect(plan?.actions.length).toBe(1);
      expect(plan?.actions[0].action).toBe('cancel');
      expect(plan?.actions[0].thingsId).toBe('things-123');
    });

    test('returns plan for update snapshot', () => {
      const data: UpdateSnapshotData = {
        thingsId: 'things-123',
        itemType: 'to-do',
        previousState: { title: 'Old' },
        modifiedFields: ['title'],
        command: 'cmd',
      };

      const snapshot = manager.createUpdateSnapshot(data);
      const plan = manager.getRollbackPlan(snapshot.id);

      expect(plan?.actions.length).toBe(1);
      expect(plan?.actions[0].action).toBe('restore');
    });

    test('returns null for non-existent snapshot', () => {
      const plan = manager.getRollbackPlan('nonexistent');
      expect(plan).toBeNull();
    });

    test('returns null for already rolled back snapshot', () => {
      const snapshot = manager.createAddSnapshot({
        title: 'Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'cmd',
      });

      repo.updateSnapshotStatus(snapshot.id, 'rolled-back');

      const plan = manager.getRollbackPlan(snapshot.id);
      expect(plan).toBeNull();
    });
  });

  describe('markRolledBack', () => {
    test('marks snapshot as rolled back', () => {
      const snapshot = manager.createAddSnapshot({
        title: 'Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'cmd',
      });

      manager.markRolledBack(snapshot.id, 'rolled-back');

      const updated = repo.getSnapshot(snapshot.id);
      expect(updated?.status).toBe('rolled-back');
      expect(updated?.rolledBackAt).toBeDefined();
    });

    test('marks partial rollback', () => {
      const snapshot = manager.createAddSnapshot({
        title: 'Task',
        itemType: 'to-do',
        thingsId: 'things-123',
        command: 'cmd',
      });

      manager.markRolledBack(snapshot.id, 'partial-rollback');

      const updated = repo.getSnapshot(snapshot.id);
      expect(updated?.status).toBe('partial-rollback');
    });
  });
});
