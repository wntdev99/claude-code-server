'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TASK_TYPES = [
  { value: 'create_app', label: 'Create App', desc: 'Build a new application from scratch' },
  { value: 'modify_app', label: 'Modify App', desc: 'Modify or enhance an existing application' },
  { value: 'workflow', label: 'Workflow', desc: 'Create workflow automation' },
  { value: 'custom', label: 'Custom', desc: 'Free-form task or conversation' },
] as const;

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create task');
        return;
      }

      router.push(`/tasks/${data.data.id}`);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create New Task</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Build a todo app with React"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Task Type</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {TASK_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  defaultChecked={type.value === 'custom'}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what you want the agent to do..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
