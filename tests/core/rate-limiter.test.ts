/**
 * Rate Limiter Tests
 * Things URL scheme limit: 250 calls per 10 seconds
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RateLimiter } from '../../src/core/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe('canAcquire', () => {
    test('allows operations under limit', () => {
      expect(limiter.canAcquire()).toBe(true);
    });

    test('blocks when limit reached', () => {
      // Fill up the limiter
      for (let i = 0; i < 250; i++) {
        limiter.acquire();
      }
      expect(limiter.canAcquire()).toBe(false);
    });

    test('allows after some calls but not at limit', () => {
      for (let i = 0; i < 100; i++) {
        limiter.acquire();
      }
      expect(limiter.canAcquire()).toBe(true);
    });
  });

  describe('acquire', () => {
    test('increments count', () => {
      expect(limiter.getCount()).toBe(0);
      limiter.acquire();
      expect(limiter.getCount()).toBe(1);
    });

    test('throws when limit exceeded', () => {
      for (let i = 0; i < 250; i++) {
        limiter.acquire();
      }
      expect(() => limiter.acquire()).toThrow();
    });
  });

  describe('getWaitTime', () => {
    test('returns 0 when under limit', () => {
      expect(limiter.getWaitTime()).toBe(0);
    });

    test('returns positive value when at limit', () => {
      for (let i = 0; i < 250; i++) {
        limiter.acquire();
      }
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(10000); // Max 10 seconds
    });
  });

  describe('reset', () => {
    test('resets the counter', () => {
      for (let i = 0; i < 100; i++) {
        limiter.acquire();
      }
      expect(limiter.getCount()).toBe(100);
      limiter.reset();
      expect(limiter.getCount()).toBe(0);
    });
  });

  describe('getRemainingCapacity', () => {
    test('returns full capacity initially', () => {
      expect(limiter.getRemainingCapacity()).toBe(250);
    });

    test('decrements with each acquire', () => {
      limiter.acquire();
      expect(limiter.getRemainingCapacity()).toBe(249);

      for (let i = 0; i < 49; i++) {
        limiter.acquire();
      }
      expect(limiter.getRemainingCapacity()).toBe(200);
    });

    test('returns 0 at limit', () => {
      for (let i = 0; i < 250; i++) {
        limiter.acquire();
      }
      expect(limiter.getRemainingCapacity()).toBe(0);
    });
  });

  describe('window expiration', () => {
    test('resets after window expires', async () => {
      // Create limiter with short window for testing
      const shortLimiter = new RateLimiter(250, 100); // 100ms window

      for (let i = 0; i < 250; i++) {
        shortLimiter.acquire();
      }
      expect(shortLimiter.canAcquire()).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(shortLimiter.canAcquire()).toBe(true);
      expect(shortLimiter.getCount()).toBe(0);
    });
  });

  describe('custom limits', () => {
    test('respects custom max calls', () => {
      const customLimiter = new RateLimiter(10);

      for (let i = 0; i < 10; i++) {
        customLimiter.acquire();
      }
      expect(customLimiter.canAcquire()).toBe(false);
    });

    test('respects custom window', () => {
      const customLimiter = new RateLimiter(250, 5000);
      expect(customLimiter.getWindowMs()).toBe(5000);
    });
  });
});
