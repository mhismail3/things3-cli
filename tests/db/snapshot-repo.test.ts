/**
 * Snapshot Repository Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import Database from 'bun:sqlite';
import { createTestDatabase } from '../setup';
import { runMigrations } from '../../src/db/migrations';
import {
  SnapshotRepository,
  generateSnapshotId,
} from '../../src/db/snapshot-repo';
import type { CreateSnapshotInput } from '../../src/types/snapshot';

describe('Snapshot Repository', () => {
  let db: Database;
  let repo: SnapshotRepository;

  beforeEach(() => {
    db = createTestDatabase();
    runMigrations(db);
    repo = new SnapshotRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('generateSnapshotId', () => {
    test('generates unique IDs', () => {
      const id1 = generateSnapshotId();
      const id2 = generateSnapshotId();
      expect(id1).not.toBe(id2);
    });

    test('generates IDs with correct format', () => {
      const id = generateSnapshotId();
      // Format: snap-{timestamp}-{random}
      expect(id).toMatch(/^snap-\d+-[a-z0-9]+$/);
    });
  });

  describe('createSnapshot', () => {
    test('creates snapshot with correct data', () => {
      const input: CreateSnapshotInput = {
        description: 'Added task "Test"',
        operationType: 'add',
        command: 'things3 add "Test"',
      };

      const snapshot = repo.createSnapshot(input);

      expect(snapshot.id).toMatch(/^snap-/);
      expect(snapshot.description).toBe(input.description);
      expect(snapshot.operationType).toBe(input.operationType);
      expect(snapshot.command).toBe(input.command);
      expect(snapshot.status).toBe('active');
      expect(snapshot.createdAt).toBeDefined();
    });

    test('creates snapshot with specific ID', () => {
      const input: CreateSnapshotInput = {
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      };

      const snapshot = repo.createSnapshot(input, 'custom-id-123');
      expect(snapshot.id).toBe('custom-id-123');
    });
  });

  describe('addSnapshotCreated', () => {
    test('adds created item to snapshot', () => {
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      repo.addSnapshotCreated(snapshot.id, {
        thingsId: 'things-item-123',
        itemType: 'to-do',
        title: 'New Task',
        parentId: 'project-456',
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.createdItems.length).toBe(1);
      expect(details?.createdItems[0].thingsId).toBe('things-item-123');
      expect(details?.createdItems[0].title).toBe('New Task');
      expect(details?.createdItems[0].parentId).toBe('project-456');
    });

    test('adds multiple created items', () => {
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'json',
        command: 'cmd',
      });

      repo.addSnapshotCreated(snapshot.id, {
        thingsId: 'item-1',
        itemType: 'to-do',
        title: 'Task 1',
      });
      repo.addSnapshotCreated(snapshot.id, {
        thingsId: 'item-2',
        itemType: 'to-do',
        title: 'Task 2',
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.createdItems.length).toBe(2);
    });
  });

  describe('addSnapshotModified', () => {
    test('stores previous state as JSON', () => {
      const snapshot = repo.createSnapshot({
        description: 'Updated task',
        operationType: 'update',
        command: 'things3 update ...',
      });

      const previousState = {
        title: 'Old Title',
        notes: 'Old notes',
        when: 'today',
      };

      repo.addSnapshotModified(snapshot.id, {
        thingsId: 'item-123',
        itemType: 'to-do',
        previousState,
        modifiedFields: ['title', 'notes'],
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.modifiedItems.length).toBe(1);
      expect(details?.modifiedItems[0].thingsId).toBe('item-123');

      const storedState = JSON.parse(details?.modifiedItems[0].previousState ?? '{}');
      expect(storedState.title).toBe('Old Title');
    });
  });

  describe('addSnapshotStatus', () => {
    test('records status change', () => {
      const snapshot = repo.createSnapshot({
        description: 'Completed task',
        operationType: 'complete',
        command: 'things3 complete ...',
      });

      repo.addSnapshotStatus(snapshot.id, {
        thingsId: 'item-123',
        itemType: 'to-do',
        previousStatus: 'open',
        newStatus: 'completed',
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details?.statusChanges.length).toBe(1);
      expect(details?.statusChanges[0].previousStatus).toBe('open');
      expect(details?.statusChanges[0].newStatus).toBe('completed');
    });
  });

  describe('getSnapshot', () => {
    test('returns null for non-existent snapshot', () => {
      const snapshot = repo.getSnapshot('nonexistent-id');
      expect(snapshot).toBeNull();
    });

    test('returns snapshot when exists', () => {
      const created = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      const snapshot = repo.getSnapshot(created.id);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.id).toBe(created.id);
    });
  });

  describe('getSnapshotDetails', () => {
    test('returns null for non-existent snapshot', () => {
      const details = repo.getSnapshotDetails('nonexistent');
      expect(details).toBeNull();
    });

    test('returns snapshot with all related records', () => {
      const snapshot = repo.createSnapshot({
        description: 'Full test',
        operationType: 'json',
        command: 'things3 json ...',
      });

      repo.addSnapshotCreated(snapshot.id, {
        thingsId: 'new-item',
        itemType: 'to-do',
        title: 'New',
      });

      repo.addSnapshotModified(snapshot.id, {
        thingsId: 'mod-item',
        itemType: 'project',
        previousState: { title: 'Old' },
        modifiedFields: ['title'],
      });

      repo.addSnapshotStatus(snapshot.id, {
        thingsId: 'status-item',
        itemType: 'to-do',
        previousStatus: 'open',
        newStatus: 'completed',
      });

      const details = repo.getSnapshotDetails(snapshot.id);
      expect(details).not.toBeNull();
      expect(details?.createdItems.length).toBe(1);
      expect(details?.modifiedItems.length).toBe(1);
      expect(details?.statusChanges.length).toBe(1);
    });
  });

  describe('listSnapshots', () => {
    test('returns empty array when no snapshots', () => {
      const snapshots = repo.listSnapshots();
      expect(snapshots).toEqual([]);
    });

    test('returns all snapshots ordered by created_at desc', () => {
      repo.createSnapshot({ description: 'First', operationType: 'add', command: 'cmd1' }, 'snap-1');
      repo.createSnapshot({ description: 'Second', operationType: 'add', command: 'cmd2' }, 'snap-2');
      repo.createSnapshot({ description: 'Third', operationType: 'add', command: 'cmd3' }, 'snap-3');

      const snapshots = repo.listSnapshots();
      expect(snapshots.length).toBe(3);
      // Most recent first
      expect(snapshots[0].id).toBe('snap-3');
    });

    test('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        repo.createSnapshot({
          description: `Snapshot ${i}`,
          operationType: 'add',
          command: `cmd${i}`,
        });
      }

      const snapshots = repo.listSnapshots({ limit: 5 });
      expect(snapshots.length).toBe(5);
    });

    test('respects offset parameter', () => {
      repo.createSnapshot({ description: 'A', operationType: 'add', command: 'a' }, 'snap-a');
      repo.createSnapshot({ description: 'B', operationType: 'add', command: 'b' }, 'snap-b');
      repo.createSnapshot({ description: 'C', operationType: 'add', command: 'c' }, 'snap-c');

      const snapshots = repo.listSnapshots({ offset: 1, limit: 10 });
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].id).toBe('snap-b');
    });

    test('filters by status', () => {
      repo.createSnapshot({ description: 'Active', operationType: 'add', command: 'a' }, 'snap-active');
      const rbSnapshot = repo.createSnapshot({
        description: 'Rolled back',
        operationType: 'add',
        command: 'b',
      }, 'snap-rb');
      repo.updateSnapshotStatus(rbSnapshot.id, 'rolled-back');

      const active = repo.listSnapshots({ status: 'active' });
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('snap-active');

      const rolledBack = repo.listSnapshots({ status: 'rolled-back' });
      expect(rolledBack.length).toBe(1);
      expect(rolledBack[0].id).toBe('snap-rb');
    });
  });

  describe('updateSnapshotStatus', () => {
    test('updates status correctly', () => {
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      repo.updateSnapshotStatus(snapshot.id, 'rolled-back');

      const updated = repo.getSnapshot(snapshot.id);
      expect(updated?.status).toBe('rolled-back');
      expect(updated?.rolledBackAt).toBeDefined();
    });
  });

  describe('deleteSnapshot', () => {
    test('deletes snapshot and cascades', () => {
      const snapshot = repo.createSnapshot({
        description: 'To delete',
        operationType: 'add',
        command: 'cmd',
      });

      repo.addSnapshotCreated(snapshot.id, {
        thingsId: 'item-1',
        itemType: 'to-do',
        title: 'Task',
      });

      repo.deleteSnapshot(snapshot.id);

      expect(repo.getSnapshot(snapshot.id)).toBeNull();
    });

    test('returns false for non-existent snapshot', () => {
      const result = repo.deleteSnapshot('nonexistent');
      expect(result).toBe(false);
    });

    test('returns true on successful delete', () => {
      const snapshot = repo.createSnapshot({
        description: 'Test',
        operationType: 'add',
        command: 'cmd',
      });

      const result = repo.deleteSnapshot(snapshot.id);
      expect(result).toBe(true);
    });
  });

  describe('purgeOldSnapshots', () => {
    test('purges snapshots older than specified days', () => {
      // Create old snapshot by manipulating the database directly
      db.run(`
        INSERT INTO snapshots (id, description, operation_type, command, created_at, status)
        VALUES ('old-snap', 'Old', 'add', 'cmd', datetime('now', '-35 days'), 'active')
      `);

      repo.createSnapshot({
        description: 'Recent',
        operationType: 'add',
        command: 'cmd',
      }, 'recent-snap');

      const purged = repo.purgeOldSnapshots(30);
      expect(purged).toBe(1);

      expect(repo.getSnapshot('old-snap')).toBeNull();
      expect(repo.getSnapshot('recent-snap')).not.toBeNull();
    });

    test('returns 0 when nothing to purge', () => {
      repo.createSnapshot({
        description: 'Recent',
        operationType: 'add',
        command: 'cmd',
      });

      const purged = repo.purgeOldSnapshots(30);
      expect(purged).toBe(0);
    });
  });
});
