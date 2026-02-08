import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../StateMachine.js';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine();
  });

  it('starts in idle state', () => {
    expect(sm.state).toBe('idle');
  });

  it('transitions idle -> running on execute', () => {
    sm.transition('execute');
    expect(sm.state).toBe('running');
  });

  it('transitions running -> waiting_review on phase_complete', () => {
    sm.transition('execute');
    sm.transition('phase_complete');
    expect(sm.state).toBe('waiting_review');
  });

  it('transitions running -> paused on pause', () => {
    sm.transition('execute');
    sm.transition('pause');
    expect(sm.state).toBe('paused');
  });

  it('transitions paused -> running on resume', () => {
    sm.transition('execute');
    sm.transition('pause');
    sm.transition('resume');
    expect(sm.state).toBe('running');
  });

  it('transitions running -> completed on complete', () => {
    sm.transition('execute');
    sm.transition('complete');
    expect(sm.state).toBe('completed');
  });

  it('transitions running -> failed on fail', () => {
    sm.transition('execute');
    sm.transition('fail');
    expect(sm.state).toBe('failed');
  });

  it('transitions waiting_review -> running on approve', () => {
    sm.transition('execute');
    sm.transition('phase_complete');
    sm.transition('approve');
    expect(sm.state).toBe('running');
  });

  it('transitions waiting_review -> running on rework', () => {
    sm.transition('execute');
    sm.transition('phase_complete');
    sm.transition('rework');
    expect(sm.state).toBe('running');
  });

  it('transitions paused -> failed on cancel', () => {
    sm.transition('execute');
    sm.transition('pause');
    sm.transition('cancel');
    expect(sm.state).toBe('failed');
  });

  it('throws on invalid transition', () => {
    expect(() => sm.transition('pause')).toThrow('Invalid state transition');
  });

  it('reports valid actions', () => {
    expect(sm.validActions()).toEqual(['execute']);
    sm.transition('execute');
    expect(sm.validActions()).toContain('phase_complete');
    expect(sm.validActions()).toContain('pause');
    expect(sm.validActions()).toContain('complete');
    expect(sm.validActions()).toContain('fail');
  });

  it('fires transition listeners', () => {
    const transitions: string[] = [];
    sm.onTransition((from, to, action) => {
      transitions.push(`${from}->${to}:${action}`);
    });

    sm.transition('execute');
    sm.transition('pause');

    expect(transitions).toEqual([
      'idle->running:execute',
      'running->paused:pause',
    ]);
  });

  it('canTransition returns correct values', () => {
    expect(sm.canTransition('execute')).toBe(true);
    expect(sm.canTransition('pause')).toBe(false);
  });

  it('reset returns to idle', () => {
    sm.transition('execute');
    sm.reset();
    expect(sm.state).toBe('idle');
  });
});
