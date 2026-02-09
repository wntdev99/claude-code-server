import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReviewStore } from '../../lib/store/reviewStore.js';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('reviewStore', () => {
  beforeEach(() => {
    useReviewStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null currentReview', () => {
      expect(useReviewStore.getState().currentReview).toBeNull();
    });

    it('starts with empty deliverables', () => {
      expect(useReviewStore.getState().deliverables).toEqual([]);
    });

    it('starts with selectedFile 0', () => {
      expect(useReviewStore.getState().selectedFile).toBe(0);
    });

    it('starts with no error', () => {
      expect(useReviewStore.getState().error).toBeNull();
    });
  });

  describe('loadReview', () => {
    it('loads review and parses deliverables JSON', () => {
      const review = {
        id: 'review-1',
        taskId: 'task-1',
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([
          { path: 'docs/planning/01_idea.md', content: 'Idea content', size: 500 },
          { path: 'docs/planning/02_market.md', content: 'Market content', size: 600 },
        ]),
        feedback: null,
        createdAt: '2024-01-01',
      };

      useReviewStore.getState().loadReview(review);

      const state = useReviewStore.getState();
      expect(state.currentReview).toEqual(review);
      expect(state.deliverables).toHaveLength(2);
      expect(state.deliverables[0].path).toBe('docs/planning/01_idea.md');
      expect(state.selectedFile).toBe(0);
    });

    it('handles invalid JSON deliverables gracefully', () => {
      const review = {
        id: 'review-2',
        taskId: 'task-1',
        phase: 1,
        status: 'pending',
        deliverables: 'NOT VALID JSON',
        feedback: null,
        createdAt: '2024-01-01',
      };

      useReviewStore.getState().loadReview(review);

      const state = useReviewStore.getState();
      expect(state.currentReview).toEqual(review);
      expect(state.deliverables).toEqual([]);
    });

    it('handles empty deliverables array', () => {
      const review = {
        id: 'review-3',
        taskId: 'task-1',
        phase: 1,
        status: 'pending',
        deliverables: '[]',
        feedback: null,
        createdAt: '2024-01-01',
      };

      useReviewStore.getState().loadReview(review);
      expect(useReviewStore.getState().deliverables).toEqual([]);
    });
  });

  describe('selectDeliverable', () => {
    it('sets the selected file index', () => {
      useReviewStore.getState().selectDeliverable(2);
      expect(useReviewStore.getState().selectedFile).toBe(2);
    });
  });

  describe('approve', () => {
    it('sends approve request and updates status', async () => {
      // Set up review state
      useReviewStore.setState({
        currentReview: {
          id: 'rev-1',
          taskId: 'task-1',
          phase: 1,
          status: 'pending',
          deliverables: '[]',
          feedback: null,
          createdAt: '',
        },
      });

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await useReviewStore.getState().approve('rev-1');

      expect(result).toBe(true);
      expect(useReviewStore.getState().currentReview!.status).toBe('approved');
      expect(useReviewStore.getState().loading).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/reviews/rev-1/approve', { method: 'POST' });
    });

    it('returns false on API failure', async () => {
      useReviewStore.setState({
        currentReview: {
          id: 'rev-1',
          taskId: 'task-1',
          phase: 1,
          status: 'pending',
          deliverables: '[]',
          feedback: null,
          createdAt: '',
        },
      });

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Not found' }),
      });

      const result = await useReviewStore.getState().approve('rev-1');
      expect(result).toBe(false);
      expect(useReviewStore.getState().error).toBe('Not found');
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await useReviewStore.getState().approve('rev-1');
      expect(result).toBe(false);
      expect(useReviewStore.getState().error).toBe('Network error');
    });
  });

  describe('requestChanges', () => {
    it('sends changes request with feedback', async () => {
      useReviewStore.setState({
        currentReview: {
          id: 'rev-1',
          taskId: 'task-1',
          phase: 1,
          status: 'pending',
          deliverables: '[]',
          feedback: null,
          createdAt: '',
        },
      });

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await useReviewStore.getState().requestChanges('rev-1', 'Need more detail');

      expect(result).toBe(true);
      const state = useReviewStore.getState();
      expect(state.currentReview!.status).toBe('changes_requested');
      expect(state.currentReview!.feedback).toBe('Need more detail');
      expect(mockFetch).toHaveBeenCalledWith('/api/reviews/rev-1/request-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Need more detail' }),
      });
    });

    it('returns false on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Failed' }),
      });

      const result = await useReviewStore.getState().requestChanges('rev-1', 'feedback');
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      useReviewStore.setState({
        currentReview: { id: 'rev-1', taskId: 't', phase: 1, status: 'approved', deliverables: '[]', feedback: 'ok', createdAt: '' },
        deliverables: [{ path: 'a', content: 'b', size: 1 }],
        selectedFile: 3,
        error: 'some error',
      });

      useReviewStore.getState().reset();

      const state = useReviewStore.getState();
      expect(state.currentReview).toBeNull();
      expect(state.deliverables).toEqual([]);
      expect(state.selectedFile).toBe(0);
      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
    });
  });
});
