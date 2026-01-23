/**
 * Things 3 CLI
 *
 * Command-line interface for Things 3 task management.
 */

import { Command } from 'commander';
import { CLI_VERSION, THINGS_LISTS } from './config';
import { createOutputOptions, formatSuccess, formatError, formatJson, print, printError, formatSnapshotInfo, formatItemList, formatTable } from './core/output';

// Commands
import { showCommand } from './commands/show';
import { searchCommand } from './commands/search';
import { versionCommand } from './commands/version';
import { authSetup, authShow, authClear, authTest } from './commands/auth';
import { addCommand } from './commands/add';
import { addProjectCommand } from './commands/add-project';
import { updateCommand } from './commands/update';
import { updateProjectCommand } from './commands/update-project';
import { completeCommand } from './commands/complete';
import { cancelCommand } from './commands/cancel';
import { queryCommand, QueryResult, TagQueryResult } from './commands/query';
import { getCommand } from './commands/get';
import { jsonCommand } from './commands/json';
import { listSnapshots, showSnapshot, deleteSnapshot, purgeSnapshots } from './commands/snapshots';
import { rollbackCommand } from './commands/rollback';

const program = new Command();

program
  .name('things3')
  .description('CLI for Things 3 task management with rollback support')
  .version(CLI_VERSION);

// Global options
program
  .option('--json', 'Output in JSON format')
  .option('--no-color', 'Disable colored output')
  .option('--quiet', 'Suppress non-essential output')
  .option('--dry-run', 'Show what would be done without executing');

// Show command - extended with more targets
const SHOW_TARGETS = [
  ...THINGS_LISTS,
  'tomorrow',
  'deadlines',
  'repeating',
  'all-projects',
  'logged-projects',
];

program
  .command('show <target>')
  .description(`Navigate to a list or item in Things. Targets: ${SHOW_TARGETS.join(', ')}, or an item ID`)
  .option('-f, --filter <tag>', 'Filter by tag')
  .action(async (target, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await showCommand(target, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      filter: options.filter,
    });

    if (result.success) {
      print(formatSuccess(`Showing ${target}`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search Things for items')
  .action(async (query) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await searchCommand(query, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
    });

    if (result.success) {
      print(formatSuccess(`Searching for "${query}"`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .action(async () => {
    const globalOpts = program.opts();
    const result = await versionCommand({ json: globalOpts.json });

    if (globalOpts.json) {
      print(formatJson(result));
    } else {
      print(`things3 CLI: v${result.cliVersion}`);
      if (result.thingsVersion) {
        print(`Things 3: v${result.thingsVersion}`);
      }
      print(`Things running: ${result.thingsRunning ? 'yes' : 'no'}`);
    }
  });

// Auth command
const authCmd = program
  .command('auth')
  .description('Manage authentication token');

authCmd
  .command('setup <token>')
  .description('Set up the authentication token')
  .action((token) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = authSetup(token);

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(result.message ?? 'Token saved', outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

authCmd
  .command('show')
  .description('Show current authentication status')
  .action(() => {
    const globalOpts = program.opts();
    const result = authShow();

    if (globalOpts.json) {
      print(formatJson(result));
    } else {
      print(result.message ?? '');
    }
  });

authCmd
  .command('clear')
  .description('Clear the authentication token')
  .action(() => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = authClear();

    if (globalOpts.json) {
      print(formatJson(result));
    } else {
      print(formatSuccess(result.message ?? 'Token cleared', outputOpts));
    }
  });

authCmd
  .command('test')
  .description('Test the authentication token')
  .action(async () => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await authTest({ dryRun: globalOpts.dryRun });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(result.message ?? 'Token valid', outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Add command - extended with all parameters
program
  .command('add <title>')
  .description('Add a new to-do')
  .option('-n, --notes <notes>', 'Notes for the to-do')
  .option('-w, --when <when>', 'When to schedule (today, tomorrow, evening, anytime, someday, or date)')
  .option('-d, --deadline <date>', 'Deadline date (YYYY-MM-DD)')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-c, --checklist <items>', 'Comma-separated checklist items')
  .option('-l, --list <name>', 'List or project name')
  .option('--list-id <id>', 'List or project ID')
  .option('--heading <heading>', 'Heading within project (by name)')
  .option('--heading-id <id>', 'Heading within project (by ID)')
  .option('--creation-date <date>', 'Creation date (YYYY-MM-DD)')
  .option('--completion-date <date>', 'Completion date (YYYY-MM-DD)')
  .option('--completed', 'Mark as completed')
  .option('--canceled', 'Mark as canceled')
  .option('-r, --reveal', 'Reveal in Things after adding')
  .action(async (title, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await addCommand(title, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      ...options,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      let msg = `Added to-do: "${title}"`;
      if (result.snapshotId) {
        msg += ` (snapshot: ${result.snapshotId})`;
      }
      print(formatSuccess(msg, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Add-project command - extended
program
  .command('add-project <title>')
  .description('Add a new project')
  .option('-n, --notes <notes>', 'Notes for the project')
  .option('-w, --when <when>', 'When to schedule')
  .option('-d, --deadline <date>', 'Deadline date')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-a, --area <name>', 'Area name')
  .option('--area-id <id>', 'Area ID')
  .option('--creation-date <date>', 'Creation date (YYYY-MM-DD)')
  .option('--completion-date <date>', 'Completion date (YYYY-MM-DD)')
  .option('--completed', 'Mark as completed')
  .option('--canceled', 'Mark as canceled')
  .option('-r, --reveal', 'Reveal in Things after adding')
  .action(async (title, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await addProjectCommand(title, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      ...options,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      let msg = `Added project: "${title}"`;
      if (result.snapshotId) {
        msg += ` (snapshot: ${result.snapshotId})`;
      }
      print(formatSuccess(msg, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Update command - extended with all parameters
program
  .command('update <id>')
  .description('Update an existing to-do')
  .option('--title <title>', 'New title')
  .option('-n, --notes <notes>', 'New notes (replaces existing)')
  .option('--prepend <text>', 'Prepend to notes')
  .option('--append <text>', 'Append to notes')
  .option('-w, --when <when>', 'When to schedule')
  .option('-d, --deadline <date>', 'Deadline date')
  .option('-t, --tags <tags>', 'Replace tags (comma-separated)')
  .option('--add-tags <tags>', 'Add tags (comma-separated)')
  .option('-c, --checklist <items>', 'Replace checklist items')
  .option('--add-checklist <items>', 'Add checklist items')
  .option('--prepend-checklist <items>', 'Prepend checklist items')
  .option('--append-checklist <items>', 'Append checklist items')
  .option('-l, --list <name>', 'Move to list')
  .option('--list-id <id>', 'Move to list by ID')
  .option('--heading <heading>', 'Move to heading (by name)')
  .option('--heading-id <id>', 'Move to heading (by ID)')
  .option('--duplicate', 'Duplicate the item before updating')
  .option('--creation-date <date>', 'Set creation date')
  .option('--completion-date <date>', 'Set completion date')
  .option('--completed', 'Mark as completed')
  .option('--canceled', 'Mark as canceled')
  .option('-r, --reveal', 'Reveal in Things after updating')
  .action(async (id, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await updateCommand(id, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      ...options,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Updated: ${id}`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Update-project command - NEW
program
  .command('update-project <id>')
  .description('Update an existing project')
  .option('--title <title>', 'New title')
  .option('-n, --notes <notes>', 'New notes (replaces existing)')
  .option('--prepend <text>', 'Prepend to notes')
  .option('--append <text>', 'Append to notes')
  .option('-w, --when <when>', 'When to schedule')
  .option('-d, --deadline <date>', 'Deadline date')
  .option('-t, --tags <tags>', 'Replace tags (comma-separated)')
  .option('--add-tags <tags>', 'Add tags (comma-separated)')
  .option('-a, --area <name>', 'Move to area (by name)')
  .option('--area-id <id>', 'Move to area (by ID)')
  .option('--duplicate', 'Duplicate the project before updating')
  .option('--creation-date <date>', 'Set creation date')
  .option('--completion-date <date>', 'Set completion date')
  .option('--completed', 'Mark as completed')
  .option('--canceled', 'Mark as canceled')
  .option('-r, --reveal', 'Reveal in Things after updating')
  .action(async (id, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await updateProjectCommand(id, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      ...options,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Updated project: ${id}`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Complete command
program
  .command('complete <id>')
  .description('Mark a to-do or project as complete')
  .action(async (id) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await completeCommand(id, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Completed: ${id}`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Cancel command
program
  .command('cancel <id>')
  .description('Mark a to-do or project as canceled (IRREVERSIBLE)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await cancelCommand(id, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      force: options.force,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Canceled: ${id}`, outputOpts));
      if (result.warning) {
        print(`Warning: ${result.warning}`);
      }
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Get command - NEW: fetch single item by ID
program
  .command('get <id>')
  .description('Get a single item by ID with full details')
  .action(async (id) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await getCommand(id, {
      json: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success && result.item) {
      const item = result.item;
      print(`ID: ${item.id}`);
      print(`Type: ${item.type}`);
      print(`Title: ${item.title}`);
      if ('status' in item) print(`Status: ${item.status}`);
      if ('notes' in item && item.notes) print(`Notes: ${item.notes}`);
      if ('when' in item && item.when) print(`When: ${item.when}`);
      if ('deadline' in item && item.deadline) print(`Deadline: ${item.deadline}`);
      if ('tags' in item && item.tags?.length) print(`Tags: ${item.tags.join(', ')}`);
      if ('projectId' in item && item.projectId) print(`Project ID: ${item.projectId}`);
      if ('areaId' in item && item.areaId) print(`Area ID: ${item.areaId}`);
    } else {
      printError(formatError(result.error ?? 'Not found', outputOpts));
      process.exit(1);
    }
  });

// Query command - extended
program
  .command('query')
  .description('Query items from Things')
  .option('-l, --list <list>', `List to query (${THINGS_LISTS.join(', ')})`)
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-p, --project <id>', 'Filter by project ID')
  .option('-a, --area <id>', 'Filter by area ID')
  .option('-i, --id <id>', 'Get single item by ID')
  .option('--projects', 'List all projects')
  .option('--areas', 'List all areas')
  .option('--tags', 'List all tags')
  .option('--deadlines', 'List items with deadlines')
  .option('--repeating', 'List repeating items')
  .action(async (options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await queryCommand({
      list: options.list,
      tag: options.tag,
      project: options.project,
      area: options.area,
      id: options.id,
      projects: options.projects,
      areas: options.areas,
      tags: options.tags,
      deadlines: options.deadlines,
      repeating: options.repeating,
      json: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      // Handle tags query specially
      if ('tags' in result) {
        const tagResult = result as TagQueryResult;
        if (tagResult.tags.length === 0) {
          print('No tags found.');
        } else {
          for (const tag of tagResult.tags) {
            const parentInfo = tag.parentId ? ` (parent: ${tag.parentId})` : '';
            print(`${tag.name} [${tag.id}]${parentInfo}`);
          }
          print(`\nFound ${tagResult.count} tags`);
        }
      } else {
        const itemResult = result as QueryResult;
        print(formatItemList(itemResult.items, outputOpts));
        print(`\nFound ${itemResult.count} items (${itemResult.filter})`);
      }
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// JSON command
program
  .command('json <data>')
  .description('Execute bulk operations via JSON')
  .option('-r, --reveal', 'Reveal in Things after adding')
  .action(async (data, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await jsonCommand(data, {
      dryRun: globalOpts.dryRun,
      reveal: options.reveal,
      outputJson: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Executed JSON operation (${result.itemCount} items)`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Snapshots command
const snapshotsCmd = program
  .command('snapshots')
  .description('Manage rollback snapshots');

snapshotsCmd
  .command('list')
  .description('List snapshots')
  .option('-s, --status <status>', 'Filter by status (active, rolled-back)')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action((options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = listSnapshots({
      status: options.status,
      limit: parseInt(options.limit, 10),
      json: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      if (result.snapshots.length === 0) {
        print('No snapshots found.');
      } else {
        const columns = [
          { header: 'ID', key: 'id' },
          { header: 'Description', key: 'description' },
          { header: 'Status', key: 'status' },
          { header: 'Created', key: 'createdAt' },
        ];
        print(formatTable(columns, result.snapshots as unknown as Record<string, unknown>[], outputOpts));
      }
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

snapshotsCmd
  .command('show <id>')
  .description('Show snapshot details')
  .action((id) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = showSnapshot(id);

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success && result.snapshot) {
      print(formatSnapshotInfo(result.snapshot, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Not found', outputOpts));
      process.exit(1);
    }
  });

snapshotsCmd
  .command('delete <id>')
  .description('Delete a snapshot')
  .action((id) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = deleteSnapshot(id);

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Deleted snapshot: ${id}`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

snapshotsCmd
  .command('purge')
  .description('Purge old snapshots')
  .option('-d, --days <n>', 'Purge snapshots older than N days', '30')
  .action((options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = purgeSnapshots({
      days: parseInt(options.days, 10),
      json: globalOpts.json,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      print(formatSuccess(`Purged ${result.purgedCount} snapshots`, outputOpts));
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

// Rollback command
program
  .command('rollback <snapshot-id>')
  .description('Roll back changes from a snapshot')
  .option('-f, --force', 'Skip confirmation')
  .action(async (snapshotId, options) => {
    const globalOpts = program.opts();
    const outputOpts = createOutputOptions({
      format: globalOpts.json ? 'json' : 'text',
      color: globalOpts.color !== false,
      quiet: globalOpts.quiet,
    });

    const result = await rollbackCommand(snapshotId, {
      dryRun: globalOpts.dryRun,
      json: globalOpts.json,
      force: options.force,
    });

    if (globalOpts.json) {
      print(formatJson(result));
    } else if (result.success) {
      const msg = globalOpts.dryRun
        ? `Would rollback ${result.plan?.actions.length ?? 0} actions`
        : `Rolled back snapshot: ${snapshotId}`;
      print(formatSuccess(msg, outputOpts));

      if (result.warnings && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          print(`Warning: ${warning}`);
        }
      }
    } else {
      printError(formatError(result.error ?? 'Failed', outputOpts));
      process.exit(1);
    }
  });

export { program };
