import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string;
  currentPhase: number | null;
  progress: number;
  workspace: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskInput {
  title: string;
  type: string;
  description: string;
}

interface TaskStore {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;

  fetchTasks: () => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTaskFromSSE: (taskId: string, data: Partial<Task>) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      if (json.success) {
        set({ tasks: json.data, loading: false });
      } else {
        set({ error: json.error || 'Failed to fetch tasks', loading: false });
      }
    } catch {
      set({ error: 'Network error', loading: false });
    }
  },

  fetchTask: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/tasks/${id}`);
      const json = await res.json();
      if (json.success) {
        set({ currentTask: json.data, loading: false });
      } else {
        set({ error: json.error || 'Task not found', loading: false });
      }
    } catch {
      set({ error: 'Network error', loading: false });
    }
  },

  createTask: async (input: CreateTaskInput) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (json.success) {
        set({ loading: false });
        return json.data as Task;
      }
      set({ error: json.error || 'Failed to create task', loading: false });
      return null;
    } catch {
      set({ error: 'Network error', loading: false });
      return null;
    }
  },

  updateTaskFromSSE: (taskId: string, data: Partial<Task>) => {
    const { currentTask, tasks } = get();

    if (currentTask?.id === taskId) {
      set({ currentTask: { ...currentTask, ...data } });
    }

    set({
      tasks: tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
    });
  },
}));
