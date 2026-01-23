/**
 * Update Project Command
 *
 * Update an existing project in Things 3.
 */

import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { ExecutionResult } from '../core/url-executor';

export interface UpdateProjectOptions {
  dryRun?: boolean;
  json?: boolean;
  title?: string;
  notes?: string;
  prepend?: string;
  append?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  addTags?: string;
  area?: string;
  areaId?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
}

export interface UpdateProjectResult extends ExecutionResult {
  projectId: string;
  snapshotId?: string;
}

/**
 * Update an existing project
 */
export async function updateProjectCommand(
  projectId: string,
  options: UpdateProjectOptions
): Promise<UpdateProjectResult> {
  const authToken = getAuthToken();

  if (!authToken) {
    return {
      success: false,
      url: '',
      error: 'Authentication required. Run "things3 auth setup <token>" first.',
      projectId,
    };
  }

  const client = new ThingsClient({
    dryRun: options.dryRun,
    authToken,
  });

  const tags = options.tags?.split(',').map(t => t.trim()).filter(Boolean);
  const addTags = options.addTags?.split(',').map(t => t.trim()).filter(Boolean);

  const result = await client.updateProject({
    id: projectId,
    title: options.title,
    notes: options.notes,
    prepend: options.prepend,
    append: options.append,
    when: options.when,
    deadline: options.deadline,
    tags,
    addTags,
    area: options.area,
    areaId: options.areaId,
    completed: options.completed,
    canceled: options.canceled,
    revealOnUpdate: options.reveal,
    duplicate: options.duplicate,
  });

  return {
    ...result,
    projectId,
  };
}
