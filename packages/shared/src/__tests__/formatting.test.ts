import { describe, it, expect } from 'vitest';
import { formatTokens, formatCost, formatDuration, formatProgress, formatFileSize } from '../utils/formatting.js';

describe('formatTokens', () => {
  it('formats small numbers as-is', () => {
    expect(formatTokens(500)).toBe('500');
  });

  it('formats thousands with K suffix', () => {
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(10000)).toBe('10.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1500000)).toBe('1.5M');
  });
});

describe('formatCost', () => {
  it('formats cost with 4 decimal places', () => {
    expect(formatCost(0.0123)).toBe('$0.0123');
    expect(formatCost(1.5)).toBe('$1.5000');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });

  it('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
    expect(formatDuration(5400000)).toBe('1h 30m');
  });
});

describe('formatProgress', () => {
  it('formats progress percentage', () => {
    expect(formatProgress(50)).toBe('50%');
  });

  it('clamps to 0-100', () => {
    expect(formatProgress(-10)).toBe('0%');
    expect(formatProgress(150)).toBe('100%');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1572864)).toBe('1.5MB');
  });
});
