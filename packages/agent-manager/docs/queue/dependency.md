# Task 의존성 관리

## 개요

Task 간 의존성을 정의하고 관리하여 올바른 실행 순서를 보장하는 방법을 설명합니다.

> **목적**: Task A가 Task B의 완료를 기다려야 할 때, 의존성 그래프로 실행 순서 관리

## 의존성이란?

### 개념

```
Task B는 Task A에 의존함
= Task A가 완료되어야 Task B가 실행 가능

Example:
- Task A: 데이터베이스 마이그레이션
- Task B: 데이터 import (마이그레이션 후 실행)

의존성: B depends on A
```

### 표현

```typescript
interface TaskDependency {
  taskId: string;        // 대기 중인 Task
  dependsOn: string[];   // 완료되어야 할 Task들
}

// Task B는 Task A가 완료되어야 실행 가능
{
  taskId: 'task_B',
  dependsOn: ['task_A']
}

// Task C는 Task A와 B 모두 완료되어야 실행 가능
{
  taskId: 'task_C',
  dependsOn: ['task_A', 'task_B']
}
```

## 의존성 정의

### 의존성 추가

```typescript
// agent-manager/lib/dependencies/manager.ts
export function addDependency(
  taskId: string,
  dependsOn: string
): void {
  // 1. 큐에서 Task 찾기
  const item = globalQueue.queue.find(i => i.taskId === taskId);

  if (!item) {
    console.error(`Task ${taskId} not found in queue`);
    return;
  }

  // 2. 순환 의존성 체크
  if (wouldCreateCycle(taskId, dependsOn)) {
    throw new Error(`Circular dependency detected: ${taskId} -> ${dependsOn}`);
  }

  // 3. 의존성 추가
  if (!item.dependencies.includes(dependsOn)) {
    item.dependencies.push(dependsOn);
  }

  // 4. 데이터베이스에 저장
  db.task.update({
    where: { id: taskId },
    data: {
      dependencies: {
        push: dependsOn,
      },
    },
  });

  console.log(`Dependency added: ${taskId} depends on ${dependsOn}`);
}
```

### 의존성 제거

```typescript
export function removeDependency(
  taskId: string,
  dependsOn: string
): void {
  const item = globalQueue.queue.find(i => i.taskId === taskId);

  if (!item) return;

  // 배열에서 제거
  const index = item.dependencies.indexOf(dependsOn);
  if (index !== -1) {
    item.dependencies.splice(index, 1);
  }

  // DB 업데이트
  db.task.update({
    where: { id: taskId },
    data: {
      dependencies: item.dependencies,
    },
  });
}
```

## 순환 의존성 감지

### 사이클 체크 알고리즘

```typescript
// agent-manager/lib/dependencies/cycle-detector.ts
export function wouldCreateCycle(
  taskId: string,
  dependsOn: string
): boolean {
  // DFS를 사용하여 순환 의존성 감지

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(current: string): boolean {
    visited.add(current);
    recursionStack.add(current);

    // 현재 Task의 의존성들
    const dependencies = getDependencies(current);

    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recursionStack.has(dep)) {
        return true; // 순환 발견!
      }
    }

    recursionStack.delete(current);
    return false;
  }

  // taskId → dependsOn 의존성 추가 시뮬레이션
  // dependsOn이 taskId에 도달 가능한지 확인
  const tempDeps = getDependencies(dependsOn);
  tempDeps.push(taskId);

  return hasCycle(dependsOn);
}

function getDependencies(taskId: string): string[] {
  const item = globalQueue.queue.find(i => i.taskId === taskId);
  return item?.dependencies || [];
}
```

### 사이클 예시

```typescript
// ❌ 순환 의존성
addDependency('task_A', 'task_B');
addDependency('task_B', 'task_C');
addDependency('task_C', 'task_A');  // 사이클! A → B → C → A

// ✅ 정상 의존성
addDependency('task_C', 'task_B');
addDependency('task_B', 'task_A');
// 실행 순서: A → B → C
```

## 의존성 해결

### 실행 가능한 Task 찾기

```typescript
// agent-manager/lib/queue/resolver.ts
export function findReadyTasks(): string[] {
  const readyTasks: string[] = [];

  for (const item of globalQueue.queue) {
    if (isTaskReady(item)) {
      readyTasks.push(item.taskId);
    }
  }

  return readyTasks;
}

function isTaskReady(item: TaskQueueItem): boolean {
  // 의존성이 없으면 즉시 실행 가능
  if (item.dependencies.length === 0) {
    return true;
  }

  // 모든 의존성이 완료되었는지 확인
  return item.dependencies.every(depId => {
    const status = getTaskStatus(depId);
    return status === 'completed';
  });
}
```

### 의존성 완료 시 처리

```typescript
// agent-manager/lib/dependencies/resolver.ts
export function onTaskComplete(taskId: string): void {
  console.log(`Task ${taskId} completed, checking dependent tasks...`);

  // 이 Task에 의존하는 Task들 찾기
  const dependentTasks = findDependentTasks(taskId);

  for (const depTaskId of dependentTasks) {
    // 의존성 제거
    removeDependency(depTaskId, taskId);

    // 모든 의존성이 해결되었는지 확인
    const item = globalQueue.queue.find(i => i.taskId === depTaskId);

    if (item && item.dependencies.length === 0) {
      console.log(`Task ${depTaskId} is now ready to execute`);

      // 실행 가능하면 큐 처리
      processQueue();
    }
  }
}

function findDependentTasks(taskId: string): string[] {
  return globalQueue.queue
    .filter(item => item.dependencies.includes(taskId))
    .map(item => item.taskId);
}
```

## 의존성 그래프

### 그래프 시각화

```typescript
// agent-manager/lib/dependencies/graph.ts
export function buildDependencyGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const item of globalQueue.queue) {
    graph.set(item.taskId, item.dependencies);
  }

  return graph;
}

export function printDependencyGraph(): void {
  const graph = buildDependencyGraph();

  console.log('Dependency Graph:');
  for (const [taskId, deps] of graph.entries()) {
    if (deps.length === 0) {
      console.log(`  ${taskId} (no dependencies)`);
    } else {
      console.log(`  ${taskId} depends on:`);
      deps.forEach(dep => console.log(`    - ${dep}`));
    }
  }
}
```

**출력 예시**:
```
Dependency Graph:
  task_A (no dependencies)
  task_B depends on:
    - task_A
  task_C depends on:
    - task_A
    - task_B
```

### 위상 정렬 (Topological Sort)

```typescript
// 실행 순서 결정
export function topologicalSort(tasks: TaskQueueItem[]): string[] {
  const graph = buildGraph(tasks);
  const inDegree = calculateInDegree(graph);
  const sorted: string[] = [];
  const queue: string[] = [];

  // 의존성 없는 Task들로 시작
  for (const [taskId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // 의존하는 Task들의 in-degree 감소
    const dependents = findDependentTasks(current);
    for (const dep of dependents) {
      inDegree.set(dep, inDegree.get(dep)! - 1);

      if (inDegree.get(dep) === 0) {
        queue.push(dep);
      }
    }
  }

  // 순환 의존성 체크
  if (sorted.length !== tasks.length) {
    throw new Error('Circular dependency detected in task graph');
  }

  return sorted;
}

function buildGraph(tasks: TaskQueueItem[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const task of tasks) {
    graph.set(task.taskId, task.dependencies);
  }

  return graph;
}

function calculateInDegree(graph: Map<string, string[]>): Map<string, number> {
  const inDegree = new Map<string, number>();

  // 초기화
  for (const taskId of graph.keys()) {
    inDegree.set(taskId, 0);
  }

  // 계산
  for (const dependencies of graph.values()) {
    for (const dep of dependencies) {
      inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
    }
  }

  return inDegree;
}
```

## 사용 예시

### 파이프라인 구성

```typescript
// 데이터 처리 파이프라인
const taskA = createTask({ title: 'Extract data', type: 'workflow' });
const taskB = createTask({ title: 'Transform data', type: 'workflow' });
const taskC = createTask({ title: 'Load data', type: 'workflow' });

// 의존성 설정: Extract → Transform → Load
addToQueue(taskA.id);
addToQueue(taskB.id);
addToQueue(taskC.id);

addDependency(taskB.id, taskA.id);  // Transform은 Extract 후
addDependency(taskC.id, taskB.id);  // Load는 Transform 후

// 실행 순서: A → B → C
```

### 병렬 + 순차 조합

```typescript
// 병렬 가능한 Task들
const taskA1 = createTask({ title: 'Fetch API 1', type: 'workflow' });
const taskA2 = createTask({ title: 'Fetch API 2', type: 'workflow' });

// 병렬 Task 완료 후 실행
const taskB = createTask({ title: 'Merge data', type: 'workflow' });

addToQueue(taskA1.id);
addToQueue(taskA2.id);
addToQueue(taskB.id);

// taskB는 A1과 A2 모두 완료 후 실행
addDependency(taskB.id, taskA1.id);
addDependency(taskB.id, taskA2.id);

// 실행: A1과 A2 병렬 실행 → 둘 다 완료 → B 실행
```

## API

### 의존성 추가 API

```typescript
// app/api/tasks/[id]/dependencies/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const { dependsOn } = await request.json();

  try {
    addDependency(taskId, dependsOn);

    return NextResponse.json({
      success: true,
      message: 'Dependency added',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to add dependency',
      },
      { status: 400 }
    );
  }
}
```

### 의존성 조회 API

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { dependencies: true },
  });

  return NextResponse.json({
    success: true,
    dependencies: task?.dependencies || [],
  });
}
```

## 모니터링

### 의존성 상태 로깅

```typescript
export function logDependencyStatus(taskId: string): void {
  const item = globalQueue.queue.find(i => i.taskId === taskId);

  if (!item) return;

  console.log(`Task ${taskId} dependency status:`);

  if (item.dependencies.length === 0) {
    console.log('  No dependencies - ready to execute');
    return;
  }

  console.log(`  Waiting for ${item.dependencies.length} task(s):`);

  for (const depId of item.dependencies) {
    const status = getTaskStatus(depId);
    console.log(`    - ${depId}: ${status}`);
  }
}
```

## 주의사항

### 1. 순환 의존성

항상 체크하여 방지:
```typescript
if (wouldCreateCycle(taskId, dependsOn)) {
  throw new Error('Circular dependency detected');
}
```

### 2. 존재하지 않는 Task

의존성 대상이 실제로 존재하는지 확인:
```typescript
const dependsOnTask = await db.task.findUnique({ where: { id: dependsOn } });
if (!dependsOnTask) {
  throw new Error(`Task ${dependsOn} does not exist`);
}
```

### 3. 완료된 Task

이미 완료된 Task에 의존성 추가하면 즉시 해결:
```typescript
if (getTaskStatus(dependsOn) === 'completed') {
  console.log(`Dependency ${dependsOn} already completed`);
  // 의존성 추가하지 않음
}
```

## 테스트

```typescript
// __tests__/lib/dependencies/manager.test.ts
describe('Dependency Management', () => {
  it('should add dependency', () => {
    addDependency('task_B', 'task_A');

    const item = globalQueue.queue.find(i => i.taskId === 'task_B');
    expect(item?.dependencies).toContain('task_A');
  });

  it('should detect circular dependency', () => {
    addDependency('task_A', 'task_B');
    addDependency('task_B', 'task_C');

    expect(() => {
      addDependency('task_C', 'task_A');
    }).toThrow('Circular dependency');
  });

  it('should execute tasks in correct order', async () => {
    const executed: string[] = [];

    addToQueue('task_A');
    addToQueue('task_B');
    addToQueue('task_C');

    addDependency('task_B', 'task_A');
    addDependency('task_C', 'task_B');

    // Mock execution
    executeTask = async (taskId) => {
      executed.push(taskId);
      onTaskComplete(taskId);
    };

    await processQueue();

    expect(executed).toEqual(['task_A', 'task_B', 'task_C']);
  });
});
```

## 관련 문서

- **Priority Management**: `priority.md`
- **Queue README**: `README.md`
- **Lifecycle - Execution**: `../lifecycle/execution.md`
