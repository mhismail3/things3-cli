/**
 * URL Builder for Things 3 URL scheme
 *
 * Things 3 uses a custom URL scheme (things:///) for inter-app communication.
 * This module builds properly encoded URLs for all supported operations.
 */

import { THINGS_URL_SCHEME } from '../config';
import type {
  AddTodoParams,
  AddProjectParams,
  UpdateTodoParams,
  UpdateProjectParams,
  ShowParams,
  SearchParams,
  JsonParams,
} from '../types/things';

/**
 * Encode a parameter value for the Things URL scheme
 * Uses standard URL encoding but preserves the Things-expected format
 */
export function encodeThingsParam(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Build query string from parameters object
 * Omits undefined/null values
 */
function buildQueryString(params: Record<string, string | boolean | undefined>): string {
  const entries: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'boolean') {
      entries.push(`${key}=${value}`);
    } else {
      entries.push(`${key}=${encodeThingsParam(value)}`);
    }
  }

  return entries.join('&');
}

/**
 * Build URL for adding a new to-do
 * @see https://culturedcode.com/things/support/articles/2803573/
 */
export function buildAddTodoUrl(params: AddTodoParams): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    title: params.title,
    titles: params.titles?.join('\n'),
    notes: params.notes,
    when: params.when,
    deadline: params.deadline,
    tags: params.tags?.join(','),
    'checklist-items': params.checklistItems?.join('\n'),
    'list-id': params.listId,
    list: params.list,
    heading: params.heading,
    'heading-id': params.headingId,
    completed: params.completed,
    canceled: params.canceled,
    'creation-date': params.creationDate,
    'completion-date': params.completionDate,
    reveal: params.revealOnAdd,
    'use-clipboard': params.useClipboard,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}add?${queryString}`;
}

/**
 * Build URL for adding a new project
 */
export function buildAddProjectUrl(params: AddProjectParams): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    title: params.title,
    notes: params.notes,
    when: params.when,
    deadline: params.deadline,
    tags: params.tags?.join(','),
    'area-id': params.areaId,
    area: params.area,
    completed: params.completed,
    canceled: params.canceled,
    'creation-date': params.creationDate,
    'completion-date': params.completionDate,
    reveal: params.revealOnAdd,
  };

  // Handle nested todos array
  if (params.todos && params.todos.length > 0) {
    queryParams['to-dos'] = JSON.stringify(params.todos);
  }

  // Handle headings
  if (params.headings && params.headings.length > 0) {
    queryParams['headings'] = JSON.stringify(params.headings);
  }

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}add-project?${queryString}`;
}

/**
 * Build URL for updating an existing to-do
 * Requires auth token
 */
export function buildUpdateUrl(params: UpdateTodoParams, authToken: string): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    'auth-token': authToken,
    id: params.id,
    title: params.title,
    notes: params.notes,
    'prepend-notes': params.prepend,
    'append-notes': params.append,
    when: params.when,
    deadline: params.deadline,
    tags: params.tags?.join(','),
    'add-tags': params.addTags?.join(','),
    'checklist-items': params.checklistItems?.join('\n'),
    'add-checklist-items': params.addChecklistItems?.join('\n'),
    'prepend-checklist-items': params.prependChecklistItems?.join('\n'),
    'append-checklist-items': params.appendChecklistItems?.join('\n'),
    'list-id': params.listId,
    list: params.list,
    heading: params.heading,
    'heading-id': params.headingId,
    completed: params.completed,
    canceled: params.canceled,
    'completion-date': params.completionDate,
    'creation-date': params.creationDate,
    reveal: params.revealOnUpdate,
    duplicate: params.duplicate,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}update?${queryString}`;
}

/**
 * Build URL for updating an existing project
 * Requires auth token
 */
export function buildUpdateProjectUrl(params: UpdateProjectParams, authToken: string): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    'auth-token': authToken,
    id: params.id,
    title: params.title,
    notes: params.notes,
    'prepend-notes': params.prepend,
    'append-notes': params.append,
    when: params.when,
    deadline: params.deadline,
    tags: params.tags?.join(','),
    'add-tags': params.addTags?.join(','),
    'area-id': params.areaId,
    area: params.area,
    completed: params.completed,
    canceled: params.canceled,
    'completion-date': params.completionDate,
    'creation-date': params.creationDate,
    reveal: params.revealOnUpdate,
    duplicate: params.duplicate,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}update-project?${queryString}`;
}

/**
 * Build URL for showing a list or item
 */
export function buildShowUrl(params: ShowParams): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    id: params.id,
    query: params.query,
    filter: params.filter,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}show?${queryString}`;
}

/**
 * Build URL for searching Things
 */
export function buildSearchUrl(params: SearchParams): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    query: params.query,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}search?${queryString}`;
}

/**
 * Build URL for bulk JSON operations
 * Requires auth token for any update operations
 */
export function buildJsonUrl(params: JsonParams): string {
  const queryParams: Record<string, string | boolean | undefined> = {
    'auth-token': params.authToken,
    data: JSON.stringify(params.data),
    reveal: params.revealOnAdd,
  };

  const queryString = buildQueryString(queryParams);
  return `${THINGS_URL_SCHEME}json?${queryString}`;
}

/**
 * Build URL for marking a to-do as complete
 */
export function buildCompleteUrl(id: string, authToken: string): string {
  return buildUpdateUrl({ id, completed: true }, authToken);
}

/**
 * Build URL for marking a to-do as canceled
 */
export function buildCancelUrl(id: string, authToken: string): string {
  return buildUpdateUrl({ id, canceled: true }, authToken);
}
