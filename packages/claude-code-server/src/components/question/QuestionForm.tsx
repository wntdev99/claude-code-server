'use client';

import { useState } from 'react';

interface Question {
  id: string;
  category: string;
  question: string;
  options: string; // JSON string
}

export function QuestionForm({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  let options: string[] = [];
  try {
    options = JSON.parse(question.options);
  } catch {
    options = [];
  }

  async function handleSubmit() {
    if (!answer.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/questions/${question.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      const json = await res.json();
      if (json.success) {
        onAnswered();
      } else {
        setError(json.error || 'Failed to submit answer');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {question.category === 'choice' && options.length > 0 ? (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={opt}
                checked={answer === opt}
                onChange={() => setAnswer(opt)}
                className="text-blue-600"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      ) : question.category === 'confirmation' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAnswer('Yes')}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              answer === 'Yes'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setAnswer('No')}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              answer === 'No'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            No
          </button>
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Type your answer..."
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !answer.trim()}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );
}
