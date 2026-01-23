/**
 * Search Command Tests
 */

import { describe, test, expect } from 'bun:test';
import { searchCommand, SearchOptions } from '../../src/commands/search';

describe('Search Command', () => {
  test('exports searchCommand function', () => {
    expect(typeof searchCommand).toBe('function');
  });

  test('opens search with query', async () => {
    const options: SearchOptions = {
      dryRun: true,
      json: false,
    };

    const result = await searchCommand('find this', options);
    expect(result.success).toBe(true);
    expect(result.url).toContain('search');
    expect(result.url).toContain('query=find%20this');
  });

  test('handles special characters in query', async () => {
    const result = await searchCommand('test & "quoted"', { dryRun: true, json: false });
    expect(result.success).toBe(true);
  });
});
