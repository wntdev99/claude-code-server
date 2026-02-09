// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { TokenUsageCard } from '../../components/progress/TokenUsageCard';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('TokenUsageCard', () => {
  afterEach(() => { cleanup(); });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no usage data', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });

    const { container } = render(<TokenUsageCard taskId="task-1" active={false} />);

    // Wait for fetch to resolve
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Should render null (empty) since no tokenUsage data
    expect(container.innerHTML).toBe('');
  });

  it('renders token usage when data is available', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            tokenUsage: {
              taskId: 'task-1',
              inputTokens: 5000,
              outputTokens: 2000,
              totalTokens: 7000,
              estimatedCost: 0.0035,
            },
          },
        }),
    });

    render(<TokenUsageCard taskId="task-1" active={false} />);

    await waitFor(() => {
      expect(screen.getByText('Token Usage')).toBeTruthy();
    });

    expect(screen.getByText('5.0K')).toBeTruthy();
    expect(screen.getByText('2.0K')).toBeTruthy();
    expect(screen.getByText('7.0K')).toBeTruthy();
    expect(screen.getByText('$0.0035')).toBeTruthy();
  });

  it('formats large token counts with M suffix', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            tokenUsage: {
              taskId: 'task-1',
              inputTokens: 1500000,
              outputTokens: 500000,
              totalTokens: 2000000,
              estimatedCost: 1.5,
            },
          },
        }),
    });

    render(<TokenUsageCard taskId="task-1" active={false} />);

    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeTruthy();
    });

    expect(screen.getByText('2.0M')).toBeTruthy();
    expect(screen.getByText('$1.5000')).toBeTruthy();
  });

  it('shows labels for all fields', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            tokenUsage: {
              taskId: 'task-1',
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
              estimatedCost: 0.0001,
            },
          },
        }),
    });

    render(<TokenUsageCard taskId="task-1" active={false} />);

    await waitFor(() => {
      expect(screen.getByText('Input')).toBeTruthy();
    });

    expect(screen.getByText('Output')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Est. Cost')).toBeTruthy();
  });

  it('fetches from correct API endpoint', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });

    render(<TokenUsageCard taskId="my-task-123" active={false} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/my-task-123/status');
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { container } = render(<TokenUsageCard taskId="task-1" active={false} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Should still render empty (no crash)
    expect(container.innerHTML).toBe('');
  });
});
