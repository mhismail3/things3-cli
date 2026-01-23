/**
 * Output Formatting
 *
 * Provides consistent output formatting for all CLI commands.
 * Supports text (human-readable) and JSON output formats.
 */

import type { OutputOptions, TableColumn } from '../types/output';
import type { Snapshot } from '../types/snapshot';
import type { ThingsItem } from '../types/things';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Apply color if enabled
 */
function colorize(text: string, color: keyof typeof colors, options: OutputOptions): string {
  if (!options.color) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Create output options with defaults
 */
export function createOutputOptions(partial: Partial<OutputOptions>): OutputOptions {
  return {
    format: partial.format ?? 'text',
    color: partial.color ?? true,
    quiet: partial.quiet ?? false,
  };
}

/**
 * Format a success message
 */
export function formatSuccess(message: string, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify({ success: true, message });
  }

  if (options.quiet) return '';

  const checkmark = colorize('✓', 'green', options);
  return `${checkmark} ${message}`;
}

/**
 * Format an error message (not suppressed in quiet mode)
 */
export function formatError(message: string, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify({ success: false, error: message });
  }

  const errorMark = colorize('✗', 'red', options);
  return `${errorMark} ${colorize('Error:', 'red', options)} ${message}`;
}

/**
 * Format a warning message
 */
export function formatWarning(message: string, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify({ warning: message });
  }

  if (options.quiet) return '';

  const warnMark = colorize('⚠', 'yellow', options);
  return `${warnMark} ${colorize('Warning:', 'yellow', options)} ${message}`;
}

/**
 * Format an info message
 */
export function formatInfo(message: string, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify({ info: message });
  }

  if (options.quiet) return '';

  const infoMark = colorize('ℹ', 'blue', options);
  return `${infoMark} ${message}`;
}

/**
 * Format data as a table
 */
export function formatTable(
  columns: TableColumn[],
  data: Record<string, unknown>[],
  options: OutputOptions
): string {
  if (options.format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (data.length === 0) {
    return colorize('No data to display', 'dim', options);
  }

  // Calculate column widths
  const widths = columns.map(col => {
    const headerLen = col.header.length;
    const maxDataLen = Math.max(
      0,
      ...data.map(row => String(row[col.key] ?? '').length)
    );
    return col.width ?? Math.max(headerLen, maxDataLen);
  });

  // Build header
  const header = columns
    .map((col, i) => col.header.padEnd(widths[i]))
    .join('  ');
  const separator = widths.map(w => '─'.repeat(w)).join('──');

  // Build rows
  const rows = data.map(row =>
    columns
      .map((col, i) => {
        const value = String(row[col.key] ?? '');
        const width = widths[i];
        if (col.align === 'right') {
          return value.padStart(width);
        }
        return value.padEnd(width);
      })
      .join('  ')
  );

  return [
    colorize(header, 'bold', options),
    colorize(separator, 'dim', options),
    ...rows,
  ].join('\n');
}

/**
 * Format data as JSON
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format snapshot information
 */
export function formatSnapshotInfo(snapshot: Snapshot, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify(snapshot, null, 2);
  }

  const lines = [
    `${colorize('Snapshot:', 'bold', options)} ${snapshot.id}`,
    `  ${colorize('Description:', 'dim', options)} ${snapshot.description}`,
    `  ${colorize('Operation:', 'dim', options)} ${snapshot.operationType}`,
    `  ${colorize('Command:', 'dim', options)} ${snapshot.command}`,
    `  ${colorize('Created:', 'dim', options)} ${snapshot.createdAt}`,
    `  ${colorize('Status:', 'dim', options)} ${formatSnapshotStatus(snapshot.status, options)}`,
  ];

  if (snapshot.rolledBackAt) {
    lines.push(`  ${colorize('Rolled back:', 'dim', options)} ${snapshot.rolledBackAt}`);
  }

  return lines.join('\n');
}

/**
 * Format snapshot status with color
 */
function formatSnapshotStatus(status: string, options: OutputOptions): string {
  switch (status) {
    case 'active':
      return colorize(status, 'green', options);
    case 'rolled-back':
      return colorize(status, 'yellow', options);
    case 'partial-rollback':
      return colorize(status, 'red', options);
    case 'expired':
      return colorize(status, 'dim', options);
    default:
      return status;
  }
}

/**
 * Format a list of Things items
 */
export function formatItemList(items: ThingsItem[], options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify(items, null, 2);
  }

  if (items.length === 0) {
    return colorize('No items found', 'dim', options);
  }

  return items
    .map(item => formatItem(item, options))
    .join('\n');
}

/**
 * Format a single Things item
 */
function formatItem(item: ThingsItem, options: OutputOptions): string {
  const typeIcon = getTypeIcon(item.type);
  const statusIcon = getStatusIcon('status' in item ? item.status : undefined);

  const title = colorize(item.title, 'bold', options);
  const id = colorize(`(${item.id})`, 'dim', options);

  let line = `${typeIcon} ${statusIcon} ${title} ${id}`;

  // Add extra info based on item type
  if (item.type === 'to-do' || item.type === 'project') {
    if (item.when) {
      line += ` ${colorize(`[${item.when}]`, 'cyan', options)}`;
    }
    if (item.tags && item.tags.length > 0) {
      line += ` ${colorize(item.tags.map(t => `#${t}`).join(' '), 'blue', options)}`;
    }
  }

  return line;
}

/**
 * Get icon for item type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'to-do':
      return '○';
    case 'project':
      return '◉';
    case 'area':
      return '□';
    case 'heading':
      return '▸';
    default:
      return '•';
  }
}

/**
 * Get icon for item status
 */
function getStatusIcon(status: string | undefined): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'canceled':
      return '✗';
    case 'open':
    default:
      return ' ';
  }
}

/**
 * Print output to stdout
 */
export function print(text: string): void {
  if (text) {
    console.log(text);
  }
}

/**
 * Print error to stderr
 */
export function printError(text: string): void {
  console.error(text);
}
