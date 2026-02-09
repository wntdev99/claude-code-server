import { create } from 'zustand';

interface SSEStore {
  connections: Map<string, EventSource>;
  logs: Map<string, string[]>;
  connected: Map<string, boolean>;

  connect: (taskId: string) => void;
  disconnect: (taskId: string) => void;
  disconnectAll: () => void;
  getLogs: (taskId: string) => string[];
  isConnected: (taskId: string) => boolean;
  clearLogs: (taskId: string) => void;

  // Callbacks set by consumers
  onStateChange: ((taskId: string, state: string) => void) | null;
  onComplete: ((taskId: string) => void) | null;
  setOnStateChange: (cb: ((taskId: string, state: string) => void) | null) => void;
  setOnComplete: (cb: ((taskId: string) => void) | null) => void;
}

export const useSSEStore = create<SSEStore>((set, get) => ({
  connections: new Map(),
  logs: new Map(),
  connected: new Map(),
  onStateChange: null,
  onComplete: null,

  setOnStateChange: (cb) => set({ onStateChange: cb }),
  setOnComplete: (cb) => set({ onComplete: cb }),

  connect: (taskId: string) => {
    const { connections } = get();

    // Already connected
    if (connections.has(taskId)) return;

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.onopen = () => {
      set((state) => {
        const connected = new Map(state.connected);
        connected.set(taskId, true);
        return { connected };
      });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'log') {
          set((state) => {
            const logs = new Map(state.logs);
            const taskLogs = [...(logs.get(taskId) || []), data.content];
            logs.set(taskId, taskLogs);
            return { logs };
          });
        } else if (data.type === 'state') {
          const { onStateChange } = get();
          onStateChange?.(taskId, data.content);
        } else if (data.type === 'complete') {
          const { onComplete } = get();
          onComplete?.(taskId);
          get().disconnect(taskId);
        }
      } catch {
        // Raw text log
        set((state) => {
          const logs = new Map(state.logs);
          const taskLogs = [...(logs.get(taskId) || []), event.data];
          logs.set(taskId, taskLogs);
          return { logs };
        });
      }
    };

    eventSource.onerror = () => {
      set((state) => {
        const connected = new Map(state.connected);
        connected.set(taskId, false);
        return { connected };
      });
      get().disconnect(taskId);
    };

    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.set(taskId, eventSource);
      return { connections: newConnections };
    });
  },

  disconnect: (taskId: string) => {
    const { connections } = get();
    const eventSource = connections.get(taskId);
    if (eventSource) {
      eventSource.close();
      set((state) => {
        const newConnections = new Map(state.connections);
        newConnections.delete(taskId);
        const connected = new Map(state.connected);
        connected.set(taskId, false);
        return { connections: newConnections, connected };
      });
    }
  },

  disconnectAll: () => {
    const { connections } = get();
    connections.forEach((es) => es.close());
    set({ connections: new Map(), connected: new Map() });
  },

  getLogs: (taskId: string) => {
    return get().logs.get(taskId) || [];
  },

  isConnected: (taskId: string) => {
    return get().connected.get(taskId) || false;
  },

  clearLogs: (taskId: string) => {
    set((state) => {
      const logs = new Map(state.logs);
      logs.delete(taskId);
      return { logs };
    });
  },
}));
