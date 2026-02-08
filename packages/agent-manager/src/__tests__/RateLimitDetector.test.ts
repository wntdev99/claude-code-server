import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimitDetector } from '../RateLimitDetector.js';

describe('RateLimitDetector', () => {
  let detector: RateLimitDetector;

  beforeEach(() => {
    detector = new RateLimitDetector(5000); // 5s default cooldown for tests
  });

  afterEach(() => {
    detector.cancelAll();
  });

  describe('detect', () => {
    it('returns null for normal output', () => {
      expect(detector.detect('File created successfully')).toBeNull();
      expect(detector.detect('Running tests...')).toBeNull();
    });

    it('detects rate_limit_error', () => {
      const result = detector.detect('Error: rate_limit_error - Too many requests');
      expect(result).toBeTruthy();
      expect(result!.detected).toBe(true);
    });

    it('detects 429 status code', () => {
      const result = detector.detect('HTTP Error 429: Too Many Requests');
      expect(result).toBeTruthy();
      expect(result!.detected).toBe(true);
    });

    it('detects "too many requests"', () => {
      const result = detector.detect('Error: too many requests, please slow down');
      expect(result).toBeTruthy();
    });

    it('detects overloaded_error', () => {
      const result = detector.detect('overloaded_error: service is busy');
      expect(result).toBeTruthy();
    });

    it('detects quota_exceeded', () => {
      const result = detector.detect('Error: quota_exceeded - monthly limit reached');
      expect(result).toBeTruthy();
      expect(result!.detected).toBe(true);
    });

    it('detects capacity exceeded', () => {
      const result = detector.detect('capacity exceeded, please try again later');
      expect(result).toBeTruthy();
      expect(result!.detected).toBe(true);
    });

    it('extracts reset timestamp from output', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120;
      const result = detector.detect(`rate_limit_error, reset at ${futureTimestamp}`);
      expect(result).toBeTruthy();
      expect(result!.resetAt).toBeTruthy();
      // Reset should be roughly 2 minutes from now
      const diff = result!.resetAt!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(100_000);
      expect(diff).toBeLessThan(130_000);
    });

    it('extracts retry-after seconds', () => {
      const result = detector.detect('rate_limit_error. retry_after: 60');
      expect(result).toBeTruthy();
      expect(result!.resetAt).toBeTruthy();
      const diff = result!.resetAt!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(50_000);
      expect(diff).toBeLessThan(70_000);
    });

    it('returns null resetAt when no timing info', () => {
      const result = detector.detect('rate_limit_error');
      expect(result).toBeTruthy();
      expect(result!.resetAt).toBeNull();
    });
  });

  describe('handle', () => {
    it('calls onPause and emits rate_limit:detected', () => {
      const paused = vi.fn();
      const resumed = vi.fn();
      const events: unknown[] = [];
      detector.on('rate_limit:detected', (e) => events.push(e));

      const info = { detected: true, resetAt: null };
      const delay = detector.handle('task-1', info, paused, resumed);

      expect(paused).toHaveBeenCalledOnce();
      expect(events).toHaveLength(1);
      expect(delay).toBe(5000); // Default cooldown
    });

    it('uses reset time for delay calculation', () => {
      const paused = vi.fn();
      const resumed = vi.fn();
      const resetAt = new Date(Date.now() + 30_000);
      const info = { detected: true, resetAt };
      const delay = detector.handle('task-1', info, paused, resumed);

      expect(delay).toBeGreaterThan(28_000);
      expect(delay).toBeLessThanOrEqual(30_000);
    });

    it('schedules auto-resume after delay', async () => {
      const paused = vi.fn();
      const resumed = vi.fn();
      const events: unknown[] = [];
      detector.on('rate_limit:resumed', (e) => events.push(e));

      // Use very short delay for test - set resetAt to just 1ms in future
      // which will be clamped to minimum 1000ms by handle()
      const resetAt = new Date(Date.now() + 1);
      const info = { detected: true, resetAt };
      const delay = detector.handle('task-1', info, paused, resumed);

      // delay should be at least 1000ms (minimum clamp)
      expect(delay).toBeGreaterThanOrEqual(1000);

      // Wait for resume (delay + buffer)
      await new Promise((r) => setTimeout(r, delay + 500));
      expect(resumed).toHaveBeenCalledOnce();
      expect(events).toHaveLength(1);
    }, 10000);

    it('cancels previous timer on re-handle', () => {
      const paused = vi.fn();
      const resumed = vi.fn();
      const info = { detected: true, resetAt: null };

      detector.handle('task-1', info, paused, resumed);
      detector.handle('task-1', info, paused, resumed); // Should cancel previous

      expect(paused).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelResume', () => {
    it('cancels a pending resume', async () => {
      const paused = vi.fn();
      const resumed = vi.fn();
      const resetAt = new Date(Date.now() + 100);
      const info = { detected: true, resetAt };

      detector.handle('task-1', info, paused, resumed);
      detector.cancelResume('task-1');

      await new Promise((r) => setTimeout(r, 200));
      expect(resumed).not.toHaveBeenCalled();
    });
  });
});
