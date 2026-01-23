/**
 * Show Command Tests
 */

import { describe, test, expect } from 'bun:test';
import { showCommand, ShowOptions } from '../../src/commands/show';

describe('Show Command', () => {
  test('exports showCommand function', () => {
    expect(typeof showCommand).toBe('function');
  });

  test('accepts list ID option', async () => {
    const options: ShowOptions = {
      dryRun: true,
      json: false,
    };

    const result = await showCommand('today', options);
    expect(result.success).toBe(true);
    expect(result.url).toContain('id=today');
  });

  test('accepts item ID', async () => {
    const result = await showCommand('item-uuid-123', { dryRun: true, json: false });
    expect(result.success).toBe(true);
    expect(result.url).toContain('id=item-uuid-123');
  });

  test('accepts filter option', async () => {
    const result = await showCommand('today', { dryRun: true, json: false, filter: 'work' });
    expect(result.url).toContain('filter=work');
  });

  test('returns JSON result when json option set', async () => {
    const result = await showCommand('today', { dryRun: true, json: true });
    expect(result.success).toBe(true);
  });
});
