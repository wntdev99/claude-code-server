# 2.3 태스크 플로우 가이드

## 목적

웹 애플리케이션의 주요 사용자 태스크 흐름을 정의하고, 클라이언트-서버 간 상호작용, 상태 전이, 에러 처리까지 포함한 완전한 동작 명세를 작성합니다.

---

## 입력

- `result/planning/04_user_journey.md`
- `result/planning/07_features.md`
- `result/design/01_screen.md`
- `result/design/02_data_model.md`

---

## 작업 항목

### 1. 태스크 목록

```markdown
## 핵심 태스크

| ID | 태스크 | 분류 | User Story | 중요도 | 복잡도 |
|----|--------|------|------------|--------|--------|
| T01 | 작업 생성 | 핵심 | US-001 | P0 | 중 |
| T02 | 작업 실행 및 모니터링 | 핵심 | US-002 | P0 | 높음 |
| T03 | 실시간 로그 스트리밍 | 핵심 | US-003 | P0 | 높음 |
| T04 | 작업 중지/취소 | 핵심 | US-004 | P0 | 중 |
| T05 | 작업 목록 조회/필터링 | 핵심 | US-005 | P0 | 낮음 |
| T06 | 스케줄 작업 설정 | 부가 | US-006 | P1 | 중 |
| T07 | 프로젝트 관리 | 부가 | US-007 | P1 | 낮음 |
| T08 | 설정 변경 | 부가 | US-008 | P2 | 낮음 |
| T09 | 테마 전환 | 부가 | US-009 | P2 | 낮음 |

### 태스크 분류

| 분류 | 태스크 | 특성 |
|------|--------|------|
| **핵심** | T01-T05 | 제품 핵심 기능, SSE/실시간 처리 |
| **부가** | T06-T09 | 편의 기능, CRUD 중심 |
```

### 2. 작업 생성 플로우 (T01)

```markdown
## T01: 작업 생성 플로우

### 개요
- **목적**: 새로운 Claude Code 자동화 작업 생성 및 실행 시작
- **트리거**: 새 작업 버튼 클릭, /tasks/new 접근, Cmd+K → "새 작업"
- **성공 결과**: 작업 생성 → 작업 상세 페이지로 이동 → SSE 연결 → 실시간 로그
- **실패 결과**: 에러 메시지 표시, 폼 입력 유지

### 플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 액션                                     │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────┐
     │  시작   │
     └────┬────┘
          │
          ▼
┌─────────────────────────────┐
│    "새 작업" 버튼 클릭      │
│    또는 Cmd+K → "새 작업"   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   작업 생성 모달 열림       │
│   (CreateTaskModal)         │
│                             │
│   - defaultType 적용        │
│   - 폼 초기화               │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   1. 작업 유형 선택         │
│   ┌─────┬─────┬─────┬────┐  │
│   │ 앱  │수정 │스케줄│커스텀│ │
│   │생성 │     │     │    │  │
│   └──┬──┴─────┴─────┴────┘  │
└──────┼──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   2. 폼 입력                │
│                             │
│   작업 이름 * [          ]  │
│   경로 *      [        ]🔍 │ ← 실시간 경로 검증 (debounce 500ms)
│   프롬프트 *  [          ]  │
│              [          ]  │
│              [0/10000자]   │
│                             │
│   ▶ 고급 옵션               │
│                             │
└────────────┬────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
[입력 중]        [작업 시작 클릭]
    │                 │
    ▼                 ▼
실시간 검증      ┌──────────────────┐
(경로 API)       │  전체 폼 검증    │
                 │  (Zod + React    │
                 │   Hook Form)     │
                 └────────┬─────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
         [검증 실패]            [검증 성공]
                │                   │
                ▼                   ▼
         ┌─────────────┐     ┌─────────────┐
         │ 필드별 에러 │     │ 버튼 로딩   │
         │ 인라인 표시 │     │ 상태 표시   │
         │             │     │ (disabled)  │
         └─────────────┘     └──────┬──────┘
                                    │
                                    ▼
                            ┌─────────────────┐
                            │  POST /api/tasks │
                            │  API 호출        │
                            └───────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               [201 성공]      [409 충돌]      [4xx/5xx 에러]
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │ 모달 닫기   │  │ "경로에서   │  │ Toast 에러  │
            │ Store 업데이트│ │ 작업 중"    │  │ 메시지 표시 │
            │             │  │ 메시지 표시 │  │             │
            └──────┬──────┘  └─────────────┘  └─────────────┘
                   │
                   ▼
            ┌─────────────────┐
            │ router.push     │
            │ (/tasks/[id])   │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ 작업 상세 페이지│
            │ SSE 연결 시작   │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │     완료        │
            └─────────────────┘
```

### 클라이언트 코드 (React)

```typescript
// components/tasks/CreateTaskModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, type CreateTaskInput } from '@/lib/validations';
import { useTaskStore } from '@/store/taskStore';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TaskType;
}

export function CreateTaskModal({ open, onOpenChange, defaultType = 'create_app' }: CreateTaskModalProps) {
  const router = useRouter();
  const createTask = useTaskStore(state => state.createTask);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pathValidation, setPathValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      name: '',
      type: defaultType,
      projectPath: '',
      prompt: '',
    },
  });

  // 경로 실시간 검증 (debounced)
  const validatePath = useDebouncedCallback(async (path: string) => {
    if (!path) {
      setPathValidation(null);
      return;
    }

    try {
      const res = await fetch('/api/validate/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const { data } = await res.json();
      setPathValidation(data);
    } catch {
      setPathValidation({ valid: false, message: '경로 검증 실패' });
    }
  }, 500);

  const onSubmit = async (data: CreateTaskInput) => {
    setIsSubmitting(true);

    try {
      const task = await createTask(data);
      onOpenChange(false);
      form.reset();
      router.push(`/tasks/${task.id}`);
      toast.success('작업이 생성되었습니다');
    } catch (error) {
      const message = error instanceof Error ? error.message : '작업 생성에 실패했습니다';

      if (message.includes('이미 실행 중')) {
        toast.error('해당 경로에서 이미 작업이 실행 중입니다');
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>새 작업 생성</DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 작업 유형 선택 */}
          <TaskTypeSelector
            value={form.watch('type')}
            onChange={(type) => form.setValue('type', type)}
          />

          {/* 작업 이름 */}
          <FormField
            label="작업 이름"
            error={form.formState.errors.name?.message}
            required
          >
            <Input {...form.register('name')} placeholder="쇼핑몰 앱 생성" />
          </FormField>

          {/* 프로젝트 경로 */}
          <FormField
            label="프로젝트 경로"
            error={form.formState.errors.projectPath?.message || (!pathValidation?.valid && pathValidation?.message)}
            required
          >
            <div className="relative">
              <Input
                {...form.register('projectPath', {
                  onChange: (e) => validatePath(e.target.value),
                })}
                placeholder="/Users/dev/my-project"
              />
              {pathValidation && (
                <span className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  pathValidation.valid ? "text-green-500" : "text-red-500"
                )}>
                  {pathValidation.valid ? '✓' : '✗'}
                </span>
              )}
            </div>
          </FormField>

          {/* 프롬프트 */}
          <FormField
            label="프롬프트"
            error={form.formState.errors.prompt?.message}
            required
          >
            <Textarea
              {...form.register('prompt')}
              placeholder="Next.js 14와 TypeScript를 사용하여..."
              rows={6}
            />
            <div className="text-xs text-muted-foreground text-right">
              {form.watch('prompt')?.length ?? 0}/10000자
            </div>
          </FormField>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (pathValidation !== null && !pathValidation.valid)}
            >
              {isSubmitting ? '생성 중...' : '작업 시작'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 입력 검증 상세

| 필드 | 검증 | 실시간 | 에러 메시지 | UI |
|------|------|--------|------------|-----|
| name | 1-100자, 필수 | ❌ | "작업명을 입력해주세요" | 인라인 에러 |
| type | enum 값 | ✅ | "작업 유형을 선택해주세요" | 선택 하이라이트 |
| projectPath | 유효한 경로, 필수 | ✅ (500ms) | "존재하지 않는 경로" | 아이콘 + 메시지 |
| prompt | 1-10000자, 필수 | ❌ | "프롬프트를 입력해주세요" | 인라인 에러 + 글자수 |
```

### 3. 작업 실행 및 상태 전이 (T02)

```markdown
## T02: 작업 실행 - 상태 다이어그램

### 상태 전이 다이어그램

```
                                 ┌─────────────────────────────────────┐
                                 │                                     │
                                 ▼                                     │
                          ┌──────────────┐                            │
        ──────────────────│   pending    │ 작업 생성됨               │
                          └───────┬──────┘                            │
                                  │                                    │
                                  │ 자동 시작 또는 수동 시작          │
                                  │ (SSE 연결 시)                      │
                                  ▼                                    │
                          ┌──────────────┐                            │
           ┌──────────────│   running    │◀────────────────┐         │
           │              └───────┬──────┘                 │         │
           │                      │                        │ retry   │
           │          ┌───────────┼───────────┐           │         │
           │          │           │           │           │         │
           ▼          ▼           ▼           ▼           │         │
      [timeout]  [정상 완료]  [에러 발생] [사용자 취소]   │         │
           │          │           │           │           │         │
           │          ▼           ▼           ▼           │         │
           │   ┌─────────┐  ┌─────────┐  ┌──────────┐    │         │
           │   │completed│  │ failed  │  │cancelled │    │         │
           │   └─────────┘  └────┬────┘  └────┬─────┘    │         │
           │                     │            │          │         │
           └─────────────────────┴────────────┴──────────┘         │
                                                                    │
                              재시작 (retry) ───────────────────────┘
```

### 상태별 정의

| 상태 | 조건 | 저장 데이터 | UI 표시 | 가능한 액션 |
|------|------|-------------|---------|-------------|
| pending | 작업 생성됨, 아직 실행 안 됨 | task | 대기 아이콘, "대기 중" | 시작, 삭제 |
| running | 프로세스 실행 중 | task, logs, pid | 로딩 애니메이션, 진행률, 로그 | 중지 |
| completed | 정상 완료 (exit code 0) | task, logs, result | 체크 아이콘, 결과 | 재시작, 삭제 |
| failed | 에러 발생 (exit code != 0) | task, logs, error | X 아이콘, 에러 메시지 | 재시작, 삭제 |
| cancelled | 사용자가 중지 | task, logs | 취소 아이콘 | 재시작, 삭제 |

### 상태 전이 매트릭스

| 현재 상태 | 이벤트 | 다음 상태 | 서버 액션 | 클라이언트 액션 |
|----------|--------|----------|----------|----------------|
| pending | stream_connect | running | spawnProcess() | connectSSE() |
| pending | delete | (삭제됨) | deleteTask() | removeFromStore() |
| running | log_received | running | appendLog() | addLogToUI() |
| running | progress_update | running | updateProgress() | updateProgressBar() |
| running | process_exit_0 | completed | saveResult() | showSuccess() |
| running | process_exit_N | failed | saveError() | showError() |
| running | user_stop | cancelled | killProcess() | disconnectSSE() |
| running | timeout | failed | killProcess(), saveError() | showTimeout() |
| failed | retry | running | spawnProcess() | reconnectSSE() |
| cancelled | retry | running | spawnProcess() | reconnectSSE() |
| completed | retry | running | spawnProcess() | reconnectSSE() |

### TypeScript 구현

```typescript
// lib/state-machine.ts
import { TaskStatus } from '@/types/entities';

type TaskEvent =
  | 'stream_connect'
  | 'log_received'
  | 'progress_update'
  | 'process_exit_success'
  | 'process_exit_error'
  | 'user_stop'
  | 'timeout'
  | 'retry'
  | 'delete';

type TransitionResult = {
  nextStatus: TaskStatus;
  sideEffects: Array<() => Promise<void>>;
};

const transitions: Record<TaskStatus, Partial<Record<TaskEvent, TransitionResult>>> = {
  pending: {
    stream_connect: {
      nextStatus: 'running',
      sideEffects: [],
    },
    delete: {
      nextStatus: 'pending', // 실제로는 삭제됨
      sideEffects: [],
    },
  },
  running: {
    process_exit_success: {
      nextStatus: 'completed',
      sideEffects: [],
    },
    process_exit_error: {
      nextStatus: 'failed',
      sideEffects: [],
    },
    user_stop: {
      nextStatus: 'cancelled',
      sideEffects: [],
    },
    timeout: {
      nextStatus: 'failed',
      sideEffects: [],
    },
  },
  completed: {
    retry: {
      nextStatus: 'running',
      sideEffects: [],
    },
    delete: {
      nextStatus: 'completed',
      sideEffects: [],
    },
  },
  failed: {
    retry: {
      nextStatus: 'running',
      sideEffects: [],
    },
    delete: {
      nextStatus: 'failed',
      sideEffects: [],
    },
  },
  cancelled: {
    retry: {
      nextStatus: 'running',
      sideEffects: [],
    },
    delete: {
      nextStatus: 'cancelled',
      sideEffects: [],
    },
  },
};

export function getNextStatus(current: TaskStatus, event: TaskEvent): TaskStatus | null {
  const transition = transitions[current]?.[event];
  return transition?.nextStatus ?? null;
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['running'],
    running: ['completed', 'failed', 'cancelled'],
    completed: ['running'], // retry
    failed: ['running'], // retry
    cancelled: ['running'], // retry
  };

  return validTransitions[from]?.includes(to) ?? false;
}
```
```

### 4. 실시간 로그 스트리밍 (T03)

```markdown
## T03: 실시간 로그 스트리밍

### 시퀀스 다이어그램

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ 브라우저│     │ React  │     │ Next.js│     │Process │     │ Claude │
│        │     │ 컴포넌트│     │   API  │     │Manager │     │  CLI   │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │ 페이지 접근  │              │              │              │
    │─────────────▶│              │              │              │
    │              │              │              │              │
    │              │ useEffect    │              │              │
    │              │ 마운트       │              │              │
    │              │──────┐      │              │              │
    │              │      │      │              │              │
    │              │◀─────┘      │              │              │
    │              │              │              │              │
    │              │ GET /tasks/id│              │              │
    │              │─────────────▶│              │              │
    │              │              │              │              │
    │              │   Task 데이터 │              │              │
    │              │◀─────────────│              │              │
    │              │              │              │              │
    │              │ status=running?              │              │
    │              │──────┐      │              │              │
    │              │      │      │              │              │
    │              │◀─────┘      │              │              │
    │              │              │              │              │
    │              │ SSE 연결     │              │              │
    │              │ /tasks/id/stream             │              │
    │              │══════════════▶              │              │
    │              │              │              │              │
    │              │              │ 기존 로그 전송│              │
    │              │◀═════════════│              │              │
    │              │              │              │              │
    │              │              │ status=pending│              │
    │              │              │─────────────▶│              │
    │              │              │              │              │
    │              │              │              │ spawn claude │
    │              │              │              │─────────────▶│
    │              │              │              │              │
    │              │              │ status: running              │
    │              │◀═════════════│◀─────────────│              │
    │              │              │              │              │
    │  UI 업데이트 │              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
    │              │              │              │    stdout    │
    │              │              │              │◀ ─ ─ ─ ─ ─ ─│
    │              │              │              │              │
    │              │              │  log event   │              │
    │              │◀═════════════│◀─────────────│              │
    │              │              │              │              │
    │  로그 추가   │              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
    │    ... (반복) ...           │              │              │
    │              │              │              │              │
    │              │              │              │    exit 0    │
    │              │              │              │◀─────────────│
    │              │              │              │              │
    │              │              │ complete event              │
    │              │◀═════════════│◀─────────────│              │
    │              │              │              │              │
    │  완료 표시   │              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
    │              │ SSE 종료     │              │              │
    │              │══════════════▶              │              │
```

### SSE 이벤트 타입

```typescript
// types/events.ts

// SSE 이벤트 타입 유니온
export type SSEEvent =
  | { type: 'log'; log: Log }
  | { type: 'progress'; percent: number }
  | { type: 'status'; status: TaskStatus }
  | { type: 'complete'; result: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'heartbeat' };

// 이벤트 예시
const events = {
  log: {
    type: 'log',
    log: {
      id: 'log_001',
      level: 'info',
      message: 'Next.js 프로젝트 생성 중...',
      timestamp: '2024-01-15T10:30:05.000Z',
    },
  },
  progress: {
    type: 'progress',
    percent: 45,
  },
  status: {
    type: 'status',
    status: 'running',
  },
  complete: {
    type: 'complete',
    result: '쇼핑몰 앱이 성공적으로 생성되었습니다.',
  },
  error: {
    type: 'error',
    message: '프로세스 실행 중 오류가 발생했습니다.',
    code: 'PROCESS_ERROR',
  },
  heartbeat: {
    type: 'heartbeat',
  },
};
```

### 클라이언트 SSE 연결 훅

```typescript
// hooks/useTaskStream.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { SSEEvent, Log, TaskStatus } from '@/types';

interface UseTaskStreamOptions {
  taskId: string;
  enabled?: boolean;
  onLog?: (log: Log) => void;
  onProgress?: (percent: number) => void;
  onStatusChange?: (status: TaskStatus) => void;
  onComplete?: (result: string) => void;
  onError?: (message: string) => void;
}

interface UseTaskStreamReturn {
  logs: Log[];
  progress: number;
  status: TaskStatus | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useTaskStream({
  taskId,
  enabled = true,
  onLog,
  onProgress,
  onStatusChange,
  onComplete,
  onError,
}: UseTaskStreamOptions): UseTaskStreamReturn {
  const [logs, setLogs] = useState<Log[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      retryCountRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'log':
            setLogs(prev => [...prev, data.log]);
            onLog?.(data.log);
            break;

          case 'progress':
            setProgress(data.percent);
            onProgress?.(data.percent);
            break;

          case 'status':
            setStatus(data.status);
            onStatusChange?.(data.status);
            break;

          case 'complete':
            setStatus('completed');
            onComplete?.(data.result);
            eventSource.close();
            setIsConnected(false);
            break;

          case 'error':
            setStatus('failed');
            setError(data.message);
            onError?.(data.message);
            eventSource.close();
            setIsConnected(false);
            break;

          case 'heartbeat':
            // 연결 유지용, 무시
            break;
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);

      // 재연결 (exponential backoff)
      if (retryCountRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          connect();
        }, delay);
      } else {
        setError('연결이 끊어졌습니다. 새로고침해주세요.');
      }
    };
  }, [taskId, onLog, onProgress, onStatusChange, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return {
    logs,
    progress,
    status,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
```

### 서버 SSE 구현

```typescript
// app/api/tasks/[id]/stream/route.ts
import { NextRequest } from 'next/server';
import { getTask, getTaskLogs, updateTask, appendLog } from '@/lib/storage';
import { processManager } from '@/lib/process-manager';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const task = await getTask(taskId);

  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 이벤트 전송 헬퍼
      const sendEvent = (data: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 기존 로그 전송
      const existingLogs = await getTaskLogs(taskId);
      for (const log of existingLogs) {
        sendEvent({ type: 'log', log });
      }

      // 현재 상태 전송
      sendEvent({ type: 'status', status: task.status });
      sendEvent({ type: 'progress', percent: task.progress ?? 0 });

      // 이미 완료된 작업
      if (task.status === 'completed') {
        sendEvent({ type: 'complete', result: task.result ?? '' });
        controller.close();
        return;
      }

      if (task.status === 'failed') {
        sendEvent({ type: 'error', message: task.error ?? 'Unknown error' });
        controller.close();
        return;
      }

      if (task.status === 'cancelled') {
        sendEvent({ type: 'error', message: '작업이 취소되었습니다.' });
        controller.close();
        return;
      }

      // 대기 중이면 프로세스 시작
      if (task.status === 'pending') {
        await updateTask(taskId, {
          status: 'running',
          startedAt: new Date().toISOString(),
        });
        sendEvent({ type: 'status', status: 'running' });

        processManager.spawn(taskId, {
          type: task.type,
          projectPath: task.projectPath,
          prompt: task.prompt,
        });
      }

      // 프로세스 이벤트 리스너
      const onLog = async (id: string, level: string, message: string) => {
        if (id !== taskId) return;

        const log = {
          id: nanoid(),
          taskId,
          level: level as LogLevel,
          message,
          timestamp: new Date().toISOString(),
        };

        await appendLog(taskId, log);
        sendEvent({ type: 'log', log });
      };

      const onProgress = async (id: string, percent: number) => {
        if (id !== taskId) return;
        await updateTask(taskId, { progress: percent });
        sendEvent({ type: 'progress', percent });
      };

      const onComplete = async (id: string, result: string) => {
        if (id !== taskId) return;
        await updateTask(taskId, {
          status: 'completed',
          result,
          progress: 100,
          completedAt: new Date().toISOString(),
        });
        sendEvent({ type: 'complete', result });
        cleanup();
        controller.close();
      };

      const onError = async (id: string, message: string) => {
        if (id !== taskId) return;
        await updateTask(taskId, {
          status: 'failed',
          error: message,
          completedAt: new Date().toISOString(),
        });
        sendEvent({ type: 'error', message });
        cleanup();
        controller.close();
      };

      // 이벤트 등록
      processManager.on('log', onLog);
      processManager.on('progress', onProgress);
      processManager.on('complete', onComplete);
      processManager.on('error', onError);

      // 하트비트 (30초마다)
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat' });
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        processManager.off('log', onLog);
        processManager.off('progress', onProgress);
        processManager.off('complete', onComplete);
        processManager.off('error', onError);
      };

      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx 버퍼링 비활성화
    },
  });
}
```
```

### 5. 에러 처리 전략

```markdown
## 에러 처리 전략

### 에러 분류

| 분류 | 코드 | HTTP | 원인 | 복구 방법 |
|------|------|------|------|----------|
| 검증 에러 | VALIDATION_ERROR | 422 | 입력값 오류 | 사용자 수정 |
| 경로 에러 | PATH_NOT_FOUND | 400 | 경로 없음 | 경로 수정 |
| 중복 에러 | TASK_CONFLICT | 409 | 동일 경로 실행 중 | 대기 |
| 프로세스 에러 | PROCESS_ERROR | 500 | Claude 실행 실패 | 재시도 |
| 타임아웃 | TIMEOUT | 500 | 작업 시간 초과 | 재시도 |
| 네트워크 에러 | NETWORK_ERROR | - | 연결 끊김 | 자동 재연결 |
| 서버 에러 | INTERNAL_ERROR | 500 | 서버 오류 | 재시도 |

### 에러 UI 패턴

| 상황 | UI 컴포넌트 | 지속 시간 | 액션 |
|------|------------|----------|------|
| 폼 검증 실패 | 인라인 필드 에러 | 수정시까지 | 자동 포커스 |
| API 에러 (경미) | Toast | 3-5초 | 닫기 |
| API 에러 (중요) | Toast + 재시도 | 수동 닫기 | 재시도 버튼 |
| SSE 연결 끊김 | 상단 배너 | 복구시까지 | 자동 재연결 |
| 전체 로딩 실패 | 에러 컴포넌트 | 영구 | 재시도 버튼 |

### 에러 처리 코드

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromResponse(response: any): AppError {
    const { error } = response;
    return new AppError(
      error.code ?? 'UNKNOWN_ERROR',
      error.message ?? '알 수 없는 오류가 발생했습니다.',
      error.statusCode,
      error.details
    );
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

// 에러 메시지 매핑
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: '입력값을 확인해주세요.',
  PATH_NOT_FOUND: '존재하지 않는 경로입니다.',
  TASK_CONFLICT: '해당 경로에서 이미 작업이 실행 중입니다.',
  PROCESS_ERROR: '작업 실행 중 오류가 발생했습니다.',
  TIMEOUT: '작업 시간이 초과되었습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export function getUserMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR;
}
```

```typescript
// 에러 바운더리
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-6xl">😵</div>
          <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
          <p className="text-muted-foreground">
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            새로고침
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```
```

### 6. 동시성 처리

```markdown
## 동시성 처리

### 시나리오별 처리

| 시나리오 | 처리 방법 | 구현 |
|----------|----------|------|
| 동일 경로 중복 실행 | 거부 (409) | 경로 잠금 (pathLocks) |
| 여러 작업 동시 실행 | 최대 N개 제한 | maxConcurrentTasks 설정 |
| 중복 클릭 방지 | 버튼 비활성화 | disabled + isLoading |
| 페이지 새로고침 | SSE 재연결 | 기존 상태 유지 |
| 브라우저 종료 | 백그라운드 계속 | 프로세스 유지 |
| 탭 비활성화 | SSE 유지 | visibility API |

### 경로 잠금 구현

```typescript
// lib/locks.ts
const pathLocks = new Map<string, { taskId: string; lockedAt: Date }>();

export function acquireLock(path: string, taskId: string): boolean {
  // 기존 잠금 확인
  const existing = pathLocks.get(path);
  if (existing) {
    // 1시간 이상 된 잠금은 해제 (안전장치)
    const age = Date.now() - existing.lockedAt.getTime();
    if (age < 60 * 60 * 1000) {
      return false;
    }
  }

  pathLocks.set(path, { taskId, lockedAt: new Date() });
  return true;
}

export function releaseLock(path: string, taskId: string): void {
  const lock = pathLocks.get(path);
  if (lock?.taskId === taskId) {
    pathLocks.delete(path);
  }
}

export function isLocked(path: string): boolean {
  return pathLocks.has(path);
}

export function getLockedBy(path: string): string | null {
  return pathLocks.get(path)?.taskId ?? null;
}
```

### 동시 실행 제한

```typescript
// lib/concurrency.ts
import { getTasks } from '@/lib/storage';

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_TASKS ?? '3', 10);

export async function canStartNewTask(): Promise<boolean> {
  const tasks = await getTasks();
  const runningCount = tasks.filter(t => t.status === 'running').length;
  return runningCount < MAX_CONCURRENT;
}

export async function getQueuePosition(): Promise<number> {
  const tasks = await getTasks();
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  return pendingCount;
}
```
```

---

## 산출물 템플릿

`result/design/03_task_flow.md`에 작성:

```markdown
# 태스크 플로우

## 1. 태스크 목록

| ID | 태스크 | 분류 | 중요도 | 복잡도 |
|----|--------|------|--------|--------|
| T01 | | | | |

---

## 2. 태스크 상세

### T01: [태스크명]

**개요**
- 목적:
- 트리거:
- 성공 결과:
- 실패 결과:

**플로우 다이어그램**
[다이어그램]

**클라이언트 코드**
```typescript
// React 컴포넌트/훅
```

**서버 코드**
```typescript
// API Route
```

**상태 전이**
| 현재 상태 | 이벤트 | 다음 상태 |
|----------|--------|----------|
| | | |

---

### T02: [태스크명]
[동일 형식]

---

## 3. SSE 스트리밍

### 이벤트 타입
| 타입 | 데이터 | 용도 |
|------|--------|------|
| | | |

### 클라이언트 구현
```typescript
// useTaskStream 훅
```

### 서버 구현
```typescript
// SSE Route
```

---

## 4. 에러 처리

| 에러 코드 | HTTP | 사용자 메시지 | UI |
|-----------|------|--------------|-----|
| | | | |

---

## 5. 동시성 처리

| 시나리오 | 처리 방법 |
|----------|----------|
| | |

---

## 다음 단계
→ 2.4 API 설계
```

---

## 체크리스트

- [ ] 핵심 태스크 5개 이상 정의
- [ ] 각 태스크에 플로우 다이어그램 있음
- [ ] 상태 전이 다이어그램 있음
- [ ] 시퀀스 다이어그램 있음 (SSE)
- [ ] 클라이언트 코드 예시 있음
- [ ] 서버 코드 예시 있음
- [ ] 에러 처리 정의됨
- [ ] SSE 이벤트 타입 정의됨
- [ ] 재연결 전략 정의됨
- [ ] 동시성 처리 정의됨
- [ ] 입력 검증 규칙 있음

---

## 다음 단계

→ `04_api.md` (API 설계)
