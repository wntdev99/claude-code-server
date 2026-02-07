# Task 관리

## 개요

Task의 생명주기 관리 및 상태 추적 방법을 설명합니다.

## Task 생명주기

### 상태 전이

```
pending → in_progress → waiting_review → in_progress → ... → completed
                ↓
           waiting_dependency
           waiting_question
           paused
           failed
           cancelled
```

### 상태 정의

```typescript
// types/task.ts
export type TaskStatus =
  | 'pending'             // 대기 중 (생성됨, 아직 시작 안함)
  | 'in_progress'         // 진행 중
  | 'waiting_review'      // 리뷰 대기
  | 'waiting_dependency'  // 의존성 대기
  | 'waiting_question'    // 사용자 질문 대기
  | 'paused'              // 일시 중지
  | 'completed'           // 완료
  | 'failed'              // 실패
  | 'cancelled';          // 취소됨

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  description: string;
  status: TaskStatus;
  progress: number;        // 0-100
  currentPhase: number | null;
  currentStep: string | null;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type TaskType = 'create_app' | 'modify_app' | 'workflow' | 'custom';
```

## Task 생성

### API Handler

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, description } = body;

    // 검증
    if (!title || !type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validTypes: TaskType[] = ['create_app', 'modify_app', 'workflow', 'custom'];
    if (!validTypes.includes(type as TaskType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Task 생성
    const task = await db.task.create({
      data: {
        title,
        type,
        description,
        status: 'pending',
        progress: 0,
        tokensUsed: 0,
      },
    });

    // 작업 디렉토리 준비
    await prepareWorkingDirectory(task.id);

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

### 작업 디렉토리 준비

```typescript
// lib/tasks/workspace.ts
import fs from 'fs/promises';
import path from 'path';

export async function prepareWorkingDirectory(taskId: string): Promise<string> {
  const baseDir = '/projects';
  const workingDir = path.join(baseDir, taskId);

  try {
    // 디렉토리 생성
    await fs.mkdir(workingDir, { recursive: true });

    // 하위 디렉토리
    await fs.mkdir(path.join(workingDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(workingDir, 'docs/planning'), { recursive: true });
    await fs.mkdir(path.join(workingDir, 'docs/design'), { recursive: true });
    await fs.mkdir(path.join(workingDir, '.logs'), { recursive: true });
    await fs.mkdir(path.join(workingDir, '.checkpoints'), { recursive: true });

    console.log(`Working directory prepared: ${workingDir}`);
    return workingDir;
  } catch (error) {
    console.error(`Failed to prepare working directory for ${taskId}:`, error);
    throw error;
  }
}
```

## Task 조회

### 목록 조회

```typescript
// app/api/tasks/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as TaskStatus | null;
    const type = searchParams.get('type') as TaskType | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // 조회
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          phases: {
            orderBy: { phase: 'asc' },
          },
        },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
```

### 단일 조회

```typescript
// app/api/tasks/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: params.id },
      include: {
        phases: {
          orderBy: { phase: 'asc' },
        },
        reviews: {
          orderBy: { requestedAt: 'desc' },
        },
        dependencies: {
          orderBy: { requestedAt: 'desc' },
        },
        questions: {
          orderBy: { askedAt: 'desc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
```

## Task 실행

### 실행 시작

```typescript
// app/api/tasks/[id]/execute/route.ts
import { createAgent, startAgentExecution } from '@/lib/agent/executor';
import { buildTaskPrompt } from '@/lib/agent/prompts';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 상태 확인
    if (task.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Task is already running' },
        { status: 400 }
      );
    }

    if (task.status === 'completed') {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 400 }
      );
    }

    // 에이전트 생성
    const agent = await createAgent({
      taskId: task.id,
      taskType: task.type,
      workingDir: `/projects/${task.id}`,
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // 프롬프트 전달
    const prompt = buildTaskPrompt(task);
    startAgentExecution({ taskId: task.id, prompt });

    // Task 상태 업데이트
    await db.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task execution started',
      data: { taskId: task.id, status: 'in_progress' },
    });
  } catch (error) {
    console.error('Failed to execute task:', error);
    return NextResponse.json(
      { error: 'Failed to execute task' },
      { status: 500 }
    );
  }
}
```

## Task 상태 업데이트

### 상태 업데이트 함수

```typescript
// lib/tasks/status.ts
export async function updateTaskStatus(
  taskId: string,
  updates: Partial<Task>
): Promise<Task | null> {
  try {
    const task = await db.task.update({
      where: { id: taskId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    // SSE로 클라이언트에 알림
    notifyTaskUpdate(taskId, task);

    return task;
  } catch (error) {
    console.error(`Failed to update task ${taskId}:`, error);
    return null;
  }
}
```

### SSE 알림

```typescript
// lib/tasks/notifications.ts
import { EventEmitter } from 'events';

const taskEmitter = new EventEmitter();

export function notifyTaskUpdate(taskId: string, task: Task) {
  taskEmitter.emit(`task:${taskId}`, {
    type: 'task_update',
    data: task,
  });
}

export function subscribeToTask(taskId: string, callback: (event: any) => void) {
  const listener = (event: any) => callback(event);
  taskEmitter.on(`task:${taskId}`, listener);

  // Cleanup function
  return () => {
    taskEmitter.off(`task:${taskId}`, listener);
  };
}
```

## Task 삭제

### 삭제 처리

```typescript
// app/api/tasks/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 실행 중이면 에이전트 종료
    if (task.status === 'in_progress') {
      await terminateAgent(params.id);
    }

    // 작업 디렉토리 삭제
    await cleanupWorkingDirectory(params.id);

    // DB에서 삭제 (Cascade로 관련 데이터도 삭제)
    await db.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
```

### 작업 디렉토리 정리

```typescript
// lib/tasks/workspace.ts
export async function cleanupWorkingDirectory(taskId: string): Promise<void> {
  const workingDir = path.join('/projects', taskId);

  try {
    await fs.rm(workingDir, { recursive: true, force: true });
    console.log(`Working directory cleaned up: ${workingDir}`);
  } catch (error) {
    console.error(`Failed to cleanup working directory for ${taskId}:`, error);
  }
}
```

## 진행 상황 추적

### 진행률 계산

```typescript
// lib/tasks/progress.ts
export function calculateProgress(task: Task): number {
  const { type, currentPhase } = task;

  // Task 타입별 총 Phase 수
  const totalPhases: Record<TaskType, number> = {
    create_app: 4,
    modify_app: 4,
    workflow: 4,
    custom: 1,
  };

  const total = totalPhases[type] || 1;

  if (!currentPhase) {
    return 0;
  }

  // Phase 완료 기준 진행률
  return Math.floor((currentPhase / total) * 100);
}
```

### 자동 진행률 업데이트

```typescript
// lib/agent/handlers.ts
export async function handlePhaseCompletion(taskId: string, phase: number) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const progress = calculateProgress({ ...task, currentPhase: phase });

  await updateTaskStatus(taskId, {
    currentPhase: phase,
    progress,
  });
}
```

## 에러 처리

### Task 실패 처리

```typescript
// lib/tasks/error.ts
export async function handleTaskFailure(
  taskId: string,
  error: Error,
  recoverable: boolean = false
) {
  console.error(`Task ${taskId} failed:`, error);

  // Checkpoint 생성
  await createCheckpoint(taskId, 'error', {
    error: error.message,
    stack: error.stack,
    recoverable,
  });

  if (!recoverable) {
    // 복구 불가능한 에러 - 실패 처리
    await updateTaskStatus(taskId, {
      status: 'failed',
      completedAt: new Date(),
    });

    // 에이전트 종료
    await terminateAgent(taskId);
  } else {
    // 복구 가능한 에러 - 재시도
    await sleep(5000);
    const success = await restartFromCheckpoint(taskId);

    if (!success) {
      await updateTaskStatus(taskId, {
        status: 'failed',
        completedAt: new Date(),
      });
    }
  }
}
```

## 통계 및 모니터링

### Task 통계

```typescript
// lib/tasks/stats.ts
export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byType: Record<TaskType, number>;
  avgCompletionTime: number;
  avgTokensUsed: number;
}

export async function getTaskStats(): Promise<TaskStats> {
  const tasks = await db.task.findMany();

  const byStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const byType = tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<TaskType, number>);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const avgCompletionTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => {
        if (!t.startedAt || !t.completedAt) return sum;
        return sum + (t.completedAt.getTime() - t.startedAt.getTime());
      }, 0) / completedTasks.length
    : 0;

  const avgTokensUsed = tasks.length > 0
    ? tasks.reduce((sum, t) => sum + t.tokensUsed, 0) / tasks.length
    : 0;

  return {
    total: tasks.length,
    byStatus,
    byType,
    avgCompletionTime,
    avgTokensUsed,
  };
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`process-management.md`** - 에이전트 프로세스 생성 및 제어
2. **`../api/tasks-api.md`** - Tasks API 명세
3. **`review-system.md`** - 리뷰 시스템 연동
4. **`../../CLAUDE.md`** - 웹 서버 기능 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Features 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`process-management.md`** - 프로세스 관리
4. **`review-system.md`** - 리뷰 시스템

## 다음 단계

- **Process Management**: `process-management.md` - 에이전트 프로세스 관리
- **Review System**: `review-system.md` - 리뷰 시스템
- **Tasks API**: `../api/tasks-api.md` - API 명세

## 관련 문서

- **Process Management**: `process-management.md`
- **Review System**: `review-system.md`
- **Tasks API**: `../api/tasks-api.md`
- **SSE Streaming**: `sse-streaming.md`
