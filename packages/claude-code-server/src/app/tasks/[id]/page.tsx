import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LogStream } from './LogStream';
import { TaskActions } from './TaskActions';
import { QuestionCard } from '@/components/question/QuestionCard';
import { ReviewPanel } from '@/components/review/ReviewPanel';
import { PhaseTimeline } from '@/components/progress/PhaseTimeline';
import { TokenUsageCard } from '@/components/progress/TokenUsageCard';

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

  // Split reviews into active (pending/in_review) and history
  const activeReview = task.reviews.find(
    (r) => r.status === 'pending' || r.status === 'in_review'
  );
  const reviewHistory = task.reviews.filter(
    (r) => r.status !== 'pending' && r.status !== 'in_review'
  );

  // Sort questions: unanswered first, then answered
  const sortedQuestions = [
    ...task.questions.filter((q) => !q.answer),
    ...task.questions.filter((q) => !!q.answer),
  ];

  const isActive = task.status === 'in_progress' || task.status === 'review';

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
          </div>
        </div>
        <TaskActions taskId={task.id} status={task.status} />
      </div>

      {/* Phase Timeline */}
      <PhaseTimeline
        taskType={task.type}
        currentPhase={task.currentPhase}
        progress={task.progress}
      />

      {/* Description */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-600">
          {task.description}
        </p>
      </div>

      {/* Token Usage */}
      {isActive && (
        <TokenUsageCard
          taskId={task.id}
          active={task.status === 'in_progress'}
        />
      )}

      {/* Questions */}
      {sortedQuestions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">
            Questions
            {sortedQuestions.filter((q) => !q.answer).length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                {sortedQuestions.filter((q) => !q.answer).length} pending
              </span>
            )}
          </h2>
          <div className="space-y-3">
            {sortedQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={{
                  ...q,
                  answeredAt: q.answeredAt?.toISOString() ?? null,
                  createdAt: q.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Review */}
      {activeReview && (
        <ReviewPanel
          review={{
            ...activeReview,
            createdAt: activeReview.createdAt.toISOString(),
          }}
        />
      )}

      {/* Review History */}
      {reviewHistory.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-semibold">Review History</h2>
          {reviewHistory.map((r) => (
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
