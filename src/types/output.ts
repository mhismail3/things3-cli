/**
 * Output formatting types
 */

export type OutputFormat = 'text' | 'json';

export interface OutputOptions {
  format: OutputFormat;
  color: boolean;
  quiet: boolean;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  snapshotId?: string;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface AddResult {
  action: 'created';
  itemType: 'to-do' | 'project';
  title: string;
  thingsId?: string;
  snapshotId: string;
}

export interface UpdateResult {
  action: 'updated';
  itemType: 'to-do' | 'project';
  thingsId: string;
  fields: string[];
  snapshotId: string;
}

export interface CompleteResult {
  action: 'completed' | 'canceled';
  itemType: 'to-do' | 'project';
  thingsId: string;
  title: string;
  snapshotId: string;
}

export interface QueryResult {
  items: import('./things').ThingsItem[];
  count: number;
  filter?: string;
}

export interface VersionResult {
  cliVersion: string;
  thingsVersion?: string;
  thingsRunning: boolean;
}
