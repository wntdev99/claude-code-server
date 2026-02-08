'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TaskActions({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState('');

  async function handleAction(action: string) {
    setLoading(action);
    try {
      const endpoint =
        action === 'execute'
          ? `/api/tasks/${taskId}/execute`
          : action === 'pause'
            ? `/api/tasks/${taskId}/pause`
            : action === 'resume'
              ? `/api/tasks/${taskId}/resume`
              : null;

      if (!endpoint) return;

      await fetch(endpoint, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="flex gap-2">
      {(status === 'draft' || status === 'pending') && (
        <button
          onClick={() => handleAction('execute')}
          disabled={loading === 'execute'}
          className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'execute' ? 'Starting...' : 'Execute'}
        </button>
      )}
      {status === 'in_progress' && (
        <button
          onClick={() => handleAction('pause')}
          disabled={loading === 'pause'}
          className="rounded-md bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700 disabled:opacity-50"
        >
          Pause
        </button>
      )}
      {status === 'paused' && (
        <button
          onClick={() => handleAction('resume')}
          disabled={loading === 'resume'}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Resume
        </button>
      )}
    </div>
  );
}
