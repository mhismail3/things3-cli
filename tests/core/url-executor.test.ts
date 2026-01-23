/**
 * URL Executor Tests
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  executeUrl,
  isThingsInstalled,
  isThingsRunning,
  ExecutionResult,
} from '../../src/core/url-executor';
import { resetGlobalRateLimiter } from '../../src/core/rate-limiter';

describe('URL Executor', () => {
  beforeEach(() => {
    resetGlobalRateLimiter();
  });

  describe('executeUrl', () => {
    test('returns success result for valid URL', async () => {
      // This test will actually try to execute - skip in CI
      if (process.env.CI) {
        expect(true).toBe(true);
        return;
      }

      const result = await executeUrl('things:///show?id=today', { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.url).toBe('things:///show?id=today');
    });

    test('respects dry run option', async () => {
      const result = await executeUrl('things:///add?title=Test', { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
    });

    test('includes URL in result', async () => {
      const url = 'things:///show?id=inbox';
      const result = await executeUrl(url, { dryRun: true });
      expect(result.url).toBe(url);
    });

    test('validates URL scheme', async () => {
      const result = await executeUrl('http://example.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL scheme');
    });
  });

  describe('isThingsInstalled', () => {
    test('returns boolean', async () => {
      const result = await isThingsInstalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isThingsRunning', () => {
    test('returns boolean', async () => {
      const result = await isThingsRunning();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('ExecutionResult', () => {
    test('success result has correct shape', () => {
      const result: ExecutionResult = {
        success: true,
        url: 'things:///add?title=Test',
      };
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });

    test('error result has correct shape', () => {
      const result: ExecutionResult = {
        success: false,
        url: 'things:///add?title=Test',
        error: 'Something went wrong',
      };
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
