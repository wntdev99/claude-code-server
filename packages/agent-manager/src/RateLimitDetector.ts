import { EventEmitter } from 'node:events';
import { DEFAULT_RATE_LIMIT_COOLDOWN_MS } from '@claude-code-server/shared';
import type { RateLimitInfo } from '@claude-code-server/shared';

// Common rate limit error patterns from Claude API
const RATE_LIMIT_PATTERNS = [
  /rate_limit_error/i,
  /429/,
  /too many requests/i,
  /rate limit exceeded/i,
  /overloaded_error/i,
];

// Pattern to extract reset time (Unix timestamp or seconds)
const RESET_TIME_PATTERN = /(?:reset|retry)[_\s-]*(?:at|after|in)\s*:?\s*(\d+)/i;
const RETRY_AFTER_PATTERN = /retry[_-]?after\s*:?\s*(\d+)/i;

/**
 * RateLimitDetector - Detects and handles rate limit errors from agent output.
 *
 * Events emitted:
 *   'rate_limit:detected' ({ taskId, info: RateLimitInfo })
 *   'rate_limit:resumed'  ({ taskId })
 */
export class RateLimitDetector extends EventEmitter {
  private resumeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly defaultCooldownMs: number;

  constructor(defaultCooldownMs: number = DEFAULT_RATE_LIMIT_COOLDOWN_MS) {
    super();
    this.defaultCooldownMs = defaultCooldownMs;
  }

  /**
   * Check if a string contains rate limit indicators.
   */
  detect(output: string): RateLimitInfo | null {
    const isRateLimited = RATE_LIMIT_PATTERNS.some((p) => p.test(output));
    if (!isRateLimited) {
      return null;
    }

    let resetAt: Date | null = null;

    // Try to extract reset timestamp
    const resetMatch = output.match(RESET_TIME_PATTERN);
    if (resetMatch) {
      const value = parseInt(resetMatch[1], 10);
      // If value is large, it's a Unix timestamp; otherwise seconds from now
      if (value > 1_000_000_000) {
        resetAt = new Date(value * 1000);
      } else {
        resetAt = new Date(Date.now() + value * 1000);
      }
    }

    // Also check retry-after header pattern
    if (!resetAt) {
      const retryMatch = output.match(RETRY_AFTER_PATTERN);
      if (retryMatch) {
        const seconds = parseInt(retryMatch[1], 10);
        resetAt = new Date(Date.now() + seconds * 1000);
      }
    }

    return { detected: true, resetAt };
  }

  /**
   * Handle a detected rate limit: emit event and schedule auto-resume.
   * Returns the delay in milliseconds until resume.
   */
  handle(
    taskId: string,
    info: RateLimitInfo,
    onPause: () => void,
    onResume: () => void
  ): number {
    // Cancel any existing resume timer
    this.cancelResume(taskId);

    // Pause the agent
    onPause();
    this.emit('rate_limit:detected', { taskId, info });

    // Calculate delay
    let delayMs: number;
    if (info.resetAt) {
      delayMs = Math.max(info.resetAt.getTime() - Date.now(), 1000);
    } else {
      delayMs = this.defaultCooldownMs;
    }

    // Schedule auto-resume
    const timer = setTimeout(() => {
      this.resumeTimers.delete(taskId);
      onResume();
      this.emit('rate_limit:resumed', { taskId });
    }, delayMs);

    this.resumeTimers.set(taskId, timer);
    return delayMs;
  }

  /**
   * Cancel a pending resume for a task.
   */
  cancelResume(taskId: string): void {
    const timer = this.resumeTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.resumeTimers.delete(taskId);
    }
  }

  /**
   * Cancel all pending resumes.
   */
  cancelAll(): void {
    for (const [taskId] of this.resumeTimers) {
      this.cancelResume(taskId);
    }
  }
}
