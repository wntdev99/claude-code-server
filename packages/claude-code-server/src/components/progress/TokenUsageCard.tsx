'use client';

import { useEffect, useState } from 'react';

interface TokenUsage {
  taskId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatCost(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function TokenUsageCard({
  taskId,
  active,
}: {
  taskId: string;
  active: boolean;
}) {
  const [usage, setUsage] = useState<TokenUsage | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchUsage() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/status`);
        const json = await res.json();
        if (json.success && json.data?.tokenUsage) {
          setUsage(json.data.tokenUsage);
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    fetchUsage();

    if (active) {
      timer = setInterval(fetchUsage, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [taskId, active]);

  if (!usage) return null;

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 font-semibold">Token Usage</h2>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500">Input</p>
          <p className="text-lg font-medium">{formatTokens(usage.inputTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Output</p>
          <p className="text-lg font-medium">{formatTokens(usage.outputTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-medium">{formatTokens(usage.totalTokens)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Est. Cost</p>
          <p className="text-lg font-medium">{formatCost(usage.estimatedCost)}</p>
        </div>
      </div>
    </div>
  );
}
