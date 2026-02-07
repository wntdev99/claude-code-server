# Task 우선순위 및 큐 관리

## 개요

여러 Task가 대기 중일 때 실행 순서를 결정하고 큐를 관리하는 방법을 설명합니다.

> **목적**: 제한된 리소스 (동시 실행 에이전트 수, API 토큰)를 효율적으로 분배

## 우선순위 시스템

### 우선순위 레벨

```typescript
// agent-manager/types/priority.ts
export type Priority =
  | 'critical'  // 4 - 긴급 (즉시 실행)
  | 'high'      // 3 - 높음
  | 'normal'    // 2 - 보통 (기본값)
  | 'low';      // 1 - 낮음

export interface TaskQueueItem {
  taskId: string;
  priority: Priority;
  createdAt: Date;
  scheduledFor?: Date; // 예약 실행
  dependencies: string[]; // 의존하는 다른 Task
}
```

### 우선순위 결정 요인

```typescript
// agent-manager/lib/queue/priority-calculator.ts
export function calculatePriority(task: Task): Priority {
  let score = 2; // normal

  // 1. Task 타입에 따른 가중치
  if (task.type === 'custom') {
    score += 1; // 빠른 응답 필요
  }

  // 2. 생성 시간 (오래 대기한 Task 우선)
  const waitTime = Date.now() - task.createdAt.getTime();
  const hoursWaiting = waitTime / (1000 * 60 * 60);

  if (hoursWaiting > 24) {
    score += 2; // 하루 이상 대기
  } else if (hoursWaiting > 12) {
    score += 1; // 12시간 이상 대기
  }

  // 3. 사용자 설정 우선순위
  if (task.userPriority) {
    score += priorityToScore(task.userPriority);
  }

  // 4. 재시도 중인 Task (복구)
  if (task.retryCount > 0) {
    score += 1;
  }

  // 점수를 우선순위로 변환
  if (score >= 4) return 'critical';
  if (score === 3) return 'high';
  if (score === 2) return 'normal';
  return 'low';
}

function priorityToScore(priority: Priority): number {
  const map = { critical: 2, high: 1, normal: 0, low: -1 };
  return map[priority];
}
```

## Task 큐 구현

### 우선순위 큐

```typescript
// agent-manager/lib/queue/task-queue.ts
export class TaskQueue {
  private queue: TaskQueueItem[] = [];
  private maxConcurrent: number = 3; // 최대 동시 실행 수
  private running: Set<string> = new Set();

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  // Task 추가
  enqueue(item: TaskQueueItem): void {
    this.queue.push(item);
    this.sort();
  }

  // 우선순위 정렬
  private sort(): void {
    this.queue.sort((a, b) => {
      // 1. 우선순위 비교
      const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      // 2. 생성 시간 비교 (FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private getPriorityValue(priority: Priority): number {
    const map = { critical: 4, high: 3, normal: 2, low: 1 };
    return map[priority];
  }

  // 다음 실행할 Task 가져오기
  dequeue(): TaskQueueItem | null {
    if (this.running.size >= this.maxConcurrent) {
      return null; // 동시 실행 제한
    }

    // 의존성 체크하며 실행 가능한 Task 찾기
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];

      // 예약 시간 체크
      if (item.scheduledFor && item.scheduledFor.getTime() > Date.now()) {
        continue;
      }

      // 의존성 체크
      if (this.hasPendingDependencies(item)) {
        continue;
      }

      // 실행 가능!
      this.queue.splice(i, 1);
      this.running.add(item.taskId);
      return item;
    }

    return null;
  }

  // 의존성 체크
  private hasPendingDependencies(item: TaskQueueItem): boolean {
    if (item.dependencies.length === 0) return false;

    // 의존하는 Task가 완료되지 않았는지 확인
    return item.dependencies.some(depId => {
      const depStatus = getTaskStatus(depId);
      return depStatus !== 'completed';
    });
  }

  // Task 완료 처리
  markCompleted(taskId: string): void {
    this.running.delete(taskId);
    // 다음 Task 실행 트리거
    this.processNext();
  }

  // 다음 Task 처리
  private async processNext(): Promise<void> {
    const item = this.dequeue();
    if (item) {
      await executeTask(item.taskId);
    }
  }

  // 큐 상태
  getStatus() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      available: this.maxConcurrent - this.running.size,
      items: this.queue.map(item => ({
        taskId: item.taskId,
        priority: item.priority,
        waitingFor: item.dependencies.length > 0
          ? item.dependencies
          : undefined,
      })),
    };
  }

  // Task 제거
  remove(taskId: string): boolean {
    const index = this.queue.findIndex(item => item.taskId === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  // 우선순위 변경
  updatePriority(taskId: string, newPriority: Priority): boolean {
    const item = this.queue.find(item => item.taskId === taskId);
    if (item) {
      item.priority = newPriority;
      this.sort();
      return true;
    }
    return false;
  }
}
```

### 큐 매니저

```typescript
// agent-manager/lib/queue/queue-manager.ts
const globalQueue = new TaskQueue(3);

export function addToQueue(taskId: string, priority?: Priority): void {
  const task = getTask(taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    return;
  }

  const calculatedPriority = priority || calculatePriority(task);

  const item: TaskQueueItem = {
    taskId,
    priority: calculatedPriority,
    createdAt: task.createdAt,
    dependencies: task.dependencies || [],
  };

  globalQueue.enqueue(item);

  console.log(`Task ${taskId} added to queue with priority ${calculatedPriority}`);

  // DB 업데이트
  db.task.update({
    where: { id: taskId },
    data: {
      status: 'pending',
      priority: calculatedPriority,
    },
  });

  // 바로 처리 시도
  processQueue();
}

export async function processQueue(): Promise<void> {
  while (true) {
    const item = globalQueue.dequeue();
    if (!item) break;

    console.log(`Starting task ${item.taskId} from queue`);

    try {
      await startTask(item.taskId);
    } catch (error) {
      console.error(`Failed to start task ${item.taskId}:`, error);
      globalQueue.markCompleted(item.taskId);
    }
  }
}

export function onTaskComplete(taskId: string): void {
  globalQueue.markCompleted(taskId);
  processQueue(); // 다음 Task 처리
}
```

## 스케줄링

### 예약 실행

```typescript
// agent-manager/lib/queue/scheduler.ts
export function scheduleTask(
  taskId: string,
  scheduledFor: Date
): void {
  const task = getTask(taskId);
  if (!task) return;

  const item: TaskQueueItem = {
    taskId,
    priority: calculatePriority(task),
    createdAt: task.createdAt,
    scheduledFor,
    dependencies: [],
  };

  globalQueue.enqueue(item);

  // 정기적으로 스케줄 확인
  checkScheduledTasks();
}

// 1분마다 스케줄된 Task 확인
setInterval(checkScheduledTasks, 60000);

function checkScheduledTasks(): void {
  processQueue(); // dequeue에서 scheduledFor 체크함
}
```

### 반복 실행 (Recurring Tasks)

```typescript
// agent-manager/lib/queue/recurring.ts
export interface RecurringTask {
  taskId: string;
  schedule: string; // cron expression
  lastRun: Date | null;
  nextRun: Date;
}

const recurringTasks = new Map<string, RecurringTask>();

export function scheduleRecurring(
  taskId: string,
  cronSchedule: string
): void {
  const nextRun = calculateNextRun(cronSchedule);

  recurringTasks.set(taskId, {
    taskId,
    schedule: cronSchedule,
    lastRun: null,
    nextRun,
  });
}

// 반복 Task 실행 체크
setInterval(() => {
  const now = new Date();

  for (const [taskId, recurring] of recurringTasks.entries()) {
    if (recurring.nextRun <= now) {
      // Task 생성 및 큐 추가
      const newTaskId = createTaskFromTemplate(taskId);
      addToQueue(newTaskId, 'normal');

      // 다음 실행 시간 계산
      recurring.lastRun = now;
      recurring.nextRun = calculateNextRun(recurring.schedule);
    }
  }
}, 60000); // 1분마다 체크
```

## 의존성 관리

### Task 의존성

```typescript
// agent-manager/lib/queue/dependencies.ts
export function addDependency(taskId: string, dependsOn: string): void {
  const item = globalQueue.queue.find(i => i.taskId === taskId);
  if (item) {
    item.dependencies.push(dependsOn);
  }

  // DB에도 저장
  db.task.update({
    where: { id: taskId },
    data: {
      dependencies: {
        push: dependsOn,
      },
    },
  });
}

export function onTaskComplete(taskId: string): void {
  // 이 Task에 의존하는 Task들이 실행 가능해질 수 있음
  globalQueue.markCompleted(taskId);
  processQueue();
}
```

## 리소스 관리

### 동적 동시 실행 수 조정

```typescript
// agent-manager/lib/queue/resource-manager.ts
export function adjustConcurrency(): void {
  const systemLoad = getSystemLoad();

  if (systemLoad < 0.3) {
    // 부하 낮음 → 동시 실행 수 증가
    globalQueue.maxConcurrent = 5;
  } else if (systemLoad < 0.7) {
    // 중간 부하 → 기본값
    globalQueue.maxConcurrent = 3;
  } else {
    // 부하 높음 → 동시 실행 수 감소
    globalQueue.maxConcurrent = 1;
  }

  console.log(`Concurrency adjusted to ${globalQueue.maxConcurrent}`);
}

// 5분마다 조정
setInterval(adjustConcurrency, 5 * 60 * 1000);
```

## 큐 모니터링

### 큐 상태 API

```typescript
// app/api/queue/status/route.ts
export async function GET() {
  const status = globalQueue.getStatus();

  return NextResponse.json({
    success: true,
    data: {
      ...status,
      maxConcurrent: globalQueue.maxConcurrent,
      estimatedWaitTime: estimateWaitTime(status.queued),
    },
  });
}

function estimateWaitTime(queuedCount: number): number {
  const avgTaskDuration = 10 * 60; // 10분 (초)
  const concurrency = globalQueue.maxConcurrent;

  return Math.ceil((queuedCount * avgTaskDuration) / concurrency);
}
```

### 큐 이벤트

```typescript
// agent-manager/lib/queue/events.ts
import { EventEmitter } from 'events';

const queueEmitter = new EventEmitter();

export function emitQueueEvent(event: string, data: any): void {
  queueEmitter.emit(event, data);
}

export function onQueueEvent(event: string, handler: (data: any) => void): void {
  queueEmitter.on(event, handler);
}

// 사용
globalQueue.enqueue = function(item) {
  // ... original logic ...
  emitQueueEvent('task-queued', { taskId: item.taskId, priority: item.priority });
};
```

## 페어니스 (Fairness)

### 사용자별 공평한 분배

```typescript
// agent-manager/lib/queue/fairness.ts
const userTaskCounts = new Map<string, number>();

export function enqueueWithFairness(item: TaskQueueItem, userId: string): void {
  const userCount = userTaskCounts.get(userId) || 0;

  // 사용자가 이미 많은 Task를 실행 중이면 우선순위 낮춤
  if (userCount >= 2) {
    item.priority = 'low';
  }

  globalQueue.enqueue(item);
}

export function onTaskStart(taskId: string, userId: string): void {
  const count = userTaskCounts.get(userId) || 0;
  userTaskCounts.set(userId, count + 1);
}

export function onTaskEnd(taskId: string, userId: string): void {
  const count = userTaskCounts.get(userId) || 0;
  userTaskCounts.set(userId, Math.max(0, count - 1));
}
```

## 테스트

```typescript
// __tests__/lib/queue/task-queue.test.ts
describe('TaskQueue', () => {
  it('should dequeue by priority', () => {
    const queue = new TaskQueue();

    queue.enqueue({ taskId: 'task1', priority: 'low', createdAt: new Date(), dependencies: [] });
    queue.enqueue({ taskId: 'task2', priority: 'high', createdAt: new Date(), dependencies: [] });
    queue.enqueue({ taskId: 'task3', priority: 'critical', createdAt: new Date(), dependencies: [] });

    expect(queue.dequeue()?.taskId).toBe('task3'); // critical
    expect(queue.dequeue()?.taskId).toBe('task2'); // high
    expect(queue.dequeue()?.taskId).toBe('task1'); // low
  });

  it('should respect dependencies', () => {
    const queue = new TaskQueue();

    queue.enqueue({ taskId: 'task1', priority: 'normal', createdAt: new Date(), dependencies: ['task2'] });
    queue.enqueue({ taskId: 'task2', priority: 'normal', createdAt: new Date(), dependencies: [] });

    const first = queue.dequeue();
    expect(first?.taskId).toBe('task2'); // task2가 먼저 (의존성 없음)
  });
});
```

## 관련 문서

- **Lifecycle - Creation**: `../lifecycle/creation.md`
- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Monitoring**: `../monitoring/status-tracking.md`
