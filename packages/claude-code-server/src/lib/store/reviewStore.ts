import { create } from 'zustand';

interface Deliverable {
  path: string;
  content: string;
  size: number;
}

interface Review {
  id: string;
  taskId: string;
  phase: number;
  status: string;
  deliverables: string; // JSON string
  feedback: string | null;
  createdAt: string;
}

interface ReviewStore {
  currentReview: Review | null;
  deliverables: Deliverable[];
  selectedFile: number;
  loading: boolean;
  error: string | null;

  loadReview: (review: Review) => void;
  selectDeliverable: (index: number) => void;
  approve: (reviewId: string) => Promise<boolean>;
  requestChanges: (reviewId: string, feedback: string) => Promise<boolean>;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  currentReview: null,
  deliverables: [],
  selectedFile: 0,
  loading: false,
  error: null,

  loadReview: (review: Review) => {
    let deliverables: Deliverable[] = [];
    try {
      deliverables = JSON.parse(review.deliverables);
    } catch {
      deliverables = [];
    }
    set({
      currentReview: review,
      deliverables,
      selectedFile: 0,
      error: null,
    });
  },

  selectDeliverable: (index: number) => {
    set({ selectedFile: index });
  },

  approve: async (reviewId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/reviews/${reviewId}/approve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        set((state) => ({
          loading: false,
          currentReview: state.currentReview
            ? { ...state.currentReview, status: 'approved' }
            : null,
        }));
        return true;
      }
      set({ error: json.error || 'Failed to approve', loading: false });
      return false;
    } catch {
      set({ error: 'Network error', loading: false });
      return false;
    }
  },

  requestChanges: async (reviewId: string, feedback: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/reviews/${reviewId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const json = await res.json();
      if (json.success) {
        set((state) => ({
          loading: false,
          currentReview: state.currentReview
            ? { ...state.currentReview, status: 'changes_requested', feedback }
            : null,
        }));
        return true;
      }
      set({ error: json.error || 'Failed to request changes', loading: false });
      return false;
    } catch {
      set({ error: 'Network error', loading: false });
      return false;
    }
  },

  reset: () => {
    set({
      currentReview: null,
      deliverables: [],
      selectedFile: 0,
      loading: false,
      error: null,
    });
  },
}));
