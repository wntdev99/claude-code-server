import type { AgentState } from '@claude-code-server/shared';

/**
 * Agent state transitions (from docs/STATE_MACHINE.md):
 *
 * idle -> running          (execute)
 * running -> waiting_review (phase complete)
 * running -> paused         (rate limit, manual pause)
 * running -> completed      (task done)
 * running -> failed         (fatal error)
 * waiting_review -> running (review approved)
 * waiting_review -> paused  (manual pause)
 * paused -> running         (resume)
 * paused -> failed          (cancel)
 */

type Transition = {
  from: AgentState;
  to: AgentState;
  action: string;
};

const VALID_TRANSITIONS: Transition[] = [
  { from: 'idle', to: 'running', action: 'execute' },
  { from: 'running', to: 'waiting_review', action: 'phase_complete' },
  { from: 'running', to: 'paused', action: 'pause' },
  { from: 'running', to: 'completed', action: 'complete' },
  { from: 'running', to: 'failed', action: 'fail' },
  { from: 'waiting_review', to: 'running', action: 'approve' },
  { from: 'waiting_review', to: 'running', action: 'rework' },
  { from: 'waiting_review', to: 'paused', action: 'pause' },
  { from: 'paused', to: 'running', action: 'resume' },
  { from: 'paused', to: 'failed', action: 'cancel' },
];

export class StateMachine {
  private _state: AgentState = 'idle';
  private readonly listeners: Array<
    (from: AgentState, to: AgentState, action: string) => void
  > = [];

  get state(): AgentState {
    return this._state;
  }

  canTransition(action: string): boolean {
    return VALID_TRANSITIONS.some(
      (t) => t.from === this._state && t.action === action
    );
  }

  transition(action: string): AgentState {
    const t = VALID_TRANSITIONS.find(
      (t) => t.from === this._state && t.action === action
    );

    if (!t) {
      throw new Error(
        `Invalid state transition: ${this._state} -> ? (action: ${action}). ` +
          `Valid actions from ${this._state}: ${this.validActions().join(', ')}`
      );
    }

    const from = this._state;
    this._state = t.to;

    for (const listener of this.listeners) {
      listener(from, t.to, action);
    }

    return this._state;
  }

  validActions(): string[] {
    return VALID_TRANSITIONS.filter((t) => t.from === this._state).map(
      (t) => t.action
    );
  }

  onTransition(
    listener: (from: AgentState, to: AgentState, action: string) => void
  ): void {
    this.listeners.push(listener);
  }

  reset(): void {
    this._state = 'idle';
  }
}
