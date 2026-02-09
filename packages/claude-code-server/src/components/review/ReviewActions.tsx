'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const canAct = status === 'pending' || status === 'in_review';
  if (!canAct) return null;

  async function handleApprove() {
    setLoading('approve');
    setError('');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/approve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      } else {
        setError(json.error || 'Failed to approve');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading('');
    }
  }

  async function handleRequestChanges() {
    if (!feedback.trim()) {
      setError('Feedback is required');
      return;
    }
    setLoading('changes');
    setError('');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      } else {
        setError(json.error || 'Failed to request changes');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={!!loading}
          className="rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
        >
          Request Changes
        </button>
      </div>

      {showFeedback && (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what changes are needed..."
          />
          <button
            onClick={handleRequestChanges}
            disabled={!!loading || !feedback.trim()}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading === 'changes' ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
