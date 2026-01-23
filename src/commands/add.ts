/**
 * Add Command
 *
 * Add a new to-do to Things 3.
 */

import { ThingsClient } from '../services/things-client';
import { SnapshotManager } from '../services/snapshot-manager';
import { SnapshotRepository } from '../db/snapshot-repo';
import { getDatabase } from '../db/connection';
import type { ExecutionResult } from '../core/url-executor';

export interface AddOptions {
  dryRun?: boolean;
  json?: boolean;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  checklist?: string;
  list?: string;
  listId?: string;
  heading?: string;
  headingId?: string;
  creationDate?: string;
  completionDate?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
}

export interface AddResult extends ExecutionResult {
  title: string;
  snapshotId?: string;
}

/**
 * Add a new to-do
 */
export async function addCommand(
  title: string,
  options: AddOptions
): Promise<AddResult> {
  const client = new ThingsClient({ dryRun: options.dryRun });

  // Parse tags and checklist from comma-separated strings
  const tags = options.tags?.split(',').map(t => t.trim()).filter(Boolean);
  const checklistItems = options.checklist?.split(',').map(t => t.trim()).filter(Boolean);

  const result = await client.addTodo({
    title,
    notes: options.notes,
    when: options.when,
    deadline: options.deadline,
    tags,
    checklistItems,
    list: options.list,
    listId: options.listId,
    heading: options.heading,
    headingId: options.headingId,
    creationDate: options.creationDate,
    completionDate: options.completionDate,
    completed: options.completed,
    canceled: options.canceled,
    revealOnAdd: options.reveal,
  });

  // Create snapshot only if not dry run and execution succeeded
  let snapshotId: string | undefined;

  if (!options.dryRun && result.success) {
    try {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);
      const manager = new SnapshotManager(repo);

      const snapshot = manager.createAddSnapshot({
        title,
        itemType: 'to-do',
        thingsId: 'pending', // We don't know the ID until Things processes it
        parentId: options.listId,
        command: `things3 add "${title}"`,
      });

      snapshotId = snapshot.id;
    } catch {
      // Snapshot creation failure shouldn't fail the command
    }
  }

  return {
    ...result,
    title,
    snapshotId,
  };
}
