import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSSEStore } from '../../lib/store/sseStore.js';

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    // Store reference for test access
    MockEventSource.instances.push(this);
  }

  static instances: MockEventSource[] = [];

  // Test helper: simulate open
  simulateOpen() {
    this.onopen?.(new Event('open'));
  }

  // Test helper: simulate message
  simulateMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  // Test helper: simulate error
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

vi.stubGlobal('EventSource', MockEventSource);

describe('sseStore', () => {
  beforeEach(() => {
    useSSEStore.getState().disconnectAll();
    useSSEStore.setState({
      connections: new Map(),
      logs: new Map(),
      connected: new Map(),
      onStateChange: null,
      onComplete: null,
    });
    MockEventSource.instances = [];
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('creates EventSource for task', () => {
      useSSEStore.getState().connect('task-1');

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0].url).toBe('/api/tasks/task-1/stream');
    });

    it('sets connected to true on open', () => {
      useSSEStore.getState().connect('task-1');
      MockEventSource.instances[0].simulateOpen();

      expect(useSSEStore.getState().isConnected('task-1')).toBe(true);
    });

    it('does not create duplicate connections', () => {
      useSSEStore.getState().connect('task-1');
      useSSEStore.getState().connect('task-1'); // Second call

      expect(MockEventSource.instances).toHaveLength(1);
    });

    it('handles log messages', () => {
      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];

      es.simulateMessage(JSON.stringify({ type: 'log', content: 'Building app...' }));
      es.simulateMessage(JSON.stringify({ type: 'log', content: 'Phase 1 started' }));

      const logs = useSSEStore.getState().getLogs('task-1');
      expect(logs).toEqual(['Building app...', 'Phase 1 started']);
    });

    it('handles state change messages', () => {
      const stateChanges: string[] = [];
      useSSEStore.getState().setOnStateChange((taskId, state) => {
        stateChanges.push(`${taskId}:${state}`);
      });

      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];

      es.simulateMessage(JSON.stringify({ type: 'state', content: 'waiting_review' }));

      expect(stateChanges).toEqual(['task-1:waiting_review']);
    });

    it('handles complete messages and disconnects', () => {
      const completions: string[] = [];
      useSSEStore.getState().setOnComplete((taskId) => completions.push(taskId));

      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];

      es.simulateMessage(JSON.stringify({ type: 'complete' }));

      expect(completions).toEqual(['task-1']);
      expect(es.close).toHaveBeenCalled();
    });

    it('handles raw text messages (non-JSON)', () => {
      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];

      es.simulateMessage('Plain text log line');

      const logs = useSSEStore.getState().getLogs('task-1');
      expect(logs).toEqual(['Plain text log line']);
    });

    it('handles error by disconnecting', () => {
      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];
      es.simulateOpen();

      expect(useSSEStore.getState().isConnected('task-1')).toBe(true);

      es.simulateError();

      expect(useSSEStore.getState().isConnected('task-1')).toBe(false);
      expect(es.close).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('closes EventSource and marks as disconnected', () => {
      useSSEStore.getState().connect('task-1');
      const es = MockEventSource.instances[0];
      es.simulateOpen();

      useSSEStore.getState().disconnect('task-1');

      expect(es.close).toHaveBeenCalled();
      expect(useSSEStore.getState().isConnected('task-1')).toBe(false);
    });

    it('does nothing for non-existent connection', () => {
      expect(() => useSSEStore.getState().disconnect('no-task')).not.toThrow();
    });
  });

  describe('disconnectAll', () => {
    it('closes all connections', () => {
      useSSEStore.getState().connect('task-1');
      useSSEStore.getState().connect('task-2');

      const es1 = MockEventSource.instances[0];
      const es2 = MockEventSource.instances[1];

      useSSEStore.getState().disconnectAll();

      expect(es1.close).toHaveBeenCalled();
      expect(es2.close).toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('returns empty array for unknown task', () => {
      expect(useSSEStore.getState().getLogs('unknown')).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('clears logs for a task', () => {
      useSSEStore.getState().connect('task-1');
      MockEventSource.instances[0].simulateMessage(JSON.stringify({ type: 'log', content: 'msg' }));

      expect(useSSEStore.getState().getLogs('task-1')).toHaveLength(1);

      useSSEStore.getState().clearLogs('task-1');
      expect(useSSEStore.getState().getLogs('task-1')).toEqual([]);
    });
  });

  describe('isConnected', () => {
    it('returns false for unconnected task', () => {
      expect(useSSEStore.getState().isConnected('no-task')).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('setOnStateChange sets the callback', () => {
      const cb = vi.fn();
      useSSEStore.getState().setOnStateChange(cb);
      expect(useSSEStore.getState().onStateChange).toBe(cb);
    });

    it('setOnComplete sets the callback', () => {
      const cb = vi.fn();
      useSSEStore.getState().setOnComplete(cb);
      expect(useSSEStore.getState().onComplete).toBe(cb);
    });

    it('can clear callbacks by setting null', () => {
      useSSEStore.getState().setOnStateChange(vi.fn());
      useSSEStore.getState().setOnStateChange(null);
      expect(useSSEStore.getState().onStateChange).toBeNull();
    });
  });
});
