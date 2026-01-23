/**
 * URL Builder Tests
 * Following TDD: These tests define expected behavior BEFORE implementation
 */

import { describe, test, expect } from 'bun:test';
import {
  buildAddTodoUrl,
  buildAddProjectUrl,
  buildUpdateUrl,
  buildUpdateProjectUrl,
  buildShowUrl,
  buildSearchUrl,
  buildJsonUrl,
  buildCompleteUrl,
  buildCancelUrl,
  encodeThingsParam,
} from '../../src/core/url-builder';

describe('URL Builder', () => {
  describe('encodeThingsParam', () => {
    test('encodes special characters', () => {
      expect(encodeThingsParam('Hello World')).toBe('Hello%20World');
      expect(encodeThingsParam('Test & Test')).toBe('Test%20%26%20Test');
      expect(encodeThingsParam('Question?')).toBe('Question%3F');
    });

    test('handles empty string', () => {
      expect(encodeThingsParam('')).toBe('');
    });

    test('preserves alphanumeric characters', () => {
      expect(encodeThingsParam('abc123')).toBe('abc123');
    });

    test('encodes unicode characters', () => {
      const encoded = encodeThingsParam('Task: 日本語');
      expect(encoded).toContain('%');
    });
  });

  describe('buildAddTodoUrl', () => {
    test('builds minimal URL with title only', () => {
      const url = buildAddTodoUrl({ title: 'Test Task' });
      expect(url).toBe('things:///add?title=Test%20Task');
    });

    test('builds URL with all parameters', () => {
      const url = buildAddTodoUrl({
        title: 'Full Task',
        notes: 'Some notes',
        when: 'today',
        deadline: '2024-12-31',
        tags: ['tag1', 'tag2'],
        checklistItems: ['Item 1', 'Item 2'],
        list: 'Inbox',
        completed: false,
        revealOnAdd: true,
      });

      expect(url).toContain('things:///add?');
      expect(url).toContain('title=Full%20Task');
      expect(url).toContain('notes=Some%20notes');
      expect(url).toContain('when=today');
      expect(url).toContain('deadline=2024-12-31');
      expect(url).toContain('tags=tag1%2Ctag2');
      expect(url).toContain('checklist-items=Item%201%0AItem%202');
      expect(url).toContain('list=Inbox');
      expect(url).toContain('reveal=true');
    });

    test('handles tags as comma-separated string', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        tags: ['work', 'urgent', 'important'],
      });
      expect(url).toContain('tags=work%2Curgent%2Cimportant');
    });

    test('handles checklist items as newline-separated string', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        checklistItems: ['Step 1', 'Step 2', 'Step 3'],
      });
      expect(url).toContain('checklist-items=Step%201%0AStep%202%0AStep%203');
    });

    test('handles list ID parameter', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        listId: 'project-123',
      });
      expect(url).toContain('list-id=project-123');
    });

    test('handles heading parameter', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        heading: 'Planning',
      });
      expect(url).toContain('heading=Planning');
    });

    test('handles completed and canceled states', () => {
      const completedUrl = buildAddTodoUrl({
        title: 'Task',
        completed: true,
      });
      expect(completedUrl).toContain('completed=true');

      const canceledUrl = buildAddTodoUrl({
        title: 'Task',
        canceled: true,
      });
      expect(canceledUrl).toContain('canceled=true');
    });

    test('handles creation and completion dates', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        creationDate: '2024-01-01',
        completionDate: '2024-01-15',
      });
      expect(url).toContain('creation-date=2024-01-01');
      expect(url).toContain('completion-date=2024-01-15');
    });

    test('omits undefined/null parameters', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        notes: undefined,
        when: undefined,
      });
      expect(url).toBe('things:///add?title=Task');
    });
  });

  describe('buildAddProjectUrl', () => {
    test('builds minimal URL with title only', () => {
      const url = buildAddProjectUrl({ title: 'Test Project' });
      expect(url).toBe('things:///add-project?title=Test%20Project');
    });

    test('builds URL with all parameters', () => {
      const url = buildAddProjectUrl({
        title: 'Full Project',
        notes: 'Project notes',
        when: 'anytime',
        deadline: '2024-12-31',
        tags: ['project-tag'],
        area: 'Work',
        revealOnAdd: true,
      });

      expect(url).toContain('things:///add-project?');
      expect(url).toContain('title=Full%20Project');
      expect(url).toContain('notes=Project%20notes');
      expect(url).toContain('when=anytime');
      expect(url).toContain('deadline=2024-12-31');
      expect(url).toContain('tags=project-tag');
      expect(url).toContain('area=Work');
      expect(url).toContain('reveal=true');
    });

    test('handles area ID parameter', () => {
      const url = buildAddProjectUrl({
        title: 'Project',
        areaId: 'area-123',
      });
      expect(url).toContain('area-id=area-123');
    });

    test('handles todos array (for JSON command)', () => {
      const url = buildAddProjectUrl({
        title: 'Project',
        todos: [
          { title: 'Task 1' },
          { title: 'Task 2' },
        ],
      });
      expect(url).toContain('to-dos=');
    });
  });

  describe('buildUpdateUrl', () => {
    test('builds URL with auth token', () => {
      const url = buildUpdateUrl({
        id: 'todo-123',
        title: 'Updated Title',
      }, 'auth-token-xyz');

      expect(url).toContain('things:///update?');
      expect(url).toContain('auth-token=auth-token-xyz');
      expect(url).toContain('id=todo-123');
      expect(url).toContain('title=Updated%20Title');
    });

    test('builds URL with prepend and append notes', () => {
      const url = buildUpdateUrl({
        id: 'todo-123',
        prepend: 'Prefix: ',
        append: ' :Suffix',
      }, 'token');

      expect(url).toContain('prepend-notes=Prefix%3A%20');
      expect(url).toContain('append-notes=%20%3ASuffix');
    });

    test('builds URL with add tags', () => {
      const url = buildUpdateUrl({
        id: 'todo-123',
        addTags: ['new-tag-1', 'new-tag-2'],
      }, 'token');

      expect(url).toContain('add-tags=new-tag-1%2Cnew-tag-2');
    });

    test('builds URL with add checklist items', () => {
      const url = buildUpdateUrl({
        id: 'todo-123',
        addChecklistItems: ['New item 1', 'New item 2'],
      }, 'token');

      expect(url).toContain('add-checklist-items=New%20item%201%0ANew%20item%202');
    });

    test('handles completed and canceled status', () => {
      const completedUrl = buildUpdateUrl({
        id: 'todo-123',
        completed: true,
      }, 'token');
      expect(completedUrl).toContain('completed=true');

      const canceledUrl = buildUpdateUrl({
        id: 'todo-123',
        canceled: true,
      }, 'token');
      expect(canceledUrl).toContain('canceled=true');
    });

    test('handles reveal-on-update parameter', () => {
      const url = buildUpdateUrl({
        id: 'todo-123',
        revealOnUpdate: true,
      }, 'token');
      expect(url).toContain('reveal=true');
    });
  });

  describe('buildUpdateProjectUrl', () => {
    test('builds URL with auth token', () => {
      const url = buildUpdateProjectUrl({
        id: 'project-123',
        title: 'Updated Project',
      }, 'auth-token-xyz');

      expect(url).toContain('things:///update-project?');
      expect(url).toContain('auth-token=auth-token-xyz');
      expect(url).toContain('id=project-123');
      expect(url).toContain('title=Updated%20Project');
    });

    test('builds URL with area parameters', () => {
      const urlWithArea = buildUpdateProjectUrl({
        id: 'project-123',
        area: 'Personal',
      }, 'token');
      expect(urlWithArea).toContain('area=Personal');

      const urlWithAreaId = buildUpdateProjectUrl({
        id: 'project-123',
        areaId: 'area-456',
      }, 'token');
      expect(urlWithAreaId).toContain('area-id=area-456');
    });
  });

  describe('buildShowUrl', () => {
    test('builds URL for list', () => {
      const url = buildShowUrl({ id: 'today' });
      expect(url).toBe('things:///show?id=today');
    });

    test('builds URL for item ID', () => {
      const url = buildShowUrl({ id: 'item-uuid-123' });
      expect(url).toBe('things:///show?id=item-uuid-123');
    });

    test('builds URL with query', () => {
      const url = buildShowUrl({ query: 'search term' });
      expect(url).toBe('things:///show?query=search%20term');
    });

    test('builds URL with filter', () => {
      const url = buildShowUrl({ id: 'today', filter: 'work' });
      expect(url).toContain('id=today');
      expect(url).toContain('filter=work');
    });
  });

  describe('buildSearchUrl', () => {
    test('builds URL with query', () => {
      const url = buildSearchUrl({ query: 'find this' });
      expect(url).toBe('things:///search?query=find%20this');
    });

    test('handles special characters in query', () => {
      const url = buildSearchUrl({ query: 'test & "quoted"' });
      expect(url).toContain('query=');
      expect(url).toContain('%26');
      expect(url).toContain('%22');
    });
  });

  describe('buildJsonUrl', () => {
    test('builds URL with auth token and JSON data', () => {
      const data = [
        { type: 'to-do', attributes: { title: 'Task 1' } },
        { type: 'to-do', attributes: { title: 'Task 2' } },
      ];
      const url = buildJsonUrl({ data, authToken: 'token-123' });

      expect(url).toContain('things:///json?');
      expect(url).toContain('auth-token=token-123');
      expect(url).toContain('data=');
    });

    test('handles reveal-on-add parameter', () => {
      const url = buildJsonUrl({
        data: [{ type: 'to-do', attributes: { title: 'Task' } }],
        authToken: 'token',
        revealOnAdd: true,
      });
      expect(url).toContain('reveal=true');
    });

    test('properly encodes JSON data', () => {
      const data = [{ type: 'to-do', attributes: { title: 'Task with "quotes"' } }];
      const url = buildJsonUrl({ data, authToken: 'token' });

      // URL should be valid and contain encoded JSON
      expect(url).toContain('data=');
      // Should not contain raw special characters
      expect(url).not.toContain('"quotes"');
    });
  });

  describe('buildCompleteUrl', () => {
    test('builds complete URL for todo', () => {
      const url = buildCompleteUrl('todo-123', 'token-xyz');
      expect(url).toContain('things:///update?');
      expect(url).toContain('auth-token=token-xyz');
      expect(url).toContain('id=todo-123');
      expect(url).toContain('completed=true');
    });
  });

  describe('buildCancelUrl', () => {
    test('builds cancel URL for todo', () => {
      const url = buildCancelUrl('todo-123', 'token-xyz');
      expect(url).toContain('things:///update?');
      expect(url).toContain('auth-token=token-xyz');
      expect(url).toContain('id=todo-123');
      expect(url).toContain('canceled=true');
    });
  });

  describe('Special Character Handling', () => {
    test('handles URL-unsafe characters in title', () => {
      const url = buildAddTodoUrl({ title: 'Task: #1 & "Important" (50%)' });
      // Should be URL-encoded
      expect(url).not.toContain('#');
      expect(url).not.toContain('&Important');
      expect(url).not.toContain('"');
      expect(url).toContain('%');
    });

    test('handles newlines in notes', () => {
      const url = buildAddTodoUrl({
        title: 'Task',
        notes: 'Line 1\nLine 2\nLine 3',
      });
      expect(url).toContain('notes=Line%201%0ALine%202%0ALine%203');
    });

    test('handles emojis in title', () => {
      const url = buildAddTodoUrl({ title: '📝 Task with emoji' });
      expect(url).toContain('title=');
      // Should be valid URL
      expect(() => new URL(url)).not.toThrow();
    });
  });
});
