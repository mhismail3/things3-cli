/**
 * Output Formatting Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
  formatTable,
  formatJson,
  formatSnapshotInfo,
  formatItemList,
  createOutputOptions,
  stripAnsi,
} from '../../src/core/output';
import type { OutputOptions } from '../../src/types/output';
import type { ThingsTodo, ThingsProject } from '../../src/types/things';

describe('Output Formatting', () => {
  describe('createOutputOptions', () => {
    test('creates default options', () => {
      const options = createOutputOptions({});
      expect(options.format).toBe('text');
      expect(options.color).toBe(true);
      expect(options.quiet).toBe(false);
    });

    test('respects provided options', () => {
      const options = createOutputOptions({
        format: 'json',
        color: false,
        quiet: true,
      });
      expect(options.format).toBe('json');
      expect(options.color).toBe(false);
      expect(options.quiet).toBe(true);
    });
  });

  describe('formatSuccess', () => {
    test('formats success message with color', () => {
      const output = formatSuccess('Task created', { format: 'text', color: true, quiet: false });
      expect(output).toContain('Task created');
    });

    test('formats success message without color', () => {
      const output = formatSuccess('Task created', { format: 'text', color: false, quiet: false });
      expect(output).toContain('Task created');
      expect(output).not.toContain('\x1b'); // No ANSI codes
    });

    test('returns empty in quiet mode', () => {
      const output = formatSuccess('Task created', { format: 'text', color: true, quiet: true });
      expect(output).toBe('');
    });

    test('returns JSON format', () => {
      const output = formatSuccess('Task created', { format: 'json', color: false, quiet: false });
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toBe('Task created');
    });
  });

  describe('formatError', () => {
    test('formats error message with color', () => {
      const output = formatError('Something failed', { format: 'text', color: true, quiet: false });
      expect(output).toContain('Something failed');
    });

    test('formats error message without color', () => {
      const output = formatError('Something failed', { format: 'text', color: false, quiet: false });
      expect(output).toContain('Something failed');
    });

    test('returns JSON format', () => {
      const output = formatError('Something failed', { format: 'json', color: false, quiet: false });
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Something failed');
    });

    test('is not suppressed in quiet mode', () => {
      const output = formatError('Error!', { format: 'text', color: false, quiet: true });
      expect(output).toContain('Error!');
    });
  });

  describe('formatWarning', () => {
    test('formats warning message', () => {
      const output = formatWarning('Be careful', { format: 'text', color: true, quiet: false });
      expect(output).toContain('Be careful');
    });

    test('returns empty in quiet mode', () => {
      const output = formatWarning('Be careful', { format: 'text', color: false, quiet: true });
      expect(output).toBe('');
    });
  });

  describe('formatInfo', () => {
    test('formats info message', () => {
      const output = formatInfo('FYI', { format: 'text', color: true, quiet: false });
      expect(output).toContain('FYI');
    });

    test('returns empty in quiet mode', () => {
      const output = formatInfo('FYI', { format: 'text', color: false, quiet: true });
      expect(output).toBe('');
    });
  });

  describe('formatTable', () => {
    test('formats data as table', () => {
      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Title', key: 'title' },
      ];
      const data = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ];

      const output = formatTable(columns, data, { format: 'text', color: false, quiet: false });
      expect(output).toContain('ID');
      expect(output).toContain('Title');
      expect(output).toContain('Task 1');
      expect(output).toContain('Task 2');
    });

    test('returns JSON array in json format', () => {
      const columns = [
        { header: 'ID', key: 'id' },
      ];
      const data = [{ id: '1' }, { id: '2' }];

      const output = formatTable(columns, data, { format: 'json', color: false, quiet: false });
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    test('handles empty data', () => {
      const columns = [{ header: 'ID', key: 'id' }];
      const output = formatTable(columns, [], { format: 'text', color: false, quiet: false });
      expect(output).toContain('No data');
    });
  });

  describe('formatJson', () => {
    test('formats object as JSON', () => {
      const data = { foo: 'bar', num: 42 };
      const output = formatJson(data);
      expect(output).toBe(JSON.stringify(data, null, 2));
    });

    test('formats array as JSON', () => {
      const data = [1, 2, 3];
      const output = formatJson(data);
      expect(output).toBe(JSON.stringify(data, null, 2));
    });
  });

  describe('formatSnapshotInfo', () => {
    test('formats snapshot details', () => {
      const snapshot = {
        id: 'snap-123',
        description: 'Added task',
        operationType: 'add' as const,
        command: 'things3 add "Test"',
        createdAt: '2024-01-15T10:30:00Z',
        status: 'active' as const,
      };

      const output = formatSnapshotInfo(snapshot, { format: 'text', color: false, quiet: false });
      expect(output).toContain('snap-123');
      expect(output).toContain('Added task');
      expect(output).toContain('add');
      expect(output).toContain('active');
    });

    test('returns JSON format', () => {
      const snapshot = {
        id: 'snap-123',
        description: 'Added task',
        operationType: 'add' as const,
        command: 'things3 add "Test"',
        createdAt: '2024-01-15T10:30:00Z',
        status: 'active' as const,
      };

      const output = formatSnapshotInfo(snapshot, { format: 'json', color: false, quiet: false });
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('snap-123');
    });
  });

  describe('formatItemList', () => {
    test('formats todo items', () => {
      const items: ThingsTodo[] = [
        {
          id: 'todo-1',
          type: 'to-do',
          title: 'First task',
          status: 'open',
          creationDate: '2024-01-01',
          modificationDate: '2024-01-01',
        },
        {
          id: 'todo-2',
          type: 'to-do',
          title: 'Second task',
          status: 'completed',
          creationDate: '2024-01-01',
          modificationDate: '2024-01-02',
        },
      ];

      const output = formatItemList(items, { format: 'text', color: false, quiet: false });
      expect(output).toContain('First task');
      expect(output).toContain('Second task');
    });

    test('formats project items', () => {
      const items: ThingsProject[] = [
        {
          id: 'proj-1',
          type: 'project',
          title: 'My Project',
          status: 'open',
          creationDate: '2024-01-01',
          modificationDate: '2024-01-01',
        },
      ];

      const output = formatItemList(items, { format: 'text', color: false, quiet: false });
      expect(output).toContain('My Project');
    });

    test('returns JSON array in json format', () => {
      const items: ThingsTodo[] = [
        {
          id: 'todo-1',
          type: 'to-do',
          title: 'Task',
          status: 'open',
          creationDate: '2024-01-01',
          modificationDate: '2024-01-01',
        },
      ];

      const output = formatItemList(items, { format: 'json', color: false, quiet: false });
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
    });

    test('shows empty message for no items', () => {
      const output = formatItemList([], { format: 'text', color: false, quiet: false });
      expect(output).toContain('No items');
    });
  });

  describe('stripAnsi', () => {
    test('removes ANSI escape codes', () => {
      const colored = '\x1b[32mSuccess\x1b[0m';
      expect(stripAnsi(colored)).toBe('Success');
    });

    test('handles string without ANSI codes', () => {
      expect(stripAnsi('plain text')).toBe('plain text');
    });
  });
});
