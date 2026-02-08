import { describe, it, expect, beforeEach } from 'vitest';
import { TokenTracker } from '../TokenTracker.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker('claude-sonnet-4-5');
  });

  describe('processOutput', () => {
    it('extracts token usage from output', () => {
      tracker.processOutput('task-1', 'tokens: 1000 input, 500 output');
      const usage = tracker.getUsage('task-1');
      expect(usage).toBeTruthy();
      expect(usage!.inputTokens).toBe(1000);
      expect(usage!.outputTokens).toBe(500);
      expect(usage!.totalTokens).toBe(1500);
    });

    it('ignores output without token information', () => {
      tracker.processOutput('task-1', 'File created successfully');
      expect(tracker.getUsage('task-1')).toBeNull();
    });

    it('accumulates usage across multiple outputs', () => {
      tracker.processOutput('task-1', 'tokens: 1000 input, 500 output');
      tracker.processOutput('task-1', 'tokens: 2000 input, 1000 output');
      const usage = tracker.getUsage('task-1');
      expect(usage!.inputTokens).toBe(3000);
      expect(usage!.outputTokens).toBe(1500);
      expect(usage!.totalTokens).toBe(4500);
    });

    it('parses usage summary format', () => {
      tracker.processOutput('task-1', 'usage: 500 input tokens / 200 output tokens');
      const usage = tracker.getUsage('task-1');
      expect(usage!.inputTokens).toBe(500);
      expect(usage!.outputTokens).toBe(200);
    });
  });

  describe('addUsage', () => {
    it('manually adds token usage', () => {
      tracker.addUsage('task-1', 5000, 2000);
      const usage = tracker.getUsage('task-1');
      expect(usage!.inputTokens).toBe(5000);
      expect(usage!.outputTokens).toBe(2000);
      expect(usage!.totalTokens).toBe(7000);
    });

    it('calculates cost for sonnet model', () => {
      tracker.addUsage('task-1', 1_000_000, 1_000_000);
      const usage = tracker.getUsage('task-1');
      // Sonnet: $3/M input + $15/M output = $18 total
      expect(usage!.estimatedCost).toBe(18);
    });

    it('emits usage:update event', () => {
      const events: unknown[] = [];
      tracker.on('usage:update', (e) => events.push(e));

      tracker.addUsage('task-1', 1000, 500);
      expect(events).toHaveLength(1);
    });
  });

  describe('clearUsage', () => {
    it('removes usage data for a task', () => {
      tracker.addUsage('task-1', 1000, 500);
      tracker.clearUsage('task-1');
      expect(tracker.getUsage('task-1')).toBeNull();
    });
  });

  describe('setModel', () => {
    it('changes cost calculation model', () => {
      tracker.setModel('claude-opus-4-6');
      tracker.addUsage('task-1', 1_000_000, 1_000_000);
      const usage = tracker.getUsage('task-1');
      // Opus: $15/M input + $75/M output = $90 total
      expect(usage!.estimatedCost).toBe(90);
    });
  });
});
