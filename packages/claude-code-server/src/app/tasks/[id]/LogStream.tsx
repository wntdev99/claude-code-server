'use client';

import { useEffect, useRef, useState } from 'react';

export function LogStream({
  taskId,
  active,
}: {
  taskId: string;
  active: boolean;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setLogs((prev) => [...prev, data.content]);
        } else if (data.type === 'complete') {
          eventSource.close();
          setConnected(false);
        }
      } catch {
        // Raw text log
        setLogs((prev) => [...prev, event.data]);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [taskId, active]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
        />
        <span className="text-gray-500">
          {connected ? 'Connected' : active ? 'Connecting...' : 'Disconnected'}
        </span>
        <span className="text-gray-400">{logs.length} lines</span>
      </div>
      <div
        ref={containerRef}
        className="max-h-96 overflow-auto rounded bg-gray-900 p-4 font-mono text-xs text-gray-100"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500">
            {active ? 'Waiting for logs...' : 'No logs available'}
          </p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
