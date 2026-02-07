# 에이전트 상태 추적 (Status Tracking)

## 개요

에이전트의 현재 상태를 실시간으로 추적하고 모니터링하는 방법을 설명합니다.

> **목적**: 에이전트의 진행 상황, 상태, 토큰 사용량 등을 실시간으로 파악하여 적절한 조치를 취할 수 있도록 함

## 에이전트 상태 (Agent Status)

### 상태 정의

```typescript
// agent-manager/types/agent.ts
export type AgentStatus =
  | 'idle'                  // 대기 중
  | 'starting'              // 시작 중
  | 'running'               // 실행 중
  | 'waiting_review'        // 리뷰 대기
  | 'waiting_dependency'    // 의존성 대기
  | 'waiting_question'      // 사용자 질문 대기
  | 'paused'                // 일시 중지
  | 'completed'             // 완료
  | 'failed';               // 실패

export interface AgentState {
  taskId: string;
  status: AgentStatus;
  process: ChildProcess | null;

  // 진행 정보
  currentPhase: number | null;
  currentStep: string | null;
  progress: number; // 0-100

  // 토큰 사용량
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;

  // 차단 정보
  blockedBy: string | null;  // 'review', 'dependency', 'question', 'rate_limit'
  blockedReason: string | null;

  // 시간 정보
  startedAt: Date | null;
  lastUpdate: Date;

  // 오류 정보
  error: Error | null;
}
```

### 상태 전이 (State Transitions)

```
idle → starting → running → waiting_review → running → completed
                     ↓            ↓
                  paused    waiting_dependency
                     ↓            ↓
                  running ← running
                     ↓
                  failed
```

## 상태 관리

### State Store

```typescript
// agent-manager/lib/state/store.ts
const agentStates = new Map<string, AgentState>();

export function initializeAgentState(taskId: string): AgentState {
  const state: AgentState = {
    taskId,
    status: 'idle',
    process: null,
    currentPhase: null,
    currentStep: null,
    progress: 0,
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    blockedBy: null,
    blockedReason: null,
    startedAt: null,
    lastUpdate: new Date(),
    error: null,
  };

  agentStates.set(taskId, state);
  return state;
}

export function getAgentState(taskId: string): AgentState | undefined {
  return agentStates.get(taskId);
}

export function updateAgentState(
  taskId: string,
  updates: Partial<AgentState>
): void {
  const state = agentStates.get(taskId);
  if (!state) {
    console.error(`Agent state not found: ${taskId}`);
    return;
  }

  Object.assign(state, updates, { lastUpdate: new Date() });
  agentStates.set(taskId, state);

  // 상태 변경 이벤트 발생
  emitStateChange(taskId, state);
}

export function deleteAgentState(taskId: string): void {
  agentStates.delete(taskId);
}

export function listActiveAgents(): string[] {
  return Array.from(agentStates.entries())
    .filter(([_, state]) =>
      ['starting', 'running', 'waiting_review', 'waiting_dependency', 'waiting_question', 'paused'].includes(state.status)
    )
    .map(([taskId, _]) => taskId);
}
```

### 상태 변경 이벤트

```typescript
// agent-manager/lib/state/events.ts
import { EventEmitter } from 'events';

const stateEmitter = new EventEmitter();

export function emitStateChange(taskId: string, state: AgentState): void {
  stateEmitter.emit('state-change', { taskId, state });
  stateEmitter.emit(`state-change:${taskId}`, state);
}

export function onStateChange(
  callback: (event: { taskId: string; state: AgentState }) => void
): void {
  stateEmitter.on('state-change', callback);
}

export function onTaskStateChange(
  taskId: string,
  callback: (state: AgentState) => void
): void {
  stateEmitter.on(`state-change:${taskId}`, callback);
}
```

## 진행률 추적

### 진행률 계산

```typescript
// agent-manager/lib/tracking/progress.ts
export function calculateProgress(
  currentPhase: number,
  totalPhases: number,
  currentStepInPhase: number,
  totalStepsInPhase: number
): number {
  if (totalPhases === 0) return 0;

  // 완료된 phase 비율
  const completedPhasesProgress = ((currentPhase - 1) / totalPhases) * 100;

  // 현재 phase 내 진행률
  const currentPhaseProgress =
    (currentStepInPhase / totalStepsInPhase) * (100 / totalPhases);

  return Math.min(100, Math.round(completedPhasesProgress + currentPhaseProgress));
}

// 사용 예시
const progress = calculateProgress(
  2,    // Phase 2 진행 중
  4,    // 총 4개 Phase
  3,    // Phase 2의 3번째 step
  5     // Phase 2는 총 5개 step
);
// Result: 25% (Phase 1 완료) + 15% (Phase 2의 3/5) = 40%
```

### Phase 진행 추적

```typescript
// agent-manager/lib/tracking/phase-tracker.ts
export interface PhaseProgress {
  phase: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function updatePhaseProgress(
  taskId: string,
  phase: number,
  step: number
): void {
  updateAgentState(taskId, {
    currentPhase: phase,
    currentStep: `Step ${step}`,
  });

  // 진행률 재계산
  const taskType = getTaskType(taskId);
  const workflow = getWorkflow(taskType);

  const progress = calculateProgress(
    phase,
    workflow.totalPhases,
    step,
    workflow.phases[phase - 1].totalSteps
  );

  updateAgentState(taskId, { progress });

  // DB 업데이트
  db.task.update({
    where: { id: taskId },
    data: {
      currentPhase: phase,
      progress,
      updatedAt: new Date(),
    },
  });
}
```

## 토큰 사용량 추적

### 토큰 카운터

```typescript
// agent-manager/lib/tracking/token-counter.ts
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost: number; // USD
}

// Claude API 가격 (2024년 기준)
const TOKEN_COSTS = {
  'claude-sonnet-4-5': {
    input: 3.00 / 1_000_000,   // $3 per 1M tokens
    output: 15.00 / 1_000_000,  // $15 per 1M tokens
  },
};

export function trackTokenUsage(
  taskId: string,
  inputTokens: number,
  outputTokens: number
): void {
  const state = getAgentState(taskId);
  if (!state) return;

  const newInputTokens = state.inputTokens + inputTokens;
  const newOutputTokens = state.outputTokens + outputTokens;
  const newTotalTokens = newInputTokens + newOutputTokens;

  updateAgentState(taskId, {
    inputTokens: newInputTokens,
    outputTokens: newOutputTokens,
    tokensUsed: newTotalTokens,
  });

  // Cost 계산
  const cost = calculateCost(newInputTokens, newOutputTokens);

  // DB 업데이트
  db.task.update({
    where: { id: taskId },
    data: {
      tokensUsed: newTotalTokens,
      cost,
      updatedAt: new Date(),
    },
  });
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  const model = 'claude-sonnet-4-5';
  const costs = TOKEN_COSTS[model];

  return (
    inputTokens * costs.input +
    outputTokens * costs.output
  );
}
```

### 토큰 제한 체크

```typescript
// agent-manager/lib/tracking/token-limiter.ts
export async function checkTokenLimit(taskId: string): Promise<boolean> {
  const state = getAgentState(taskId);
  if (!state) return true;

  const MAX_TOKENS_PER_TASK = 1_000_000; // 100만 토큰

  if (state.tokensUsed >= MAX_TOKENS_PER_TASK) {
    console.warn(`Token limit exceeded for ${taskId}`);

    // 에이전트 중지
    await pauseAgent(taskId, 'Token limit exceeded');

    // 사용자 알림
    await notifyUser(taskId, {
      type: 'token_limit_exceeded',
      tokensUsed: state.tokensUsed,
      limit: MAX_TOKENS_PER_TASK,
    });

    return false;
  }

  return true;
}
```

## 실시간 모니터링

### 상태 폴링

```typescript
// agent-manager/lib/monitoring/status-poller.ts
export function startStatusMonitoring(taskId: string, interval: number = 5000): void {
  const timerId = setInterval(async () => {
    const state = getAgentState(taskId);

    if (!state || ['completed', 'failed'].includes(state.status)) {
      clearInterval(timerId);
      return;
    }

    // 1. 프로세스 상태 확인
    if (state.process && !isProcessAlive(state.process)) {
      console.error(`Process dead for ${taskId}`);
      await handleAgentCrash(taskId, new Error('Process terminated unexpectedly'));
      clearInterval(timerId);
      return;
    }

    // 2. 토큰 제한 체크
    await checkTokenLimit(taskId);

    // 3. 타임아웃 체크
    const timeout = 30 * 60 * 1000; // 30분
    if (state.lastUpdate && Date.now() - state.lastUpdate.getTime() > timeout) {
      console.warn(`No update from ${taskId} for 30 minutes`);
      // 필요시 조치
    }

    // 4. 상태 브로드캐스트 (SSE)
    broadcastAgentStatus(taskId, state);
  }, interval);

  // 정리 등록
  onTaskStateChange(taskId, (state) => {
    if (['completed', 'failed'].includes(state.status)) {
      clearInterval(timerId);
    }
  });
}

function isProcessAlive(process: ChildProcess): boolean {
  try {
    process.kill(0); // 시그널 0은 프로세스 존재 확인용
    return true;
  } catch {
    return false;
  }
}
```

### SSE 브로드캐스트

```typescript
// agent-manager/lib/monitoring/sse-broadcaster.ts
import { EventEmitter } from 'events';

const sseEmitter = new EventEmitter();

export function broadcastAgentStatus(taskId: string, state: AgentState): void {
  const event = {
    type: 'agent_status',
    data: {
      taskId,
      status: state.status,
      phase: state.currentPhase,
      step: state.currentStep,
      progress: state.progress,
      tokensUsed: state.tokensUsed,
      blockedBy: state.blockedBy,
      lastUpdate: state.lastUpdate.toISOString(),
    },
  };

  sseEmitter.emit(`sse:${taskId}`, event);
}

export function subscribeToSSE(
  taskId: string,
  callback: (event: any) => void
): () => void {
  sseEmitter.on(`sse:${taskId}`, callback);

  return () => {
    sseEmitter.off(`sse:${taskId}`, callback);
  };
}
```

## 상태 쿼리 API

### 상태 조회

```typescript
// agent-manager/lib/api/status.ts
export interface AgentStatusResponse {
  taskId: string;
  status: AgentStatus;
  phase: number | null;
  step: string | null;
  progress: number;
  tokensUsed: number;
  cost: number;
  blockedBy: string | null;
  blockedReason: string | null;
  startedAt: string | null;
  lastUpdate: string;
  uptime: number; // seconds
}

export function getAgentStatus(taskId: string): AgentStatusResponse | null {
  const state = getAgentState(taskId);
  if (!state) return null;

  const uptime = state.startedAt
    ? Math.floor((Date.now() - state.startedAt.getTime()) / 1000)
    : 0;

  const cost = calculateCost(state.inputTokens, state.outputTokens);

  return {
    taskId: state.taskId,
    status: state.status,
    phase: state.currentPhase,
    step: state.currentStep,
    progress: state.progress,
    tokensUsed: state.tokensUsed,
    cost,
    blockedBy: state.blockedBy,
    blockedReason: state.blockedReason,
    startedAt: state.startedAt?.toISOString() || null,
    lastUpdate: state.lastUpdate.toISOString(),
    uptime,
  };
}

export function getAllAgentStatuses(): AgentStatusResponse[] {
  const activeAgents = listActiveAgents();
  return activeAgents
    .map(taskId => getAgentStatus(taskId))
    .filter((status): status is AgentStatusResponse => status !== null);
}
```

## 히스토리 기록

### 상태 변경 로그

```typescript
// agent-manager/lib/monitoring/history.ts
export interface StatusHistoryEntry {
  taskId: string;
  status: AgentStatus;
  phase: number | null;
  progress: number;
  tokensUsed: number;
  timestamp: Date;
}

const statusHistory = new Map<string, StatusHistoryEntry[]>();

export function recordStatusChange(taskId: string, state: AgentState): void {
  const entry: StatusHistoryEntry = {
    taskId,
    status: state.status,
    phase: state.currentPhase,
    progress: state.progress,
    tokensUsed: state.tokensUsed,
    timestamp: new Date(),
  };

  const history = statusHistory.get(taskId) || [];
  history.push(entry);

  // 최대 100개 유지
  if (history.length > 100) {
    history.shift();
  }

  statusHistory.set(taskId, history);
}

export function getStatusHistory(taskId: string): StatusHistoryEntry[] {
  return statusHistory.get(taskId) || [];
}
```

## 대시보드 메트릭

### 집계 메트릭

```typescript
// agent-manager/lib/monitoring/metrics.ts
export interface SystemMetrics {
  totalAgents: number;
  runningAgents: number;
  waitingAgents: number;
  completedToday: number;
  failedToday: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTaskDuration: number; // seconds
}

export function getSystemMetrics(): SystemMetrics {
  const allStates = Array.from(agentStates.values());

  const runningAgents = allStates.filter(s => s.status === 'running').length;
  const waitingAgents = allStates.filter(s =>
    ['waiting_review', 'waiting_dependency', 'waiting_question'].includes(s.status)
  ).length;

  const totalTokens = allStates.reduce((sum, s) => sum + s.tokensUsed, 0);
  const totalCost = allStates.reduce((sum, s) =>
    sum + calculateCost(s.inputTokens, s.outputTokens), 0
  );

  return {
    totalAgents: allStates.length,
    runningAgents,
    waitingAgents,
    completedToday: 0, // DB에서 조회
    failedToday: 0,    // DB에서 조회
    totalTokensUsed: totalTokens,
    totalCost,
    averageTaskDuration: 0, // 계산 필요
  };
}
```

## 알림 시스템

### 상태 기반 알림

```typescript
// agent-manager/lib/monitoring/alerting.ts
export function setupAlerts(taskId: string): void {
  onTaskStateChange(taskId, async (state) => {
    // 1. 완료 알림
    if (state.status === 'completed') {
      await notifyUser(taskId, {
        type: 'task_completed',
        message: 'Your task has been completed successfully',
      });
    }

    // 2. 실패 알림
    if (state.status === 'failed') {
      await notifyUser(taskId, {
        type: 'task_failed',
        message: 'Your task has failed',
        error: state.error?.message,
      });
    }

    // 3. 리뷰 필요 알림
    if (state.status === 'waiting_review') {
      await notifyUser(taskId, {
        type: 'review_needed',
        message: `Phase ${state.currentPhase} is ready for review`,
      });
    }

    // 4. 의존성 필요 알림
    if (state.status === 'waiting_dependency') {
      await notifyUser(taskId, {
        type: 'dependency_needed',
        message: state.blockedReason || 'Dependency required',
      });
    }
  });
}
```

## 테스트

```typescript
// __tests__/lib/state/store.test.ts
describe('Agent State Management', () => {
  it('should initialize agent state', () => {
    const taskId = 'task_123';
    const state = initializeAgentState(taskId);

    expect(state.taskId).toBe(taskId);
    expect(state.status).toBe('idle');
    expect(state.progress).toBe(0);
  });

  it('should update agent state', () => {
    const taskId = 'task_123';
    initializeAgentState(taskId);

    updateAgentState(taskId, {
      status: 'running',
      progress: 50,
    });

    const state = getAgentState(taskId);
    expect(state?.status).toBe('running');
    expect(state?.progress).toBe(50);
  });
});
```

## 관련 문서

- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Checkpoint**: `../checkpoint/creation.md`
- **Token Management**: Token usage and cost tracking
- **Rate Limit**: Rate limit handling
