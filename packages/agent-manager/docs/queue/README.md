# Queue 관리 문서

## 개요

에이전트 관리자의 Task 큐 관리 시스템 관련 문서 목록입니다.

## 문서 목록

### 1. 우선순위 관리

**문서**: `priority.md`

**내용**:
- Task 우선순위 시스템
- 우선순위 큐 구현
- 동시 실행 제한
- 리소스 관리
- 스케줄링

**핵심 개념**:
```typescript
type Priority = 'critical' | 'high' | 'normal' | 'low';

interface TaskQueueItem {
  taskId: string;
  priority: Priority;
  createdAt: Date;
  scheduledFor?: Date;
  dependencies: string[];
}
```

### 2. 의존성 관리

**문서**: `dependency.md`

**내용**:
- Task 간 의존성 정의
- 의존성 그래프 관리
- 순환 의존성 감지
- 의존성 해결 알고리즘

**핵심 개념**:
```typescript
// Task A는 Task B가 완료되어야 실행 가능
addDependency(taskA, dependsOn: taskB);

// 의존성이 해결되면 자동 실행
onTaskComplete(taskB) => queue.processNext(taskA);
```

## 큐 시스템 개요

### 큐 흐름

```
Task 생성
    ↓
큐에 추가 (우선순위와 함께)
    ↓
의존성 체크
    ├─ 의존성 있음 → 대기
    └─ 의존성 없음 → 다음
    ↓
동시 실행 제한 체크
    ├─ 제한 초과 → 대기
    └─ 여유 있음 → 다음
    ↓
실행 시작
    ↓
완료 시 큐에서 제거
    ↓
다음 Task 처리
```

### 우선순위 결정 요인

1. **Task 타입**: custom > create_app > modify_app > workflow
2. **대기 시간**: 오래 대기한 Task 우선
3. **사용자 설정**: 명시적 우선순위
4. **재시도**: 복구 중인 Task 우선

### 큐 상태 관리

```typescript
interface QueueStatus {
  queued: number;        // 대기 중
  running: number;       // 실행 중
  available: number;     // 실행 가능 슬롯
  maxConcurrent: number; // 최대 동시 실행 수
}
```

## 사용 예시

### Task를 큐에 추가

```typescript
import { addToQueue } from '@/lib/queue/queue-manager';

// 일반 우선순위로 추가
addToQueue(taskId);

// 높은 우선순위로 추가
addToQueue(taskId, 'high');

// 의존성과 함께 추가
addToQueue(taskId, 'normal', {
  dependencies: ['task_456'],
});
```

### 큐 상태 확인

```typescript
import { globalQueue } from '@/lib/queue/queue-manager';

const status = globalQueue.getStatus();
console.log(`Queued: ${status.queued}, Running: ${status.running}`);
```

### 우선순위 변경

```typescript
globalQueue.updatePriority(taskId, 'critical');
```

## 모니터링

### 큐 이벤트

```typescript
import { onQueueEvent } from '@/lib/queue/events';

// Task가 큐에 추가될 때
onQueueEvent('task-queued', ({ taskId, priority }) => {
  console.log(`Task ${taskId} queued with priority ${priority}`);
});

// Task가 실행 시작할 때
onQueueEvent('task-started', ({ taskId }) => {
  console.log(`Task ${taskId} started`);
});

// Task가 완료될 때
onQueueEvent('task-completed', ({ taskId }) => {
  console.log(`Task ${taskId} completed`);
});
```

### 큐 메트릭

```typescript
import { getQueueMetrics } from '@/lib/queue/metrics';

const metrics = getQueueMetrics();
console.log({
  averageWaitTime: metrics.averageWaitTime,
  throughput: metrics.throughput,
  queueLength: metrics.queueLength,
});
```

## 설정

### 동시 실행 수 설정

```typescript
// 기본값
const queue = new TaskQueue(3);  // 최대 3개 동시 실행

// 동적 조정
queue.maxConcurrent = 5;  // 부하 낮을 때 증가
queue.maxConcurrent = 1;  // 부하 높을 때 감소
```

### 우선순위 정책

```typescript
// 우선순위 계산 커스터마이징
function calculatePriority(task: Task): Priority {
  // 사용자 정의 로직
  if (task.urgent) return 'critical';
  if (task.type === 'custom') return 'high';
  return 'normal';
}
```

## 주의사항

### 1. 의존성 순환

```typescript
// ❌ 순환 의존성 금지
addDependency(taskA, taskB);
addDependency(taskB, taskA);  // 교착 상태!

// ✅ 의존성 검증
if (wouldCreateCycle(taskA, taskB)) {
  throw new Error('Circular dependency detected');
}
```

### 2. 우선순위 남용

```typescript
// ❌ 모든 Task를 critical로 설정
addToQueue(taskId, 'critical');  // 의미 없음

// ✅ 적절한 우선순위 사용
addToQueue(taskId, 'normal');  // 대부분
addToQueue(urgentTaskId, 'critical');  // 진짜 긴급한 경우만
```

### 3. 큐 크기

```typescript
// 큐가 너무 길면 경고
if (queue.getStatus().queued > 100) {
  console.warn('Queue is too long! Consider scaling.');
}
```

## 트러블슈팅

### 큐가 진행되지 않음

**원인**:
- 의존성이 해결되지 않음
- 동시 실행 제한 도달
- 에이전트 크래시

**해결**:
```typescript
// 막힌 Task 확인
const blocked = queue.queue.filter(item => item.dependencies.length > 0);
console.log('Blocked tasks:', blocked);

// 의존성 상태 확인
blocked.forEach(item => {
  const deps = item.dependencies.map(id => getTaskStatus(id));
  console.log(`Task ${item.taskId} waiting for:`, deps);
});
```

### 우선순위가 작동하지 않음

**확인**:
```typescript
// 큐 내용 확인
console.log(queue.queue.map(item => ({
  taskId: item.taskId,
  priority: item.priority,
})));

// 정렬 확인
queue.sort();
```

## 관련 문서

- **Priority Management**: `priority.md`
- **Dependency Management**: `dependency.md`
- **Lifecycle - Creation**: `../lifecycle/creation.md`
- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Monitoring**: `../monitoring/status-tracking.md`
