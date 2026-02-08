import { EventEmitter } from 'node:events';
import type { TokenUsage } from '@claude-code-server/shared';

// Approximate token costs per model (USD per 1M tokens)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
};

const DEFAULT_COST = { input: 3.0, output: 15.0 }; // Default to Sonnet pricing

// Patterns to detect token usage from Claude CLI output
const TOKEN_USAGE_PATTERN = /tokens?\s*[:=]\s*(\d+)\s*input\s*[,/]\s*(\d+)\s*output/i;
const USAGE_SUMMARY_PATTERN = /usage.*?(\d+)\s*input.*?(\d+)\s*output/i;

/**
 * TokenTracker - Tracks token usage per task.
 *
 * Events emitted:
 *   'usage:update' ({ taskId, usage: TokenUsage })
 */
export class TokenTracker extends EventEmitter {
  private usageMap = new Map<string, TokenUsage>();
  private model: string;

  constructor(model: string = 'claude-sonnet-4-5') {
    super();
    this.model = model;
  }

  /**
   * Process a log line to extract token usage information.
   */
  processOutput(taskId: string, output: string): void {
    const match = output.match(TOKEN_USAGE_PATTERN) || output.match(USAGE_SUMMARY_PATTERN);
    if (!match) return;

    const inputTokens = parseInt(match[1], 10);
    const outputTokens = parseInt(match[2], 10);

    if (isNaN(inputTokens) || isNaN(outputTokens)) return;

    this.addUsage(taskId, inputTokens, outputTokens);
  }

  /**
   * Manually add token usage for a task.
   */
  addUsage(taskId: string, inputTokens: number, outputTokens: number): void {
    const existing = this.usageMap.get(taskId) ?? {
      taskId,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };

    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.totalTokens = existing.inputTokens + existing.outputTokens;
    existing.estimatedCost = this.calculateCost(existing.inputTokens, existing.outputTokens);

    this.usageMap.set(taskId, existing);
    this.emit('usage:update', { taskId, usage: existing });
  }

  /**
   * Get current token usage for a task.
   */
  getUsage(taskId: string): TokenUsage | null {
    return this.usageMap.get(taskId) ?? null;
  }

  /**
   * Clear usage data for a task.
   */
  clearUsage(taskId: string): void {
    this.usageMap.delete(taskId);
  }

  /**
   * Set the model for cost estimation.
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Calculate estimated cost in USD.
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const costs = TOKEN_COSTS[this.model] ?? DEFAULT_COST;
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimals
  }
}
