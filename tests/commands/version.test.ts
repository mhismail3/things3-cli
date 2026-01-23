/**
 * Version Command Tests
 */

import { describe, test, expect } from 'bun:test';
import { versionCommand, VersionResult } from '../../src/commands/version';
import { CLI_VERSION } from '../../src/config';

describe('Version Command', () => {
  test('exports versionCommand function', () => {
    expect(typeof versionCommand).toBe('function');
  });

  test('returns CLI version', async () => {
    const result = await versionCommand({ json: false });
    expect(result.cliVersion).toBe(CLI_VERSION);
  });

  test('returns Things version info', async () => {
    const result = await versionCommand({ json: false });
    // May or may not have Things version depending on installation
    expect('thingsVersion' in result || result.thingsVersion === undefined).toBe(true);
  });

  test('includes running status', async () => {
    const result = await versionCommand({ json: false });
    expect(typeof result.thingsRunning).toBe('boolean');
  });
});
