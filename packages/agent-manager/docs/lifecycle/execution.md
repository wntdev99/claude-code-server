# 에이전트 실행 및 제어

## 개요

생성된 에이전트 프로세스를 시작하고, 일시중지/재개하며, 상태를 제어하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 에이전트 제어를 다룹니다.
> **웹 서버의 프로세스 제어**는 `../../../claude-code-server/docs/features/process-management.md` 참조

## 실행 흐름

```
에이전트 생성 완료
    ↓
1. 초기 프롬프트 준비
    ↓
2. stdin으로 전달
    ↓
3. 상태 → 'running'
    ↓
4. 출력 모니터링
    ↓
5. 프로토콜 감지
    ↓
6. 제어 (일시중지/재개/종료)
```

## 초기 프롬프트 전달

### 프롬프트 생성

```typescript
// agent-manager/lib/prompt.ts
export interface PromptConfig {
  taskId: string;
  taskType: 'create_app' | 'modify_app' | 'workflow' | 'custom';
  taskTitle: string;
  taskDescription: string;
  userContext?: string;
}

export function buildInitialPrompt(config: PromptConfig): string {
  const { taskType, taskTitle, taskDescription, userContext } = config;

  // Task 타입별 프롬프트 템플릿
  const templates = {
    create_app: buildCreateAppPrompt,
    modify_app: buildModifyAppPrompt,
    workflow: buildWorkflowPrompt,
    custom: buildCustomPrompt,
  };

  const builder = templates[taskType];
  return builder({ taskTitle, taskDescription, userContext });
}

function buildCreateAppPrompt({ taskTitle, taskDescription, userContext }: {
  taskTitle: string;
  taskDescription: string;
  userContext?: string;
}): string {
  return `
# Task: ${taskTitle}

## Type
create_app

## Description
${taskDescription}

${userContext ? `## Additional Context\n${userContext}\n` : ''}

## Instructions

You are a Sub-Agent executing a "create_app" task.

Follow the workflow defined in your CLAUDE.md:
1. Phase 1 (Planning) - 9 Steps
2. Phase 2 (Design) - 5 Steps
3. Phase 3 (Development) - 6 Steps
4. Phase 4 (Testing) - Verification

**Important**:
- Reference guide files in /guide/ for each step
- Generate deliverables in docs/ folder
- Use protocols for dependencies and questions
- Signal phase completion after each phase
- Wait for review approval before proceeding

Begin with Phase 1, Step 1: Idea Definition.
`.trim();
}

function buildModifyAppPrompt({ taskTitle, taskDescription, userContext }: {
  taskTitle: string;
  taskDescription: string;
  userContext?: string;
}): string {
  return `
# Task: ${taskTitle}

## Type
modify_app

## Description
${taskDescription}

${userContext ? `## Additional Context\n${userContext}\n` : ''}

## Instructions

You are a Sub-Agent executing a "modify_app" task.

Follow the workflow:
1. Phase 1 (Analysis) - Understand codebase
2. Phase 2 (Planning) - Plan modifications
3. Phase 3 (Implementation) - Apply changes
4. Phase 4 (Testing) - Verify changes

Begin with Phase 1: Codebase Analysis.
`.trim();
}

function buildWorkflowPrompt({ taskTitle, taskDescription, userContext }: {
  taskTitle: string;
  taskDescription: string;
  userContext?: string;
}): string {
  return `
# Task: ${taskTitle}

## Type
workflow

## Description
${taskDescription}

${userContext ? `## Additional Context\n${userContext}\n` : ''}

## Instructions

You are a Sub-Agent executing a "workflow" task.

Follow the defined workflow phases and reference appropriate guides.

Begin the workflow.
`.trim();
}

function buildCustomPrompt({ taskTitle, taskDescription, userContext }: {
  taskTitle: string;
  taskDescription: string;
  userContext?: string;
}): string {
  return `
# Task: ${taskTitle}

## Type
custom

## Description
${taskDescription}

${userContext ? `## Additional Context\n${userContext}\n` : ''}

## Instructions

You are a Sub-Agent in custom mode. Work autonomously to complete the task.

${taskDescription}
`.trim();
}
```

### 프롬프트 전달

```typescript
// agent-manager/lib/executor.ts
import { ChildProcess } from 'child_process';

export interface ExecutionRequest {
  taskId: string;
  prompt: string;
}

export function startAgentExecution(request: ExecutionRequest): boolean {
  const { taskId, prompt } = request;

  // 1. 에이전트 프로세스 가져오기
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    console.error(`Agent not found: ${taskId}`);
    return false;
  }

  const agent = state.process;

  try {
    // 2. stdin으로 프롬프트 전달
    agent.stdin?.write(prompt + '\n');

    // 3. 상태 업데이트
    updateAgentState(taskId, {
      status: 'running',
      currentAction: 'Executing task',
    });

    // 4. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'agent_started',
      data: { taskId, status: 'running' },
    });

    console.log(`Agent ${taskId} started execution`);
    return true;
  } catch (error) {
    console.error(`Failed to start agent ${taskId}:`, error);

    updateAgentState(taskId, {
      status: 'error',
    });

    return false;
  }
}
```

## 상태 제어

### 일시 중지 (Pause)

```typescript
// agent-manager/lib/executor.ts
export function pauseAgentExecution(taskId: string, reason: string): boolean {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  const agent = state.process;

  try {
    // 1. SIGTSTP 신호 전송 (Ctrl+Z)
    agent.kill('SIGTSTP');

    // 2. 상태 업데이트
    updateAgentState(taskId, {
      status: 'paused',
      pausedReason: reason,
    });

    // 3. Checkpoint 생성
    createCheckpoint(taskId, 'pause', {
      reason,
      timestamp: new Date().toISOString(),
    });

    // 4. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'agent_paused',
      data: { taskId, reason },
    });

    console.log(`Agent ${taskId} paused: ${reason}`);
    return true;
  } catch (error) {
    console.error(`Failed to pause agent ${taskId}:`, error);
    return false;
  }
}

// 프로토콜 감지 시 자동 일시중지
export function autoPauseOnProtocol(taskId: string, protocol: string) {
  const reasons: Record<string, string> = {
    'DEPENDENCY_REQUEST': 'Waiting for dependency',
    'USER_QUESTION': 'Waiting for user answer',
    'PHASE_COMPLETE': 'Waiting for review approval',
    'ERROR': 'Error occurred',
  };

  const reason = reasons[protocol] || 'Protocol detected';
  pauseAgentExecution(taskId, reason);
}
```

### 재개 (Resume)

```typescript
// agent-manager/lib/executor.ts
export interface ResumeRequest {
  taskId: string;
  input?: string;  // 의존성 값, 사용자 답변 등
}

export function resumeAgentExecution(request: ResumeRequest): boolean {
  const { taskId, input } = request;

  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  const agent = state.process;

  try {
    // 1. 입력 전달 (있는 경우)
    if (input) {
      agent.stdin?.write(input + '\n');
    }

    // 2. SIGCONT 신호 전송 (일시중지 해제)
    agent.kill('SIGCONT');

    // 3. 상태 업데이트
    updateAgentState(taskId, {
      status: 'running',
      pausedReason: null,
    });

    // 4. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'agent_resumed',
      data: { taskId },
    });

    console.log(`Agent ${taskId} resumed`);
    return true;
  } catch (error) {
    console.error(`Failed to resume agent ${taskId}:`, error);
    return false;
  }
}
```

### 재시작 (Restart)

```typescript
// agent-manager/lib/executor.ts
export async function restartAgentExecution(taskId: string): Promise<boolean> {
  console.log(`Restarting agent ${taskId}`);

  try {
    // 1. 현재 프로세스 종료
    await terminateAgent(taskId, true); // graceful

    // 2. 마지막 Checkpoint 로드
    const checkpoint = await loadLatestCheckpoint(taskId);
    if (!checkpoint) {
      console.error(`No checkpoint found for ${taskId}`);
      return false;
    }

    // 3. 새 에이전트 생성
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return false;
    }

    const agent = await createAgent({
      taskId: task.id,
      taskType: task.type,
      baseDir: `/projects`,
      environmentVariables: task.environmentVariables,
    });

    // 4. Checkpoint 상태 복원
    await restoreCheckpoint(taskId, checkpoint);

    // 5. 실행 재개
    const prompt = buildResumePrompt(checkpoint);
    startAgentExecution({ taskId, prompt });

    console.log(`Agent ${taskId} restarted from checkpoint`);
    return true;
  } catch (error) {
    console.error(`Failed to restart agent ${taskId}:`, error);
    return false;
  }
}

function buildResumePrompt(checkpoint: Checkpoint): string {
  return `
# Resuming from Checkpoint

## Previous State
Phase: ${checkpoint.phase}
Step: ${checkpoint.step}
Progress: ${checkpoint.progress}%

## Completed Work
${checkpoint.completedWork.join('\n')}

## Instructions
Resume from where you left off. Do not repeat completed work.

Continue with: ${checkpoint.nextAction}
`.trim();
}
```

## 메시지 전달

### 사용자 답변 전달

```typescript
// agent-manager/lib/executor.ts
export function sendUserAnswer(taskId: string, answer: string): boolean {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  const agent = state.process;

  try {
    // 1. 답변 전달
    agent.stdin?.write(answer + '\n');

    // 2. 로그 저장
    saveLog(taskId, `[USER_ANSWER] ${answer}`);

    // 3. 재개
    resumeAgentExecution({ taskId });

    return true;
  } catch (error) {
    console.error(`Failed to send user answer to ${taskId}:`, error);
    return false;
  }
}
```

### 의존성 제공

```typescript
// agent-manager/lib/executor.ts
export function provideDependency(taskId: string, dependency: {
  name: string;
  value: string;
}): boolean {
  const { name, value } = dependency;

  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  try {
    // 1. 환경 변수 업데이트
    if (state.process.pid) {
      // 프로세스가 실행 중이면 stdin으로 알림
      const message = `[DEPENDENCY_PROVIDED]\nname: ${name}\nvalue: ${value}\n[/DEPENDENCY_PROVIDED]\n`;
      state.process.stdin?.write(message);
    }

    // 2. 로그 저장
    saveLog(taskId, `[DEPENDENCY] ${name} provided`);

    // 3. 재개
    resumeAgentExecution({ taskId });

    return true;
  } catch (error) {
    console.error(`Failed to provide dependency to ${taskId}:`, error);
    return false;
  }
}
```

### Review 승인 전달

```typescript
// agent-manager/lib/executor.ts
export function approveReview(taskId: string, reviewId: string, feedback?: string): boolean {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  try {
    // 1. 승인 메시지 생성
    let message = `[REVIEW_APPROVED]\nreviewId: ${reviewId}\n`;
    if (feedback) {
      message += `feedback: ${feedback}\n`;
    }
    message += `[/REVIEW_APPROVED]\n`;

    // 2. stdin으로 전달
    state.process.stdin?.write(message);

    // 3. Phase 상태 업데이트
    updateAgentState(taskId, {
      status: 'running',
      pausedReason: null,
    });

    // 4. 재개
    resumeAgentExecution({ taskId });

    console.log(`Review ${reviewId} approved for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to approve review for ${taskId}:`, error);
    return false;
  }
}

export function rejectReview(taskId: string, reviewId: string, reason: string): boolean {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    return false;
  }

  try {
    // 1. 거부 메시지 생성
    const message = `[REVIEW_REJECTED]\nreviewId: ${reviewId}\nreason: ${reason}\n[/REVIEW_REJECTED]\n`;

    // 2. stdin으로 전달
    state.process.stdin?.write(message);

    // 3. 에이전트는 Phase를 다시 수행해야 함
    updateAgentState(taskId, {
      status: 'running',
      pausedReason: null,
    });

    // 4. 재개
    resumeAgentExecution({ taskId });

    console.log(`Review ${reviewId} rejected for ${taskId}: ${reason}`);
    return true;
  } catch (error) {
    console.error(`Failed to reject review for ${taskId}:`, error);
    return false;
  }
}
```

## 상태 모니터링

### 진행 상황 추적

```typescript
// agent-manager/lib/monitor.ts
export interface ProgressInfo {
  taskId: string;
  currentPhase: number | null;
  currentStep: string | null;
  progress: number;
  tokensUsed: number;
  estimatedCompletion: Date | null;
}

export function getAgentProgress(taskId: string): ProgressInfo | null {
  const state = getAgentState(taskId);
  if (!state) {
    return null;
  }

  return {
    taskId,
    currentPhase: state.currentPhase,
    currentStep: state.currentStep,
    progress: state.progress,
    tokensUsed: state.tokensUsed,
    estimatedCompletion: estimateCompletion(state),
  };
}

function estimateCompletion(state: AgentState): Date | null {
  if (state.progress === 0) {
    return null;
  }

  const elapsed = Date.now() - state.startedAt.getTime();
  const totalEstimated = (elapsed / state.progress) * 100;
  const remaining = totalEstimated - elapsed;

  return new Date(Date.now() + remaining);
}
```

### 토큰 사용량 추적

```typescript
// agent-manager/lib/monitor.ts
export function trackTokenUsage(taskId: string, tokens: number) {
  const state = getAgentState(taskId);
  if (!state) {
    return;
  }

  // 1. 상태 업데이트
  updateAgentState(taskId, {
    tokensUsed: state.tokensUsed + tokens,
  });

  // 2. 데이터베이스 저장
  db.tokenUsage.create({
    data: {
      taskId,
      tokens,
      timestamp: new Date(),
    },
  });

  // 3. Rate Limit 체크
  checkRateLimit(taskId);
}

function checkRateLimit(taskId: string) {
  const state = getAgentState(taskId);
  if (!state) {
    return;
  }

  const RATE_LIMIT = 100000; // 100K tokens per task

  if (state.tokensUsed > RATE_LIMIT) {
    console.warn(`Agent ${taskId} exceeded rate limit`);

    // 일시 중지
    pauseAgentExecution(taskId, 'Rate limit exceeded');

    // 알림
    notifyWebServer(taskId, {
      type: 'rate_limit_exceeded',
      data: {
        taskId,
        tokensUsed: state.tokensUsed,
        limit: RATE_LIMIT,
      },
    });
  }
}
```

## 에러 처리

### 실행 에러

```typescript
// agent-manager/lib/executor.ts
export class ExecutionError extends Error {
  constructor(
    public taskId: string,
    public reason: string,
    public recoverable: boolean
  ) {
    super(`Execution error for ${taskId}: ${reason}`);
    this.name = 'ExecutionError';
  }
}

export async function handleExecutionError(
  taskId: string,
  error: ExecutionError
): Promise<void> {
  console.error(`Execution error for ${taskId}:`, error);

  // 1. Checkpoint 생성
  await createCheckpoint(taskId, 'error', {
    error: error.message,
    recoverable: error.recoverable,
  });

  if (error.recoverable) {
    // 2. 복구 가능한 에러 - 재시도
    console.log(`Attempting to recover ${taskId}`);

    await sleep(5000); // 5초 대기
    const success = await restartAgentExecution(taskId);

    if (!success) {
      // 재시작 실패
      updateAgentState(taskId, { status: 'failed' });
      notifyWebServer(taskId, {
        type: 'agent_failed',
        data: { taskId, error: error.message },
      });
    }
  } else {
    // 3. 복구 불가능한 에러 - 실패 처리
    updateAgentState(taskId, { status: 'failed' });

    notifyWebServer(taskId, {
      type: 'agent_failed',
      data: { taskId, error: error.message },
    });

    // 정리
    await terminateAgent(taskId, false);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`creation.md`** - 생성 후 실행 흐름
2. **`termination.md`** - 종료 전 상태 정리
3. **`../protocols/dependency.md`** - 의존성 제공 프로토콜
4. **`../protocols/user-question.md`** - 사용자 답변 프로토콜
5. **`../checkpoint/creation.md`** - Checkpoint 생성 시점
6. **`../../../claude-code-server/docs/features/process-management.md`** - 웹 서버의 프로세스 제어

### 이 문서를 참조하는 문서

1. **`../README.md`** - Lifecycle 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`creation.md`** - 생성 후 실행
4. **`../protocols/phase-completion.md`** - Review 승인/거부

## 다음 단계

- **종료 처리**: `termination.md` - 에이전트 정리 및 종료
- **프로토콜 처리**: `../protocols/` - 상세 프로토콜 처리
- **Checkpoint**: `../checkpoint/` - 상태 저장 및 복구

## 관련 문서

- **Creation**: `creation.md`
- **Termination**: `termination.md`
- **Protocols**: `../protocols/README.md`
- **Checkpoint**: `../checkpoint/creation.md`
- **Web Server - Process Management**: `../../../claude-code-server/docs/features/process-management.md`
