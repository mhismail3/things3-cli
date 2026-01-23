/**
 * Update Command
 *
 * Update an existing to-do in Things 3.
 */

import { ThingsClient } from '../services/things-client';
import { getAuthToken } from '../core/auth';
import type { ExecutionResult } from '../core/url-executor';

export interface UpdateOptions {
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
  checklist?: string;
  addChecklist?: string;
  prependChecklist?: string;
  appendChecklist?: string;
  list?: string;
  listId?: string;
  heading?: string;
  headingId?: string;
  duplicate?: boolean;
  creationDate?: string;
  completionDate?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
}

export interface UpdateResult extends ExecutionResult {
  itemId: string;
  snapshotId?: string;
}

/**
 * Update an existing to-do
 */
export async function updateCommand(
  itemId: string,
  options: UpdateOptions
): Promise<UpdateResult> {
  const authToken = getAuthToken();

  if (!authToken) {
    return {
      success: false,
      url: '',
      error: 'Authentication required. Run "things3 auth setup <token>" first.',
      itemId,
    };
  }

  const client = new ThingsClient({
    dryRun: options.dryRun,
    authToken,
  });

  const tags = options.tags?.split(',').map(t => t.trim()).filter(Boolean);
  const addTags = options.addTags?.split(',').map(t => t.trim()).filter(Boolean);
  const checklistItems = options.checklist?.split(',').map(t => t.trim()).filter(Boolean);
  const addChecklistItems = options.addChecklist?.split(',').map(t => t.trim()).filter(Boolean);
  const prependChecklistItems = options.prependChecklist?.split(',').map(t => t.trim()).filter(Boolean);
  const appendChecklistItems = options.appendChecklist?.split(',').map(t => t.trim()).filter(Boolean);

  const result = await client.updateTodo({
    id: itemId,
    title: options.title,
    notes: options.notes,
    prepend: options.prepend,
    append: options.append,
    when: options.when,
    deadline: options.deadline,
    tags,
    addTags,
    checklistItems,
    addChecklistItems,
    prependChecklistItems,
    appendChecklistItems,
    list: options.list,
    listId: options.listId,
    heading: options.heading,
    headingId: options.headingId,
    duplicate: options.duplicate,
    creationDate: options.creationDate,
    completionDate: options.completionDate,
    completed: options.completed,
    canceled: options.canceled,
    revealOnUpdate: options.reveal,
  });

  return {
    ...result,
    itemId,
  };
}
