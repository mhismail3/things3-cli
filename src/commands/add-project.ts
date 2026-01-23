/**
 * Add Project Command
 *
 * Add a new project to Things 3.
 */

import { ThingsClient } from '../services/things-client';
import { SnapshotManager } from '../services/snapshot-manager';
import { SnapshotRepository } from '../db/snapshot-repo';
import { getDatabase } from '../db/connection';
import type { ExecutionResult } from '../core/url-executor';

export interface AddProjectOptions {
  dryRun?: boolean;
  json?: boolean;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  area?: string;
  areaId?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
}

export interface AddProjectResult extends ExecutionResult {
  title: string;
  snapshotId?: string;
}

/**
 * Add a new project
 */
export async function addProjectCommand(
  title: string,
  options: AddProjectOptions
): Promise<AddProjectResult> {
  const client = new ThingsClient({ dryRun: options.dryRun });

  const tags = options.tags?.split(',').map(t => t.trim()).filter(Boolean);

  const result = await client.addProject({
    title,
    notes: options.notes,
    when: options.when,
    deadline: options.deadline,
    tags,
    area: options.area,
    areaId: options.areaId,
    completed: options.completed,
    canceled: options.canceled,
    revealOnAdd: options.reveal,
  });

  let snapshotId: string | undefined;

  if (!options.dryRun && result.success) {
    try {
      const db = getDatabase();
      const repo = new SnapshotRepository(db);
      const manager = new SnapshotManager(repo);

      const snapshot = manager.createAddProjectSnapshot({
        title,
        itemType: 'project',
        thingsId: 'pending',
        command: `things3 add-project "${title}"`,
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
