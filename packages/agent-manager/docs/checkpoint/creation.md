# Checkpoint 생성

## 개요

에이전트 상태를 저장하여 복구 가능하도록 하는 Checkpoint 시스템을 설명합니다.

## Checkpoint란?

에이전트의 현재 상태를 저장한 스냅샷으로, 다음 상황에서 사용됩니다:

```
✅ 자동 복구
  - 에이전트 크래시 시
  - 시스템 재시작 시

✅ 수동 복구
  - 사용자가 특정 시점으로 롤백

✅ 진행 상황 추적
  - Phase별 진행 상태 기록
```

## Checkpoint 생성 시점

### 1. 자동 생성

```typescript
// 주기적 생성 (10분마다)
setInterval(async () => {
  const activeAgents = listActiveAgents();

  for (const taskId of activeAgents) {
    await createCheckpoint(taskId, 'periodic', {
      timestamp: new Date().toISOString(),
    });
  }
}, 10 * 60 * 1000); // 10분
```

### 2. 이벤트 기반 생성

```typescript
// Phase 완료 시
await createCheckpoint(taskId, 'phase_completion', {
  phase: 1,
  deliverables: [...],
});

// 의존성 요청 시
await createCheckpoint(taskId, 'dependency_request', {
  dependency: { name: 'OPENAI_API_KEY', ... },
});

// 사용자 질문 시
await createCheckpoint(taskId, 'user_question', {
  question: { ... },
});

// Rate Limit 시
await createCheckpoint(taskId, 'rate_limit', {
  tokensUsed: 100000,
});

// 에러 발생 시
await createCheckpoint(taskId, 'error', {
  error: error.message,
  recoverable: true,
});
```

### 3. 수동 생성

```typescript
// 사용자가 일시 중지 시
pauseAgent(taskId, 'User requested pause');
await createCheckpoint(taskId, 'manual_pause', {
  reason: 'User requested pause',
});
```

## Checkpoint 데이터 구조

### Checkpoint Interface

```typescript
// agent-manager/types/checkpoint.ts
export interface Checkpoint {
  id: string;
  taskId: string;
  type: CheckpointType;
  agentState: AgentState;
  workingDir: string;
  phase: number | null;
  step: string | null;
  progress: number;
  tokensUsed: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export type CheckpointType =
  | 'periodic'
  | 'phase_completion'
  | 'dependency_request'
  | 'user_question'
  | 'rate_limit'
  | 'error'
  | 'manual_pause';

export interface AgentState {
  status: AgentStatus;
  currentPhase: number | null;
  currentStep: string | null;
  progress: number;
  tokensUsed: number;
  blockedBy: string | null;
  blockedReason: string | null;
  lastUpdate: Date;
}
```

## Checkpoint 생성 구현

### 메인 함수

```typescript
// agent-manager/lib/checkpoint/creator.ts
import fs from 'fs/promises';
import path from 'path';

export async function createCheckpoint(
  taskId: string,
  type: CheckpointType,
  metadata: Record<string, any> = {}
): Promise<Checkpoint | null> {
  try {
    // 1. 에이전트 상태 가져오기
    const state = getAgentState(taskId);
    if (!state) {
      console.error(`Agent state not found: ${taskId}`);
      return null;
    }

    // 2. Checkpoint 데이터 생성
    const checkpoint: Checkpoint = {
      id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      type,
      agentState: {
        status: state.status,
        currentPhase: state.currentPhase,
        currentStep: state.currentStep,
        progress: state.progress,
        tokensUsed: state.tokensUsed,
        blockedBy: state.blockedBy,
        blockedReason: state.blockedReason,
        lastUpdate: state.lastUpdate,
      },
      workingDir: state.workingDir,
      phase: state.currentPhase,
      step: state.currentStep,
      progress: state.progress,
      tokensUsed: state.tokensUsed,
      metadata,
      createdAt: new Date(),
    };

    // 3. 파일 시스템에 저장
    await saveCheckpointToFile(checkpoint);

    // 4. 데이터베이스에 저장
    await db.checkpoint.create({
      data: {
        id: checkpoint.id,
        taskId: checkpoint.taskId,
        type: checkpoint.type,
        agentState: checkpoint.agentState,
        workingDir: checkpoint.workingDir,
        phase: checkpoint.phase,
        step: checkpoint.step,
        progress: checkpoint.progress,
        tokensUsed: checkpoint.tokensUsed,
        metadata: checkpoint.metadata,
        createdAt: checkpoint.createdAt,
      },
    });

    console.log(`Checkpoint created: ${checkpoint.id} (type: ${type})`);
    return checkpoint;
  } catch (error) {
    console.error(`Failed to create checkpoint for ${taskId}:`, error);
    return null;
  }
}
```

### 파일 저장

```typescript
// agent-manager/lib/checkpoint/creator.ts
async function saveCheckpointToFile(checkpoint: Checkpoint): Promise<void> {
  const checkpointDir = path.join(checkpoint.workingDir, '.checkpoints');

  // 디렉토리 생성
  await fs.mkdir(checkpointDir, { recursive: true });

  // Checkpoint 파일
  const checkpointFile = path.join(
    checkpointDir,
    `${checkpoint.id}.json`
  );

  // JSON 저장
  await fs.writeFile(
    checkpointFile,
    JSON.stringify(checkpoint, null, 2),
    'utf-8'
  );

  // 최신 Checkpoint 링크 업데이트
  const latestLink = path.join(checkpointDir, 'latest.json');
  await fs.writeFile(
    latestLink,
    JSON.stringify(checkpoint, null, 2),
    'utf-8'
  );
}
```

## Checkpoint 로드

### 최신 Checkpoint 로드

```typescript
// agent-manager/lib/checkpoint/loader.ts
export async function loadLatestCheckpoint(taskId: string): Promise<Checkpoint | null> {
  try {
    // 1. 데이터베이스에서 조회
    const checkpoint = await db.checkpoint.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    if (!checkpoint) {
      console.log(`No checkpoint found for ${taskId}`);
      return null;
    }

    return checkpoint as Checkpoint;
  } catch (error) {
    console.error(`Failed to load checkpoint for ${taskId}:`, error);
    return null;
  }
}
```

### 특정 Checkpoint 로드

```typescript
// agent-manager/lib/checkpoint/loader.ts
export async function loadCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
  try {
    const checkpoint = await db.checkpoint.findUnique({
      where: { id: checkpointId },
    });

    if (!checkpoint) {
      console.error(`Checkpoint not found: ${checkpointId}`);
      return null;
    }

    return checkpoint as Checkpoint;
  } catch (error) {
    console.error(`Failed to load checkpoint ${checkpointId}:`, error);
    return null;
  }
}
```

### Checkpoint 목록 조회

```typescript
// agent-manager/lib/checkpoint/loader.ts
export async function listCheckpoints(taskId: string): Promise<Checkpoint[]> {
  try {
    const checkpoints = await db.checkpoint.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    return checkpoints as Checkpoint[];
  } catch (error) {
    console.error(`Failed to list checkpoints for ${taskId}:`, error);
    return [];
  }
}
```

## Checkpoint 복구

### 상태 복원

```typescript
// agent-manager/lib/checkpoint/restorer.ts
export async function restoreCheckpoint(
  taskId: string,
  checkpoint: Checkpoint
): Promise<boolean> {
  try {
    console.log(`Restoring checkpoint ${checkpoint.id} for ${taskId}`);

    // 1. 에이전트 상태 복원
    updateAgentState(taskId, {
      status: checkpoint.agentState.status,
      currentPhase: checkpoint.agentState.currentPhase,
      currentStep: checkpoint.agentState.currentStep,
      progress: checkpoint.agentState.progress,
      tokensUsed: checkpoint.agentState.tokensUsed,
      blockedBy: checkpoint.agentState.blockedBy,
      blockedReason: checkpoint.agentState.blockedReason,
    });

    // 2. Task 상태 복원
    await db.task.update({
      where: { id: taskId },
      data: {
        status: checkpoint.agentState.status,
        progress: checkpoint.progress,
        currentPhase: checkpoint.phase,
      },
    });

    // 3. Phase 상태 복원
    if (checkpoint.phase) {
      await db.phase.upsert({
        where: {
          taskId_phase: {
            taskId,
            phase: checkpoint.phase,
          },
        },
        create: {
          taskId,
          phase: checkpoint.phase,
          name: checkpoint.metadata.phaseName || `Phase ${checkpoint.phase}`,
          status: 'in_progress',
        },
        update: {
          status: 'in_progress',
        },
      });
    }

    console.log(`Checkpoint restored successfully: ${checkpoint.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore checkpoint ${checkpoint.id}:`, error);
    return false;
  }
}
```

### 재시작 및 복원

```typescript
// agent-manager/lib/checkpoint/restorer.ts
export async function restartFromCheckpoint(
  taskId: string,
  checkpointId?: string
): Promise<boolean> {
  try {
    // 1. Checkpoint 로드
    const checkpoint = checkpointId
      ? await loadCheckpoint(checkpointId)
      : await loadLatestCheckpoint(taskId);

    if (!checkpoint) {
      console.error(`No checkpoint to restore for ${taskId}`);
      return false;
    }

    // 2. 현재 에이전트 종료 (있다면)
    const state = getAgentState(taskId);
    if (state?.process) {
      await terminateAgent(taskId, true);
    }

    // 3. Task 정보 조회
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return false;
    }

    // 4. 새 에이전트 생성
    const agent = await createAgent({
      taskId: task.id,
      taskType: task.type,
      baseDir: '/projects',
    });

    if (!agent) {
      console.error(`Failed to create agent for ${taskId}`);
      return false;
    }

    // 5. Checkpoint 복원
    await restoreCheckpoint(taskId, checkpoint);

    // 6. 재개 프롬프트 생성
    const resumePrompt = buildResumePrompt(checkpoint);

    // 7. 에이전트 실행
    startAgentExecution({ taskId, prompt: resumePrompt });

    console.log(`Agent restarted from checkpoint: ${checkpoint.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to restart from checkpoint for ${taskId}:`, error);
    return false;
  }
}

function buildResumePrompt(checkpoint: Checkpoint): string {
  return `
# Resuming from Checkpoint

## Previous State
- Phase: ${checkpoint.phase}
- Step: ${checkpoint.step}
- Progress: ${checkpoint.progress}%
- Tokens Used: ${checkpoint.tokensUsed}

## Checkpoint Type
${checkpoint.type}

${checkpoint.metadata.reason ? `## Reason\n${checkpoint.metadata.reason}` : ''}

## Instructions
Resume from where you left off. Do not repeat completed work.

${checkpoint.step ? `Continue with: ${checkpoint.step}` : 'Continue with the next step.'}
`.trim();
}
```

## Checkpoint 정리

### 오래된 Checkpoint 삭제

```typescript
// agent-manager/lib/checkpoint/cleaner.ts
export async function cleanupOldCheckpoints(
  taskId: string,
  keepCount: number = 10
): Promise<void> {
  try {
    // 1. 모든 Checkpoint 조회
    const checkpoints = await db.checkpoint.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    // 2. 유지할 개수보다 많으면 삭제
    if (checkpoints.length > keepCount) {
      const toDelete = checkpoints.slice(keepCount);

      for (const checkpoint of toDelete) {
        // 파일 삭제
        const checkpointFile = path.join(
          checkpoint.workingDir,
          '.checkpoints',
          `${checkpoint.id}.json`
        );

        try {
          await fs.unlink(checkpointFile);
        } catch (error) {
          // 파일이 없으면 무시
        }

        // DB 삭제
        await db.checkpoint.delete({
          where: { id: checkpoint.id },
        });
      }

      console.log(`Cleaned up ${toDelete.length} old checkpoints for ${taskId}`);
    }
  } catch (error) {
    console.error(`Failed to cleanup checkpoints for ${taskId}:`, error);
  }
}
```

### Task 완료 시 정리

```typescript
// agent-manager/lib/checkpoint/cleaner.ts
export async function cleanupCheckpointsOnCompletion(taskId: string): Promise<void> {
  try {
    // Task 완료 시 모든 Checkpoint 삭제 (선택적)
    const checkpoints = await db.checkpoint.findMany({
      where: { taskId },
    });

    for (const checkpoint of checkpoints) {
      const checkpointFile = path.join(
        checkpoint.workingDir,
        '.checkpoints',
        `${checkpoint.id}.json`
      );

      try {
        await fs.unlink(checkpointFile);
      } catch (error) {
        // 무시
      }
    }

    // DB에서 삭제
    await db.checkpoint.deleteMany({
      where: { taskId },
    });

    console.log(`All checkpoints cleaned up for completed task: ${taskId}`);
  } catch (error) {
    console.error(`Failed to cleanup checkpoints for ${taskId}:`, error);
  }
}
```

## 사용 예시

### 에러 발생 시 자동 복구

```typescript
// agent-manager/lib/protocols/error-handler.ts
async function handleAgentError(taskId: string, error: Error) {
  console.error(`Agent error for ${taskId}:`, error);

  // 1. Checkpoint 생성
  await createCheckpoint(taskId, 'error', {
    error: error.message,
    stack: error.stack,
    recoverable: true,
  });

  // 2. 복구 시도
  await sleep(5000); // 5초 대기

  const success = await restartFromCheckpoint(taskId);
  if (success) {
    console.log(`Agent ${taskId} recovered from error`);
  } else {
    console.error(`Failed to recover agent ${taskId}`);
    // Task 실패 처리
    await db.task.update({
      where: { id: taskId },
      data: { status: 'failed' },
    });
  }
}
```

### 수동 복구 (API)

```typescript
// app/api/tasks/[id]/restore/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { checkpointId } = body;

  const success = await restartFromCheckpoint(params.id, checkpointId);

  if (success) {
    return NextResponse.json({
      success: true,
      message: 'Task restored from checkpoint',
    });
  } else {
    return NextResponse.json(
      { error: 'Failed to restore from checkpoint' },
      { status: 500 }
    );
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../lifecycle/execution.md`** - Checkpoint 생성 시점
2. **`../protocols/dependency.md`** - 의존성 요청 시 Checkpoint
3. **`../protocols/phase-completion.md`** - Phase 완료 시 Checkpoint
4. **`../../CLAUDE.md`** - Checkpoint 시스템 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Checkpoint 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`../lifecycle/execution.md`** - 실행 및 제어
4. **`../protocols/*.md`** - 모든 프로토콜 처리

## 다음 단계

- **복구**: `restoration.md` - Checkpoint로부터 복구 상세
- **실행**: `../lifecycle/execution.md` - 에이전트 실행 및 제어
- **프로토콜**: `../protocols/` - 프로토콜 처리 시 Checkpoint 생성

## 관련 문서

- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Protocols - Dependency**: `../protocols/dependency.md`
- **Protocols - Phase Completion**: `../protocols/phase-completion.md`
- **Error Handling**: Error recovery patterns
