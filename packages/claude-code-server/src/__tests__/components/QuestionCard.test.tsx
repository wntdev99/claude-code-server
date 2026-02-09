// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QuestionCard } from '../../components/question/QuestionCard';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock fetch for QuestionForm
vi.stubGlobal('fetch', vi.fn());

const makeQuestion = (overrides: Record<string, unknown> = {}) => ({
  id: 'q-1',
  taskId: 'task-1',
  category: 'choice',
  question: 'Which database should we use?',
  options: JSON.stringify(['PostgreSQL', 'MySQL', 'SQLite']),
  answer: null,
  answeredAt: null,
  createdAt: '2024-01-01',
  ...overrides,
});

describe('QuestionCard', () => {
  afterEach(() => { cleanup(); });

  it('renders question text', () => {
    render(<QuestionCard question={makeQuestion()} />);
    expect(screen.getByText('Which database should we use?')).toBeTruthy();
  });

  it('shows Pending badge when unanswered', () => {
    render(<QuestionCard question={makeQuestion()} />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('shows Answered badge when answered', () => {
    render(
      <QuestionCard
        question={makeQuestion({ answer: 'PostgreSQL', answeredAt: '2024-01-01' })}
      />
    );
    expect(screen.getByText('Answered')).toBeTruthy();
  });

  it('displays the answer text when answered', () => {
    render(
      <QuestionCard
        question={makeQuestion({ answer: 'PostgreSQL', answeredAt: '2024-01-01' })}
      />
    );
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Answer')).toBeTruthy();
  });

  it('renders category badge for choice', () => {
    render(<QuestionCard question={makeQuestion({ category: 'choice' })} />);
    expect(screen.getByText('Choice')).toBeTruthy();
  });

  it('renders category badge for business', () => {
    render(<QuestionCard question={makeQuestion({ category: 'business' })} />);
    expect(screen.getByText('Business')).toBeTruthy();
  });

  it('renders category badge for confirmation', () => {
    render(<QuestionCard question={makeQuestion({ category: 'confirmation' })} />);
    expect(screen.getByText('Confirmation')).toBeTruthy();
  });

  it('renders category badge for clarification', () => {
    render(<QuestionCard question={makeQuestion({ category: 'clarification' })} />);
    expect(screen.getByText('Clarification')).toBeTruthy();
  });

  it('shows radio options for choice category when unanswered', () => {
    render(<QuestionCard question={makeQuestion()} />);
    // Options are rendered as radio labels
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('MySQL')).toBeTruthy();
    expect(screen.getByText('SQLite')).toBeTruthy();
  });

  it('shows Yes/No buttons for confirmation category when unanswered', () => {
    render(
      <QuestionCard
        question={makeQuestion({
          category: 'confirmation',
          question: 'Are you sure?',
          options: '[]',
        })}
      />
    );
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('shows textarea for business category when unanswered', () => {
    render(
      <QuestionCard
        question={makeQuestion({
          category: 'business',
          question: 'Describe your revenue model',
          options: '[]',
        })}
      />
    );
    const textarea = screen.getByPlaceholderText('Type your answer...');
    expect(textarea).toBeTruthy();
  });

  it('shows Submit Answer button when unanswered', () => {
    render(<QuestionCard question={makeQuestion()} />);
    expect(screen.getByText('Submit Answer')).toBeTruthy();
  });

  it('does not show Submit Answer button when answered', () => {
    render(
      <QuestionCard
        question={makeQuestion({ answer: 'PostgreSQL', answeredAt: '2024-01-01' })}
      />
    );
    expect(screen.queryByText('Submit Answer')).toBeNull();
  });
});
