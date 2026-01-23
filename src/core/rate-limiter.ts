/**
 * Rate Limiter for Things URL scheme
 *
 * Things 3 enforces a limit of 250 URL scheme calls per 10 seconds.
 * This module helps track and enforce that limit.
 */

import { RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_MS } from '../config';

export class RateLimiter {
  private readonly maxCalls: number;
  private readonly windowMs: number;
  private calls: number[] = [];

  constructor(maxCalls = RATE_LIMIT_MAX_CALLS, windowMs = RATE_LIMIT_WINDOW_MS) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  /**
   * Clean up expired calls outside the current window
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.calls = this.calls.filter(timestamp => timestamp > windowStart);
  }

  /**
   * Check if we can make another call without exceeding the limit
   */
  canAcquire(): boolean {
    this.cleanup();
    return this.calls.length < this.maxCalls;
  }

  /**
   * Record a call. Throws if limit would be exceeded.
   */
  acquire(): void {
    this.cleanup();
    if (this.calls.length >= this.maxCalls) {
      throw new Error(
        `Rate limit exceeded: ${this.maxCalls} calls per ${this.windowMs / 1000} seconds. ` +
          `Wait ${Math.ceil(this.getWaitTime() / 1000)} seconds.`
      );
    }
    this.calls.push(Date.now());
  }

  /**
   * Get the number of milliseconds to wait before the next call is allowed.
   * Returns 0 if under the limit.
   */
  getWaitTime(): number {
    this.cleanup();
    if (this.calls.length < this.maxCalls) {
      return 0;
    }
    // Find the oldest call and calculate when it will expire
    const oldestCall = this.calls[0];
    if (!oldestCall) return 0;

    const waitUntil = oldestCall + this.windowMs;
    return Math.max(0, waitUntil - Date.now());
  }

  /**
   * Get current count of calls in the window
   */
  getCount(): number {
    this.cleanup();
    return this.calls.length;
  }

  /**
   * Get remaining capacity before hitting the limit
   */
  getRemainingCapacity(): number {
    this.cleanup();
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  /**
   * Reset the limiter (clear all recorded calls)
   */
  reset(): void {
    this.calls = [];
  }

  /**
   * Get the window size in milliseconds
   */
  getWindowMs(): number {
    return this.windowMs;
  }

  /**
   * Wait until a call can be made, then acquire
   */
  async acquireAsync(): Promise<void> {
    const waitTime = this.getWaitTime();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.acquire();
  }
}

// Singleton instance for shared rate limiting
let globalLimiter: RateLimiter | null = null;

export function getGlobalRateLimiter(): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = new RateLimiter();
  }
  return globalLimiter;
}

export function resetGlobalRateLimiter(): void {
  globalLimiter = null;
}
