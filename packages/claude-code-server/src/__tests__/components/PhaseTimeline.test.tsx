// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PhaseTimeline } from '../../components/progress/PhaseTimeline';

describe('PhaseTimeline', () => {
  afterEach(() => { cleanup(); });

  it('renders all phases for create_app', () => {
    render(<PhaseTimeline taskType="create_app" currentPhase={1} progress={0} />);

    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(screen.getByText('Development')).toBeTruthy();
    expect(screen.getByText('Testing')).toBeTruthy();
  });

  it('renders modify_app phases', () => {
    render(<PhaseTimeline taskType="modify_app" currentPhase={1} progress={0} />);

    expect(screen.getByText('Analysis')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('Implementation')).toBeTruthy();
    expect(screen.getByText('Testing')).toBeTruthy();
  });

  it('renders single phase for custom', () => {
    render(<PhaseTimeline taskType="custom" currentPhase={1} progress={50} />);
    expect(screen.getByText('Execution')).toBeTruthy();
  });

  it('shows progress percentage', () => {
    render(<PhaseTimeline taskType="create_app" currentPhase={2} progress={50} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('shows 0% progress at start', () => {
    render(<PhaseTimeline taskType="create_app" currentPhase={null} progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows 100% progress when complete', () => {
    render(<PhaseTimeline taskType="create_app" currentPhase={4} progress={100} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders "Progress" heading', () => {
    render(<PhaseTimeline taskType="create_app" currentPhase={1} progress={25} />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('handles unknown task type gracefully', () => {
    render(<PhaseTimeline taskType="unknown_type" currentPhase={1} progress={0} />);
    expect(screen.getByText('Unknown')).toBeTruthy();
  });
});
