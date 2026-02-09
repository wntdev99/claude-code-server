'use client';

import { useRouter } from 'next/navigation';
import { QuestionForm } from './QuestionForm';

interface Question {
  id: string;
  taskId: string;
  category: string;
  question: string;
  options: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  business: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Business' },
  clarification: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Clarification' },
  choice: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Choice' },
  confirmation: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmation' },
};

export function QuestionCard({ question }: { question: Question }) {
  const router = useRouter();
  const isAnswered = !!question.answer;
  const style = CATEGORY_STYLES[question.category] || CATEGORY_STYLES.clarification;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isAnswered ? 'bg-white' : 'border-yellow-200 bg-yellow-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
            >
              {style.label}
            </span>
            {isAnswered ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Answered
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                Pending
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900">{question.question}</p>
        </div>
      </div>

      {isAnswered ? (
        <div className="mt-3 rounded-md bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Answer</p>
          <p className="mt-1 text-sm text-gray-700">{question.answer}</p>
        </div>
      ) : (
        <QuestionForm
          question={question}
          onAnswered={() => router.refresh()}
        />
      )}
    </div>
  );
}
