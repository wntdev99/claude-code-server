import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from '../../lib/store/taskStore.js';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state
    useTaskStore.setState({
      tasks: [],
      currentTask: null,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty tasks array', () => {
      const { tasks } = useTaskStore.getState();
      expect(tasks).toEqual([]);
    });

    it('starts with null currentTask', () => {
      const { currentTask } = useTaskStore.getState();
      expect(currentTask).toBeNull();
    });

    it('starts with loading false', () => {
      const { loading } = useTaskStore.getState();
      expect(loading).toBe(false);
    });

    it('starts with null error', () => {
      const { error } = useTaskStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('fetchTasks', () => {
    it('sets loading state and fetches tasks', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', type: 'custom', status: 'draft', description: 'Test', currentPhase: null, progress: 0, workspace: '', createdAt: '', updatedAt: '' },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTasks }),
      });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual(mockTasks);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks');
    });

    it('handles API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.error).toBe('Server error');
      expect(state.loading).toBe(false);
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchTask', () => {
    it('fetches a single task by ID', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'My Task',
        type: 'create_app',
        status: 'in_progress',
        description: 'Build an app',
        currentPhase: 1,
        progress: 25,
        workspace: '/tmp/ws',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTask }),
      });

      await useTaskStore.getState().fetchTask('task-1');

      const state = useTaskStore.getState();
      expect(state.currentTask).toEqual(mockTask);
      expect(state.loading).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-1');
    });

    it('handles 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Task not found' }),
      });

      await useTaskStore.getState().fetchTask('no-exist');

      const state = useTaskStore.getState();
      expect(state.currentTask).toBeNull();
      expect(state.error).toBe('Task not found');
    });
  });

  describe('createTask', () => {
    it('creates a new task', async () => {
      const newTask = {
        id: 'new-1',
        title: 'New Task',
        type: 'custom',
        status: 'draft',
        description: 'A new task',
        currentPhase: null,
        progress: 0,
        workspace: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: newTask }),
      });

      const result = await useTaskStore.getState().createTask({
        title: 'New Task',
        type: 'custom',
        description: 'A new task',
      });

      expect(result).toEqual(newTask);
      expect(useTaskStore.getState().loading).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task', type: 'custom', description: 'A new task' }),
      });
    });

    it('returns null on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Validation error' }),
      });

      const result = await useTaskStore.getState().createTask({
        title: '',
        type: 'custom',
        description: 'Short',
      });

      expect(result).toBeNull();
      expect(useTaskStore.getState().error).toBe('Validation error');
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await useTaskStore.getState().createTask({
        title: 'Test',
        type: 'custom',
        description: 'Test description',
      });

      expect(result).toBeNull();
      expect(useTaskStore.getState().error).toBe('Network error');
    });
  });

  describe('updateTaskFromSSE', () => {
    it('updates currentTask when IDs match', () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task 1',
        type: 'custom',
        status: 'in_progress',
        description: 'Test',
        currentPhase: 1,
        progress: 25,
        workspace: '',
        createdAt: '',
        updatedAt: '',
      };

      useTaskStore.setState({ currentTask: existingTask });
      useTaskStore.getState().updateTaskFromSSE('task-1', { progress: 50, currentPhase: 2 });

      const state = useTaskStore.getState();
      expect(state.currentTask!.progress).toBe(50);
      expect(state.currentTask!.currentPhase).toBe(2);
    });

    it('does not update currentTask when IDs differ', () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task 1',
        type: 'custom',
        status: 'in_progress',
        description: 'Test',
        currentPhase: 1,
        progress: 25,
        workspace: '',
        createdAt: '',
        updatedAt: '',
      };

      useTaskStore.setState({ currentTask: existingTask });
      useTaskStore.getState().updateTaskFromSSE('task-2', { progress: 50 });

      expect(useTaskStore.getState().currentTask!.progress).toBe(25);
    });

    it('updates matching task in tasks list', () => {
      const tasks = [
        { id: 'task-1', title: 'T1', type: 'custom', status: 'draft', description: '', currentPhase: null, progress: 0, workspace: '', createdAt: '', updatedAt: '' },
        { id: 'task-2', title: 'T2', type: 'custom', status: 'draft', description: '', currentPhase: null, progress: 0, workspace: '', createdAt: '', updatedAt: '' },
      ];

      useTaskStore.setState({ tasks });
      useTaskStore.getState().updateTaskFromSSE('task-1', { status: 'completed', progress: 100 });

      const updated = useTaskStore.getState().tasks;
      expect(updated[0].status).toBe('completed');
      expect(updated[0].progress).toBe(100);
      expect(updated[1].status).toBe('draft'); // Unchanged
    });
  });
});
