/**
 * Things 3 data types
 */

export type ThingsListId =
  | 'inbox'
  | 'today'
  | 'anytime'
  | 'upcoming'
  | 'someday'
  | 'logbook'
  | 'trash';

export type ThingsWhen = 'today' | 'tomorrow' | 'evening' | 'anytime' | 'someday' | string;

export type ThingsItemType = 'to-do' | 'project' | 'heading' | 'area';

export type ThingsItemStatus = 'open' | 'completed' | 'canceled';

export interface ThingsTodo {
  id: string;
  type: 'to-do';
  title: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string[];
  checklistItems?: ThingsChecklistItem[];
  projectId?: string;
  areaId?: string;
  headingId?: string;
  status: ThingsItemStatus;
  creationDate: string;
  modificationDate: string;
  completionDate?: string;
  cancellationDate?: string;
}

export interface ThingsProject {
  id: string;
  type: 'project';
  title: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string[];
  areaId?: string;
  status: ThingsItemStatus;
  items?: ThingsTodo[];
  creationDate: string;
  modificationDate: string;
  completionDate?: string;
  cancellationDate?: string;
}

export interface ThingsArea {
  id: string;
  type: 'area';
  title: string;
  tags?: string[];
}

export interface ThingsHeading {
  id: string;
  type: 'heading';
  title: string;
  projectId: string;
}

export interface ThingsChecklistItem {
  title: string;
  completed: boolean;
}

export type ThingsItem = ThingsTodo | ThingsProject | ThingsArea | ThingsHeading;

/**
 * URL Scheme parameters
 */
export interface AddTodoParams {
  title: string;
  titles?: string[];
  notes?: string;
  when?: ThingsWhen;
  deadline?: string;
  tags?: string[];
  checklistItems?: string[];
  listId?: string;
  list?: string;
  heading?: string;
  headingId?: string;
  completed?: boolean;
  canceled?: boolean;
  creationDate?: string;
  completionDate?: string;
  revealOnAdd?: boolean;
  useClipboard?: boolean;
}

export interface AddProjectParams {
  title: string;
  notes?: string;
  when?: ThingsWhen;
  deadline?: string;
  tags?: string[];
  areaId?: string;
  area?: string;
  todos?: AddTodoParams[];
  headings?: string[];
  completed?: boolean;
  canceled?: boolean;
  creationDate?: string;
  completionDate?: string;
  revealOnAdd?: boolean;
}

export interface UpdateTodoParams {
  id?: string;
  title?: string;
  notes?: string;
  prepend?: string;
  append?: string;
  when?: ThingsWhen;
  deadline?: string;
  tags?: string[];
  addTags?: string[];
  checklistItems?: string[];
  addChecklistItems?: string[];
  prependChecklistItems?: string[];
  appendChecklistItems?: string[];
  listId?: string;
  list?: string;
  heading?: string;
  headingId?: string;
  completed?: boolean;
  canceled?: boolean;
  completionDate?: string;
  creationDate?: string;
  revealOnUpdate?: boolean;
  duplicate?: boolean;
}

export interface UpdateProjectParams {
  id?: string;
  title?: string;
  notes?: string;
  prepend?: string;
  append?: string;
  when?: ThingsWhen;
  deadline?: string;
  tags?: string[];
  addTags?: string[];
  areaId?: string;
  area?: string;
  completed?: boolean;
  canceled?: boolean;
  revealOnUpdate?: boolean;
  duplicate?: boolean;
  creationDate?: string;
  completionDate?: string;
}

export interface ShowParams {
  id?: string;
  query?: string;
  filter?: string;
}

export interface SearchParams {
  query: string;
}

export interface JsonParams {
  data: object[];
  authToken: string;
  revealOnAdd?: boolean;
}
