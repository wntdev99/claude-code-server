# SSE 실시간 로그 스트리밍

## 개요

Server-Sent Events (SSE)를 사용하여 에이전트 로그를 실시간으로 클라이언트에 스트리밍하는 방법을 설명합니다.

## SSE 구현

### API Route

```typescript
// app/api/tasks/[id]/stream/route.ts
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. 에이전트 로그 구독
      const unsubscribe = subscribeToAgentLogs(taskId, (event) => {
        // 2. SSE 형식으로 인코딩
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      // 3. 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });

      // 4. Keep-alive (30초마다)
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
    },
  });
}
```

### 로그 구독 시스템

```typescript
// lib/agent/stream.ts
type LogCallback = (event: SSEEvent) => void;

// 구독자 관리
const subscribers = new Map<string, Set<LogCallback>>();

export function subscribeToAgentLogs(
  taskId: string,
  callback: LogCallback
): () => void {
  if (!subscribers.has(taskId)) {
    subscribers.set(taskId, new Set());
  }

  const callbacks = subscribers.get(taskId)!;
  callbacks.add(callback);

  // Unsubscribe 함수 반환
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      subscribers.delete(taskId);
    }
  };
}

export function emitLogEvent(taskId: string, event: SSEEvent) {
  const callbacks = subscribers.get(taskId);
  if (callbacks) {
    callbacks.forEach(callback => callback(event));
  }
}
```

## 이벤트 타입

### SSEEvent 정의

```typescript
// types/index.ts
type SSEEvent =
  | { type: 'log'; data: LogData }
  | { type: 'phase_update'; data: PhaseUpdateData }
  | { type: 'step_update'; data: StepUpdateData }
  | { type: 'dependency_request'; data: DependencyRequest }
  | { type: 'user_question'; data: UserQuestion }
  | { type: 'review_required'; data: ReviewData }
  | { type: 'complete'; data: CompleteData }
  | { type: 'error'; data: ErrorData };

interface LogData {
  timestamp: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
}

interface PhaseUpdateData {
  phase: number;
  status: 'started' | 'in_progress' | 'completed';
  name: string;
}

interface StepUpdateData {
  step: string;
  progress: number;
  total: number;
}
```

### 이벤트 발생

```typescript
// lib/agent/parser.ts
import { emitLogEvent } from './stream';

export function parseAgentOutput(taskId: string, output: string) {
  // 일반 로그
  emitLogEvent(taskId, {
    type: 'log',
    data: {
      timestamp: new Date().toISOString(),
      message: output,
      level: 'info',
    },
  });

  // Phase 시작 감지
  const phaseStartMatch = output.match(/Starting Phase (\d+): (.+)/);
  if (phaseStartMatch) {
    emitLogEvent(taskId, {
      type: 'phase_update',
      data: {
        phase: parseInt(phaseStartMatch[1]),
        status: 'started',
        name: phaseStartMatch[2],
      },
    });
  }

  // 의존성 요청 감지
  const depMatch = output.match(/\[DEPENDENCY_REQUEST\]([\s\S]*?)\[\/DEPENDENCY_REQUEST\]/);
  if (depMatch) {
    const request = parseDependencyRequest(depMatch[1]);
    emitLogEvent(taskId, {
      type: 'dependency_request',
      data: request,
    });
  }

  // 더 많은 패턴...
}
```

## 클라이언트 구현

### React Hook

```typescript
// lib/hooks/useSSE.ts
'use client';

import { useEffect, useState } from 'react';

export function useSSE<T = SSEEvent>(url: string) {
  const [events, setEvents] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as T;
        setEvents(prev => [...prev, event]);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (e) => {
      setIsConnected(false);
      setError(new Error('SSE connection failed'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { events, isConnected, error };
}
```

### 사용 예시

```typescript
// components/tasks/TaskLogs.tsx
'use client';

import { useSSE } from '@/lib/hooks/useSSE';

export function TaskLogs({ taskId }: { taskId: string }) {
  const { events, isConnected } = useSSE<SSEEvent>(
    `/api/tasks/${taskId}/stream`
  );

  return (
    <div className="logs">
      <div className="status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {events.map((event, idx) => (
        <LogEntry key={idx} event={event} />
      ))}
    </div>
  );
}

function LogEntry({ event }: { event: SSEEvent }) {
  switch (event.type) {
    case 'log':
      return <div className="log">{event.data.message}</div>;

    case 'phase_update':
      return (
        <div className="phase-update">
          Phase {event.data.phase}: {event.data.status}
        </div>
      );

    case 'dependency_request':
      return (
        <div className="dependency">
          🔑 Dependency required: {event.data.name}
        </div>
      );

    default:
      return null;
  }
}
```

## 재연결 로직

### 자동 재연결

```typescript
// lib/hooks/useSSEWithReconnect.ts
'use client';

import { useEffect, useState, useRef } from 'react';

export function useSSEWithReconnect<T = SSEEvent>(
  url: string,
  options: {
    reconnectDelay?: number;
    maxRetries?: number;
  } = {}
) {
  const { reconnectDelay = 3000, maxRetries = 5 } = options;
  const [events, setEvents] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const retryCount = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        retryCount.current = 0;
      };

      eventSource.onmessage = (e) => {
        const event = JSON.parse(e.data) as T;
        setEvents(prev => [...prev, event]);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // 재연결 시도
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(connect, reconnectDelay);
        }
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [url, reconnectDelay, maxRetries]);

  return { events, isConnected, retryCount: retryCount.current };
}
```

## 에러 처리

### 서버 에러

```typescript
// app/api/tasks/[id]/stream/route.ts
export async function GET(request: NextRequest, { params }: any) {
  const taskId = params.id;

  // Task 존재 확인
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  // Task가 실행 중인지 확인
  if (task.status !== 'in_progress') {
    return new Response('Task is not running', { status: 400 });
  }

  // SSE 스트림...
}
```

### 클라이언트 에러

```typescript
// components/tasks/TaskLogs.tsx
export function TaskLogs({ taskId }: { taskId: string }) {
  const { events, isConnected, error } = useSSE(`/api/tasks/${taskId}/stream`);

  if (error) {
    return (
      <div className="error">
        ❌ Connection error: {error.message}
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  // ...
}
```

## Keep-Alive

일부 프록시나 브라우저가 연결을 끊는 것을 방지하기 위해 주기적으로 빈 메시지 전송:

```typescript
// SSE 코멘트 형식 (데이터 아님)
controller.enqueue(encoder.encode(': keepalive\n\n'));
```

## 성능 최적화

### 1. 이벤트 버퍼링

빠르게 발생하는 이벤트를 배치로 전송:

```typescript
const buffer: SSEEvent[] = [];
const BUFFER_SIZE = 10;
const BUFFER_TIMEOUT = 100; // ms

function bufferEvent(event: SSEEvent) {
  buffer.push(event);

  if (buffer.length >= BUFFER_SIZE) {
    flushBuffer();
  }
}

function flushBuffer() {
  if (buffer.length > 0) {
    emitBatch(buffer);
    buffer.length = 0;
  }
}

setInterval(flushBuffer, BUFFER_TIMEOUT);
```

### 2. 메모리 관리

오래된 이벤트 정리:

```typescript
const MAX_EVENTS = 1000;

setEvents(prev => {
  const newEvents = [...prev, event];
  if (newEvents.length > MAX_EVENTS) {
    return newEvents.slice(-MAX_EVENTS);
  }
  return newEvents;
});
```

## 보안 고려사항

### 1. 인증

```typescript
export async function GET(request: NextRequest, { params }: any) {
  // API 키 확인
  const apiKey = request.headers.get('X-API-Key');
  if (!isValidApiKey(apiKey)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 또는 세션 확인
  const session = await getSession(request);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // SSE 스트림...
}
```

### 2. Rate Limiting

```typescript
const connections = new Map<string, number>();

export async function GET(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const count = connections.get(ip) || 0;

  if (count >= MAX_CONNECTIONS_PER_IP) {
    return new Response('Too many connections', { status: 429 });
  }

  connections.set(ip, count + 1);

  // SSE 스트림...
  // 연결 종료 시 count 감소
}
```

## 다음 단계

- **프로세스 관리**: `process-management.md` - 에이전트 프로세스 관리
- **프로토콜 파싱**: `protocol-parsing.md` - 출력 파싱
- **API 설계**: `../api/tasks-api.md` - Tasks API 상세

## 관련 문서

- **아키텍처**: `../architecture/api-routes.md`
- **보안**: `../security/rate-limiting.md`
