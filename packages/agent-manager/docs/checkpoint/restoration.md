# Checkpoint 복구 (Restoration)

## 개요

저장된 Checkpoint로부터 에이전트 상태를 복구하여 작업을 재개하는 방법을 설명합니다.

> **목적**: 에이전트 크래시, 시스템 재시작, 사용자 요청 시 작업을 중단된 지점부터 계속 진행

## 복구 시나리오

### 1. 자동 복구 (Auto-Recovery)

**트리거**:
- 에이전트 프로세스 크래시
- 시스템 재시작
- 네트워크 오류

**동작**:
```typescript
// agent-manager/lib/recovery/auto-recovery.ts
export async function handleAgentCrash(taskId: string, error: Error) {
  console.error(`Agent crashed: ${taskId}`, error);

  // 1. 최신 Checkpoint 로드
  const checkpoint = await loadLatestCheckpoint(taskId);

  if (!checkpoint) {
    console.error(`No checkpoint found for ${taskId}`);
    await markTaskAsFailed(taskId, 'No checkpoint available for recovery');
    return;
  }

  // 2. 복구 가능 여부 확인
  if (!isRecoverable(checkpoint, error)) {
    console.error(`Task ${taskId} is not recoverable`);
    await markTaskAsFailed(taskId, error.message);
    return;
  }

  // 3. 복구 시도
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Recovery attempt ${attempt}/${maxRetries} for ${taskId}`);

    const success = await attemptRecovery(taskId, checkpoint);

    if (success) {
      console.log(`Successfully recovered ${taskId}`);
      return;
    }

    // 재시도 전 대기 (지수 백오프)
    await sleep(Math.pow(2, attempt) * 1000);
  }

  // 모든 재시도 실패
  await markTaskAsFailed(taskId, `Recovery failed after ${maxRetries} attempts`);
}

function isRecoverable(checkpoint: Checkpoint, error: Error): boolean {
  // 복구 불가능한 에러 유형
  const unrecoverableErrors = [
    'INVALID_API_KEY',
    'PERMISSION_DENIED',
    'TASK_CANCELLED',
  ];

  return !unrecoverableErrors.some(msg =>
    error.message.includes(msg)
  );
}
```

### 2. 수동 복구 (Manual Recovery)

**트리거**:
- 사용자가 복구 버튼 클릭
- 특정 Checkpoint로 롤백 요청

**API**:
```typescript
// app/api/tasks/[id]/restore/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const body = await request.json();
  const { checkpointId } = body;

  try {
    // 특정 Checkpoint 또는 최신 사용
    const checkpoint = checkpointId
      ? await loadCheckpoint(checkpointId)
      : await loadLatestCheckpoint(taskId);

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }

    // 복구 실행
    const success = await restoreFromCheckpoint(taskId, checkpoint);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Task restored successfully',
        checkpointId: checkpoint.id,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to restore task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore task' },
      { status: 500 }
    );
  }
}
```

### 3. Rate Limit 복구

**트리거**:
- Claude API rate limit 초과

**동작**:
```typescript
// agent-manager/lib/recovery/rate-limit.ts
export async function handleRateLimit(taskId: string, retryAfter: number) {
  console.log(`Rate limit hit for ${taskId}. Retry after ${retryAfter}s`);

  // 1. Checkpoint 생성
  await createCheckpoint(taskId, 'rate_limit', {
    retryAfter,
    tokensUsed: getAgentState(taskId)?.tokensUsed || 0,
  });

  // 2. 에이전트 일시 중지
  await pauseAgent(taskId, 'Rate limit');

  // 3. 대기 후 자동 재개 스케줄링
  scheduleResume(taskId, retryAfter * 1000);
}

function scheduleResume(taskId: string, delayMs: number) {
  setTimeout(async () => {
    console.log(`Resuming ${taskId} after rate limit`);

    const checkpoint = await loadLatestCheckpoint(taskId);
    if (checkpoint) {
      await restoreFromCheckpoint(taskId, checkpoint);
    }
  }, delayMs);
}
```

## 복구 프로세스

### 전체 흐름

```
1. Checkpoint 로드
    ↓
2. 현재 에이전트 종료 (실행 중이면)
    ↓
3. 상태 복원
    ├─ Task 상태
    ├─ Phase 정보
    ├─ 환경 변수
    └─ 진행률
    ↓
4. 새 에이전트 생성
    ↓
5. 재개 프롬프트 생성
    ↓
6. 에이전트 시작
    ↓
7. 모니터링 재개
```

### 구현

```typescript
// agent-manager/lib/recovery/restorer.ts
export async function restoreFromCheckpoint(
  taskId: string,
  checkpoint: Checkpoint
): Promise<boolean> {
  try {
    console.log(`Restoring task ${taskId} from checkpoint ${checkpoint.id}`);

    // 1. 현재 에이전트 종료
    await terminateCurrentAgent(taskId);

    // 2. Task 상태 복원
    await restoreTaskState(taskId, checkpoint);

    // 3. Phase 상태 복원
    await restorePhaseState(taskId, checkpoint);

    // 4. 환경 변수 준비
    const env = await buildEnvironmentFromCheckpoint(checkpoint);

    // 5. 새 에이전트 생성
    const agent = await createAgentForRecovery(taskId, checkpoint, env);

    if (!agent) {
      throw new Error('Failed to create agent');
    }

    // 6. 재개 프롬프트 생성 및 전송
    const resumePrompt = buildResumePrompt(checkpoint);
    await sendPromptToAgent(agent, resumePrompt);

    // 7. 에이전트 상태 업데이트
    updateAgentState(taskId, {
      process: agent,
      status: 'running',
      recoveredFrom: checkpoint.id,
      lastUpdate: new Date(),
    });

    // 8. 모니터링 재개
    startMonitoring(taskId, agent);

    console.log(`Successfully restored ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore ${taskId}:`, error);
    return false;
  }
}
```

### 상태 복원 함수들

```typescript
// Task 상태 복원
async function restoreTaskState(
  taskId: string,
  checkpoint: Checkpoint
): Promise<void> {
  await db.task.update({
    where: { id: taskId },
    data: {
      status: checkpoint.agentState.status === 'completed'
        ? 'completed'
        : 'in_progress',
      progress: checkpoint.progress,
      currentPhase: checkpoint.phase,
      updatedAt: new Date(),
    },
  });
}

// Phase 상태 복원
async function restorePhaseState(
  taskId: string,
  checkpoint: Checkpoint
): Promise<void> {
  if (!checkpoint.phase) return;

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
      updatedAt: new Date(),
    },
  });
}

// 환경 변수 준비
async function buildEnvironmentFromCheckpoint(
  checkpoint: Checkpoint
): Promise<Record<string, string>> {
  const taskId = checkpoint.taskId;

  // 의존성 로드 및 복호화
  const dependencies = await db.dependency.findMany({
    where: {
      taskId,
      provided: true,
    },
  });

  const env: Record<string, string> = {};

  for (const dep of dependencies) {
    try {
      const value = await loadDependencyValue(dep.id);
      if (value) {
        env[dep.name] = value;
      }
    } catch (error) {
      console.error(`Failed to load dependency ${dep.name}:`, error);
    }
  }

  return env;
}
```

### 재개 프롬프트 생성

```typescript
// agent-manager/lib/recovery/prompt-builder.ts
export function buildResumePrompt(checkpoint: Checkpoint): string {
  const sections: string[] = [];

  // 1. 재개 알림
  sections.push('# Resuming from Checkpoint');
  sections.push('');
  sections.push('You were interrupted and are now resuming work.');
  sections.push('');

  // 2. 이전 상태 정보
  sections.push('## Previous State');
  sections.push('');
  sections.push(`- **Phase**: ${checkpoint.phase || 'N/A'}`);
  sections.push(`- **Step**: ${checkpoint.step || 'N/A'}`);
  sections.push(`- **Progress**: ${checkpoint.progress}%`);
  sections.push(`- **Tokens Used**: ${checkpoint.tokensUsed}`);
  sections.push('');

  // 3. 중단 이유
  sections.push('## Interruption Reason');
  sections.push('');
  sections.push(`**Type**: ${checkpoint.type}`);

  if (checkpoint.metadata.reason) {
    sections.push('');
    sections.push(`**Details**: ${checkpoint.metadata.reason}`);
  }

  sections.push('');

  // 4. 재개 지침
  sections.push('## Resume Instructions');
  sections.push('');
  sections.push('1. **Do not repeat completed work**');
  sections.push('2. Review what was already done');
  sections.push('3. Continue from where you left off');
  sections.push('');

  if (checkpoint.step) {
    sections.push(`**Next Step**: ${checkpoint.step}`);
  } else if (checkpoint.phase) {
    sections.push(`**Current Phase**: Phase ${checkpoint.phase}`);
    sections.push('Please continue with the next step in this phase.');
  } else {
    sections.push('Please continue with the task.');
  }

  sections.push('');

  // 5. 작업 디렉토리 정보
  sections.push('## Working Directory');
  sections.push('');
  sections.push(`\`${checkpoint.workingDir}\``);
  sections.push('');

  // 6. 특수 케이스 처리
  if (checkpoint.type === 'dependency_request') {
    sections.push('## Note');
    sections.push('');
    sections.push('The dependency you requested has been provided.');
    sections.push('You can now proceed with using it.');
    sections.push('');
  }

  if (checkpoint.type === 'user_question') {
    sections.push('## Note');
    sections.push('');
    sections.push('The user has answered your question.');
    sections.push('The answer is available in the environment.');
    sections.push('');
  }

  return sections.join('\n');
}
```

## 복구 검증

### 복구 후 상태 확인

```typescript
// agent-manager/lib/recovery/validator.ts
export async function validateRecovery(
  taskId: string,
  checkpoint: Checkpoint
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Task 존재 확인
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    errors.push('Task not found');
    return { valid: false, errors };
  }

  // 2. 에이전트 프로세스 실행 확인
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    errors.push('Agent process not running');
  }

  // 3. 상태 일관성 확인
  if (task.currentPhase !== checkpoint.phase) {
    errors.push(`Phase mismatch: expected ${checkpoint.phase}, got ${task.currentPhase}`);
  }

  // 4. Working directory 확인
  const workingDirExists = await fs.stat(checkpoint.workingDir)
    .then(() => true)
    .catch(() => false);

  if (!workingDirExists) {
    errors.push('Working directory does not exist');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## 복구 실패 처리

```typescript
// agent-manager/lib/recovery/failure-handler.ts
export async function handleRecoveryFailure(
  taskId: string,
  checkpoint: Checkpoint,
  error: Error
): Promise<void> {
  console.error(`Recovery failed for ${taskId}:`, error);

  // 1. 로그 저장
  await db.recoveryLog.create({
    data: {
      taskId,
      checkpointId: checkpoint.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    },
  });

  // 2. 사용자 알림
  await notifyUser(taskId, {
    type: 'recovery_failed',
    message: 'Failed to restore task from checkpoint',
    error: error.message,
  });

  // 3. Task 상태 업데이트
  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'failed',
      error: `Recovery failed: ${error.message}`,
    },
  });

  // 4. 리소스 정리
  await cleanupFailedRecovery(taskId);
}
```

## 부분 복구 (Partial Recovery)

```typescript
// 일부 상태만 복구 (파일은 그대로, 에이전트만 재시작)
export async function partialRestore(
  taskId: string,
  checkpoint: Checkpoint
): Promise<boolean> {
  try {
    // 파일 시스템은 그대로 유지
    // 에이전트 프로세스만 재시작

    const agent = await createAgentForRecovery(taskId, checkpoint);
    if (!agent) return false;

    // 간단한 재개 프롬프트
    const prompt = `Resume from Phase ${checkpoint.phase || 'current'}`;
    await sendPromptToAgent(agent, prompt);

    return true;
  } catch (error) {
    console.error('Partial restore failed:', error);
    return false;
  }
}
```

## 테스트

```typescript
// __tests__/lib/recovery/restorer.test.ts
describe('Checkpoint Restoration', () => {
  it('should restore task from checkpoint', async () => {
    const taskId = 'task_123';
    const checkpoint = await createCheckpoint(taskId, 'manual_pause', {
      phase: 1,
      step: 'Step 3',
    });

    const success = await restoreFromCheckpoint(taskId, checkpoint);
    expect(success).toBe(true);

    const task = await db.task.findUnique({ where: { id: taskId } });
    expect(task?.currentPhase).toBe(1);
  });

  it('should handle restoration failure gracefully', async () => {
    const taskId = 'task_invalid';
    const checkpoint = {} as Checkpoint;

    const success = await restoreFromCheckpoint(taskId, checkpoint);
    expect(success).toBe(false);
  });
});
```

## 모니터링

### 복구 이벤트 로깅

```typescript
await db.recoveryEvent.create({
  data: {
    taskId,
    checkpointId: checkpoint.id,
    type: 'restore_success',
    duration: Date.now() - startTime,
    timestamp: new Date(),
  },
});
```

## 관련 문서

- **Checkpoint Creation**: `creation.md`
- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Error Handling**: Error recovery patterns
