import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LogStream } from './LogStream';
import { TaskActions } from './TaskActions';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      reviews: { orderBy: { createdAt: 'desc' } },
      questions: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!task) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {task.type}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[task.status] ?? ''}`}
            >
              {task.status}
            </span>
            {task.currentPhase && (
              <span className="text-sm text-gray-500">
                Phase {task.currentPhase}
              </span>
            )}
            <span className="text-sm text-gray-500">{task.progress}%</span>
          </div>
        </div>
        <TaskActions taskId={task.id} status={task.status} />
      </div>

      {/* Description */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-600">
          {task.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Progress</h2>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Pending Questions */}
      {task.questions.filter((q) => !q.answer).length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-2 font-semibold text-yellow-800">
            Pending Questions
          </h2>
          {task.questions
            .filter((q) => !q.answer)
            .map((q) => (
              <div key={q.id} className="mt-2 rounded bg-white p-3">
                <p className="font-medium">{q.question}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Category: {q.category}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Reviews */}
      {task.reviews.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-semibold">Reviews</h2>
          {task.reviews.map((r) => (
            <div
              key={r.id}
              className="mt-2 rounded border p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span>Phase {r.phase}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : r.status === 'changes_requested'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.feedback && (
                <p className="mt-1 text-gray-500">{r.feedback}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Logs</h2>
        <LogStream taskId={task.id} active={task.status === 'in_progress'} />
      </div>
    </div>
  );
}
