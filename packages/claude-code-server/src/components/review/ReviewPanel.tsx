'use client';

import { useState } from 'react';
import { DeliverableList } from './DeliverableList';
import { DeliverableViewer } from './DeliverableViewer';
import { ReviewActions } from './ReviewActions';

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
  deliverables: string;
  feedback: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  changes_requested: 'bg-orange-100 text-orange-700',
};

export function ReviewPanel({ review }: { review: Review }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  let deliverables: Deliverable[] = [];
  try {
    deliverables = JSON.parse(review.deliverables);
  } catch {
    deliverables = [];
  }

  const selectedDeliverable = deliverables[selectedIndex] || null;
  const statusStyle = STATUS_STYLES[review.status] || 'bg-gray-100';

  return (
    <div className="rounded-lg border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Phase {review.phase} Review</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
          >
            {review.status.replace('_', ' ')}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {deliverables.length} file{deliverables.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Body: File list + Viewer */}
      {deliverables.length > 0 && (
        <div className="flex" style={{ height: '400px' }}>
          {/* Left: File list */}
          <div className="w-64 flex-shrink-0 overflow-auto border-r">
            <DeliverableList
              deliverables={deliverables}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          </div>

          {/* Right: File content */}
          <div className="flex-1 overflow-hidden">
            <DeliverableViewer deliverable={selectedDeliverable} />
          </div>
        </div>
      )}

      {/* Feedback (if changes were requested) */}
      {review.feedback && (
        <div className="border-t bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-700">Feedback</p>
          <p className="mt-1 text-sm text-orange-800">{review.feedback}</p>
        </div>
      )}

      {/* Actions */}
      {(review.status === 'pending' || review.status === 'in_review') && (
        <div className="border-t px-4 py-3">
          <ReviewActions reviewId={review.id} status={review.status} />
        </div>
      )}
    </div>
  );
}
