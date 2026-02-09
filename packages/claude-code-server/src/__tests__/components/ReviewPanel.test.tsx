// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ReviewPanel } from '../../components/review/ReviewPanel';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock fetch for ReviewActions
vi.stubGlobal('fetch', vi.fn());

const makeReview = (overrides: Record<string, unknown> = {}) => ({
  id: 'rev-1',
  taskId: 'task-1',
  phase: 1,
  status: 'pending',
  deliverables: JSON.stringify([
    { path: 'docs/planning/01_idea.md', content: 'Idea content here', size: 500 },
    { path: 'docs/planning/02_market.md', content: 'Market analysis', size: 600 },
  ]),
  feedback: null,
  createdAt: '2024-01-01',
  ...overrides,
});

describe('ReviewPanel', () => {
  afterEach(() => { cleanup(); });

  it('renders phase number and status', () => {
    render(<ReviewPanel review={makeReview()} />);
    expect(screen.getByText('Phase 1 Review')).toBeTruthy();
    expect(screen.getByText('pending')).toBeTruthy();
  });

  it('renders file count', () => {
    render(<ReviewPanel review={makeReview()} />);
    expect(screen.getByText('2 files')).toBeTruthy();
  });

  it('renders singular "file" for single deliverable', () => {
    const review = makeReview({
      deliverables: JSON.stringify([{ path: 'doc.md', content: 'x', size: 1 }]),
    });
    render(<ReviewPanel review={review} />);
    expect(screen.getByText('1 file')).toBeTruthy();
  });

  it('renders status badge for approved', () => {
    render(<ReviewPanel review={makeReview({ status: 'approved' })} />);
    expect(screen.getByText('approved')).toBeTruthy();
  });

  it('renders status with underscore replaced for changes_requested', () => {
    render(<ReviewPanel review={makeReview({ status: 'changes_requested' })} />);
    expect(screen.getByText('changes requested')).toBeTruthy();
  });

  it('renders feedback when present', () => {
    render(
      <ReviewPanel
        review={makeReview({
          status: 'changes_requested',
          feedback: 'Please add more detail to section 3',
        })}
      />
    );
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByText('Please add more detail to section 3')).toBeTruthy();
  });

  it('does not render feedback section when null', () => {
    render(<ReviewPanel review={makeReview({ feedback: null })} />);
    expect(screen.queryByText('Feedback')).toBeNull();
  });

  it('renders action buttons for pending status', () => {
    render(<ReviewPanel review={makeReview({ status: 'pending' })} />);
    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.getByText('Request Changes')).toBeTruthy();
  });

  it('does not render action buttons for approved status', () => {
    render(<ReviewPanel review={makeReview({ status: 'approved' })} />);
    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('handles invalid JSON deliverables gracefully', () => {
    const review = makeReview({ deliverables: 'NOT VALID JSON' });
    render(<ReviewPanel review={review} />);
    expect(screen.getByText('0 files')).toBeTruthy();
  });

  it('handles empty deliverables', () => {
    const review = makeReview({ deliverables: '[]' });
    render(<ReviewPanel review={review} />);
    expect(screen.getByText('0 files')).toBeTruthy();
  });
});
