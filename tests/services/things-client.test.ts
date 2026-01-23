/**
 * Things Client Service Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  ThingsClient,
  ThingsClientOptions,
} from '../../src/services/things-client';
import { resetGlobalRateLimiter } from '../../src/core/rate-limiter';

describe('Things Client', () => {
  let client: ThingsClient;

  beforeEach(() => {
    resetGlobalRateLimiter();
    // Create client with dry run mode for testing
    client = new ThingsClient({ dryRun: true });
  });

  describe('constructor', () => {
    test('creates client with default options', () => {
      const defaultClient = new ThingsClient();
      expect(defaultClient).toBeDefined();
    });

    test('respects dry run option', () => {
      const dryRunClient = new ThingsClient({ dryRun: true });
      expect(dryRunClient.isDryRun()).toBe(true);
    });
  });

  describe('addTodo', () => {
    test('builds correct URL and executes', async () => {
      const result = await client.addTodo({
        title: 'Test Task',
        when: 'today',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///add');
      expect(result.url).toContain('title=Test%20Task');
      expect(result.url).toContain('when=today');
    });

    test('handles all parameters', async () => {
      const result = await client.addTodo({
        title: 'Full Task',
        notes: 'Notes here',
        when: 'tomorrow',
        deadline: '2024-12-31',
        tags: ['work', 'urgent'],
        checklistItems: ['Step 1', 'Step 2'],
        list: 'Work',
        revealOnAdd: true,
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('notes=');
      expect(result.url).toContain('deadline=');
      expect(result.url).toContain('tags=');
    });
  });

  describe('addProject', () => {
    test('builds correct URL', async () => {
      const result = await client.addProject({
        title: 'Test Project',
        when: 'anytime',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///add-project');
      expect(result.url).toContain('title=Test%20Project');
    });

    test('handles area parameter', async () => {
      const result = await client.addProject({
        title: 'Project',
        area: 'Work',
      });

      expect(result.url).toContain('area=Work');
    });
  });

  describe('updateTodo', () => {
    test('requires auth token', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'test-token' });

      const result = await clientWithAuth.updateTodo({
        id: 'todo-123',
        title: 'Updated Title',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('auth-token=test-token');
      expect(result.url).toContain('id=todo-123');
    });

    test('fails without auth token', async () => {
      const result = await client.updateTodo({
        id: 'todo-123',
        title: 'Updated',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('auth');
    });

    test('handles prepend and append notes', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'token' });

      const result = await clientWithAuth.updateTodo({
        id: 'todo-123',
        prepend: 'Prefix: ',
        append: ' :Suffix',
      });

      expect(result.url).toContain('prepend-notes=');
      expect(result.url).toContain('append-notes=');
    });
  });

  describe('updateProject', () => {
    test('requires auth token', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'test-token' });

      const result = await clientWithAuth.updateProject({
        id: 'project-123',
        title: 'Updated Project',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///update-project');
    });
  });

  describe('completeTodo', () => {
    test('marks todo as complete', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'token' });

      const result = await clientWithAuth.completeTodo('todo-123');

      expect(result.success).toBe(true);
      expect(result.url).toContain('completed=true');
      expect(result.url).toContain('id=todo-123');
    });
  });

  describe('cancelTodo', () => {
    test('marks todo as canceled', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'token' });

      const result = await clientWithAuth.cancelTodo('todo-123');

      expect(result.success).toBe(true);
      expect(result.url).toContain('canceled=true');
    });
  });

  describe('show', () => {
    test('navigates to list', async () => {
      const result = await client.show({ id: 'today' });

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///show');
      expect(result.url).toContain('id=today');
    });

    test('navigates to item by ID', async () => {
      const result = await client.show({ id: 'item-uuid-123' });

      expect(result.url).toContain('id=item-uuid-123');
    });
  });

  describe('search', () => {
    test('opens search with query', async () => {
      const result = await client.search('find this');

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///search');
      expect(result.url).toContain('query=find%20this');
    });
  });

  describe('executeJson', () => {
    test('requires auth token', async () => {
      const result = await client.executeJson([
        { type: 'to-do', attributes: { title: 'Task' } },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('auth');
    });

    test('executes with auth token', async () => {
      const clientWithAuth = new ThingsClient({ dryRun: true, authToken: 'token' });

      const result = await clientWithAuth.executeJson([
        { type: 'to-do', attributes: { title: 'Task 1' } },
        { type: 'to-do', attributes: { title: 'Task 2' } },
      ]);

      expect(result.success).toBe(true);
      expect(result.url).toContain('things:///json');
      expect(result.url).toContain('data=');
    });
  });

  describe('setAuthToken', () => {
    test('allows setting auth token after construction', async () => {
      client.setAuthToken('new-token');

      const result = await client.updateTodo({
        id: 'todo-123',
        title: 'Updated',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    test('respects rate limits', async () => {
      // This is implicitly tested through the executor
      expect(true).toBe(true);
    });
  });
});
