# Checkpoint 복구

## 개요

Checkpoint에서 에이전트 상태를 복구하여 작업을 재개하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 Checkpoint 복구를 다룹니다.

## 복구가 필요한 경우

### 1. 에러 발생 시

- 복구 가능한 에러 (Rate Limit, Network timeout 등)
- 시스템 재시작 후
- 크래시 후 복구

### 2. 수동 복구

- 사용자 요청으로 특정 시점으로 돌아가기
- 잘못된 방향으로 진행한 경우 되돌리기

### 3. 자동 복구

- Rate Limit 해제 후 자동 재개
- 대기열에서 재시작

## 복구 프로세스

### 1. Checkpoint 선택

```typescript
// lib/checkpoint/restoration.ts
import { db } from '@/lib/db';

export async function findLatestCheckpoint(taskId: string): Promise<Checkpoint | null> {
  try {
    const checkpoint = await db.checkpoint.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    return checkpoint;
  } catch (error) {
    console.error(`Failed to find checkpoint for ${taskId}:`, error);
    return null;
  }
}

export async function findCheckpointByType(
  taskId: string,
  type: CheckpointType
): Promise<Checkpoint | null> {
  try {
    const checkpoint = await db.checkpoint.findFirst({
      where: { taskId, type },
      orderBy: { createdAt: 'desc' },
    });

    return checkpoint;
  } catch (error) {
    console.error(`Failed to find checkpoint for ${taskId}:`, error);
    return null;
  }
}
```

### 2. 상태 복구

```typescript
// lib/checkpoint/restoration.ts
export async function restoreFromCheckpoint(
  taskId: string,
  checkpointId?: string
): Promise<boolean> {
  try {
    // 1. Checkpoint 조회
    const checkpoint = checkpointId
      ? await db.checkpoint.findUnique({ where: { id: checkpointId } })
      : await findLatestCheckpoint(taskId);

    if (!checkpoint) {
      console.error(`Checkpoint not found for ${taskId}`);
      return false;
    }

    console.log(`Restoring from checkpoint: ${checkpoint.id}`);

    // 2. 작업 디렉토리 복구
    const workingDirRestored = await restoreWorkingDirectory(checkpoint);
    if (!workingDirRestored) {
      console.error('Failed to restore working directory');
      return false;
    }

    // 3. 에이전트 상태 복구
    const stateRestored = await restoreAgentState(checkpoint);
    if (!stateRestored) {
      console.error('Failed to restore agent state');
      return false;
    }

    // 4. 에이전트 재생성
    const agent = await createAgent({
      taskId: checkpoint.taskId,
      taskType: checkpoint.metadata.taskType,
      workingDir: checkpoint.workingDir,
    });

    if (!agent) {
      console.error('Failed to recreate agent');
      return false;
    }

    // 5. 컨텍스트 복구 (Phase, Step 등)
    const contextRestored = await restoreContext(checkpoint, agent);
    if (!contextRestored) {
      console.error('Failed to restore context');
      return false;
    }

    // 6. 재개 신호
    resumeAgentExecution({ taskId });

    console.log(`Successfully restored from checkpoint: ${checkpoint.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore from checkpoint:`, error);
    return false;
  }
}
```

### 3. 작업 디렉토리 복구

```typescript
// lib/checkpoint/restoration.ts
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';

async function restoreWorkingDirectory(checkpoint: Checkpoint): Promise<boolean> {
  const { taskId, workingDir } = checkpoint;
  const checkpointFile = path.join(workingDir, '.checkpoints', `${checkpoint.id}.tar.gz`);

  try {
    // Checkpoint 파일 존재 확인
    await fs.access(checkpointFile);

    // 기존 파일 백업 (안전을 위해)
    const backupDir = path.join(workingDir, '.checkpoints', 'backup');
    await fs.mkdir(backupDir, { recursive: true });

    // 압축 해제
    await fs
      .createReadStream(checkpointFile)
      .pipe(unzipper.Extract({ path: workingDir }))
      .promise();

    console.log(`Working directory restored for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore working directory for ${taskId}:`, error);
    return false;
  }
}
```

### 4. 에이전트 상태 복구

```typescript
// lib/checkpoint/restoration.ts
async function restoreAgentState(checkpoint: Checkpoint): Promise<boolean> {
  const { taskId, agentState } = checkpoint;

  try {
    // 에이전트 상태 복원
    updateAgentState(taskId, agentState);

    // Task 상태 업데이트
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        currentPhase: checkpoint.phase,
        progress: checkpoint.progress,
        tokensUsed: checkpoint.tokensUsed,
      },
    });

    console.log(`Agent state restored for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore agent state for ${taskId}:`, error);
    return false;
  }
}
```

### 5. 컨텍스트 복구

```typescript
// lib/checkpoint/restoration.ts
async function restoreContext(checkpoint: Checkpoint, agent: AgentProcess): Promise<boolean> {
  const { taskId, metadata } = checkpoint;

  try {
    // Phase 정보 복구
    if (checkpoint.phase) {
      const prompt = buildPhaseResumePrompt(checkpoint.phase, metadata);
      agent.process.stdin?.write(prompt + '\n');
    }

    // 메타데이터에서 추가 컨텍스트 복구
    if (metadata.currentStep) {
      const stepPrompt = `Continue from: ${metadata.currentStep}`;
      agent.process.stdin?.write(stepPrompt + '\n');
    }

    console.log(`Context restored for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore context for ${taskId}:`, error);
    return false;
  }
}

function buildPhaseResumePrompt(phase: number, metadata: Record<string, any>): string {
  return `
You are resuming from Phase ${phase}.

Previous progress:
- Phase: ${phase}
- Last step: ${metadata.currentStep || 'N/A'}
- Completed work: ${metadata.completedWork || 'N/A'}

Please continue from where you left off.
  `.trim();
}
```

## 복구 전략

### 1. 전체 복구

모든 상태를 Checkpoint 시점으로 되돌림:

```typescript
// lib/checkpoint/strategies.ts
export async function fullRestore(taskId: string): Promise<boolean> {
  console.log(`Full restore for ${taskId}`);

  // 1. 최신 Checkpoint 찾기
  const checkpoint = await findLatestCheckpoint(taskId);
  if (!checkpoint) return false;

  // 2. 전체 복구
  return await restoreFromCheckpoint(taskId, checkpoint.id);
}
```

### 2. 부분 복구

특정 요소만 복구:

```typescript
// lib/checkpoint/strategies.ts
export async function partialRestore(
  taskId: string,
  options: {
    restoreFiles?: boolean;
    restoreState?: boolean;
    restoreContext?: boolean;
  }
): Promise<boolean> {
  const { restoreFiles = true, restoreState = true, restoreContext = true } = options;

  const checkpoint = await findLatestCheckpoint(taskId);
  if (!checkpoint) return false;

  try {
    if (restoreFiles) {
      await restoreWorkingDirectory(checkpoint);
    }

    if (restoreState) {
      await restoreAgentState(checkpoint);
    }

    if (restoreContext) {
      const agent = getAgentProcess(taskId);
      if (agent) {
        await restoreContext(checkpoint, agent);
      }
    }

    return true;
  } catch (error) {
    console.error('Partial restore failed:', error);
    return false;
  }
}
```

### 3. 재시작 (Reset & Restore)

에이전트를 종료하고 Checkpoint에서 새로 시작:

```typescript
// lib/checkpoint/strategies.ts
export async function restartFromCheckpoint(taskId: string): Promise<boolean> {
  console.log(`Restarting from checkpoint for ${taskId}`);

  // 1. 기존 에이전트 종료
  await terminateAgent({ taskId });

  // 2. Checkpoint에서 복구
  await sleep(1000); // 프로세스 종료 대기

  const success = await restoreFromCheckpoint(taskId);

  if (success) {
    console.log(`Agent restarted successfully from checkpoint`);
  }

  return success;
}
```

## 자동 복구

### Rate Limit 후 자동 복구

```typescript
// lib/checkpoint/auto-recovery.ts
export function scheduleRateLimitRecovery(
  taskId: string,
  resetTime: Date
): void {
  const now = new Date();
  const delay = resetTime.getTime() - now.getTime();

  console.log(`Scheduling recovery for ${taskId} in ${delay}ms`);

  setTimeout(async () => {
    console.log(`Auto-recovering ${taskId} from rate limit`);

    const success = await restoreFromCheckpoint(taskId);

    if (success) {
      console.log(`Auto-recovery successful for ${taskId}`);
    } else {
      console.error(`Auto-recovery failed for ${taskId}`);

      // 실패 시 사용자에게 알림
      notifyWebServer(taskId, {
        type: 'recovery_failed',
        data: {
          reason: 'Failed to restore from checkpoint after rate limit',
        },
      });
    }
  }, delay);
}
```

### 크래시 복구

```typescript
// lib/checkpoint/auto-recovery.ts
export async function recoverCrashedTasks(): Promise<void> {
  console.log('Checking for crashed tasks...');

  try {
    // 비정상 상태의 Task 조회
    const crashedTasks = await db.task.findMany({
      where: {
        status: 'in_progress',
        updatedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // 5분 이상 업데이트 없음
        },
      },
    });

    console.log(`Found ${crashedTasks.length} potentially crashed tasks`);

    for (const task of crashedTasks) {
      console.log(`Attempting to recover task ${task.id}`);

      const success = await restartFromCheckpoint(task.id);

      if (success) {
        console.log(`Recovered crashed task: ${task.id}`);
      } else {
        console.error(`Failed to recover crashed task: ${task.id}`);

        // 복구 실패 시 failed 상태로 변경
        await db.task.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error('Failed to recover crashed tasks:', error);
  }
}

// 시스템 시작 시 복구 시도
export function startCrashRecovery(): void {
  // 시작 시 한 번 실행
  setTimeout(() => {
    recoverCrashedTasks();
  }, 5000);

  // 정기적으로 체크 (5분마다)
  setInterval(() => {
    recoverCrashedTasks();
  }, 5 * 60 * 1000);
}
```

## 복구 검증

### Checkpoint 유효성 검사

```typescript
// lib/checkpoint/validation.ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateCheckpoint(
  checkpoint: Checkpoint
): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. 파일 존재 확인
  const checkpointFile = path.join(
    checkpoint.workingDir,
    '.checkpoints',
    `${checkpoint.id}.tar.gz`
  );

  try {
    await fs.access(checkpointFile);
  } catch (error) {
    errors.push('Checkpoint file not found');
  }

  // 2. 메타데이터 확인
  if (!checkpoint.metadata || typeof checkpoint.metadata !== 'object') {
    errors.push('Invalid metadata');
  }

  // 3. 필수 필드 확인
  if (!checkpoint.taskId || !checkpoint.workingDir) {
    errors.push('Missing required fields');
  }

  // 4. 타임스탬프 확인 (너무 오래된 Checkpoint는 사용 불가)
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일
  const age = Date.now() - checkpoint.createdAt.getTime();
  if (age > MAX_AGE) {
    errors.push('Checkpoint too old');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## 복구 모니터링

### 복구 로그

```typescript
// lib/checkpoint/logging.ts
export async function logRecovery(
  taskId: string,
  checkpointId: string,
  success: boolean,
  details?: any
): Promise<void> {
  try {
    await db.recoveryLog.create({
      data: {
        taskId,
        checkpointId,
        success,
        details: details || {},
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log recovery:', error);
  }
}
```

### 복구 통계

```typescript
// lib/checkpoint/stats.ts
export async function getRecoveryStats(): Promise<{
  total: number;
  successful: number;
  failed: number;
  avgRecoveryTime: number;
}> {
  const logs = await db.recoveryLog.findMany();

  const successful = logs.filter((log) => log.success).length;
  const failed = logs.filter((log) => !log.success).length;

  return {
    total: logs.length,
    successful,
    failed,
    avgRecoveryTime: 0, // TODO: 구현
  };
}
```

## 테스트

### 복구 테스트

```typescript
// __tests__/lib/checkpoint/restoration.test.ts
import { restoreFromCheckpoint, findLatestCheckpoint } from '@/lib/checkpoint/restoration';
import { createCheckpoint } from '@/lib/checkpoint/creation';

describe('Checkpoint Restoration', () => {
  it('should restore from latest checkpoint', async () => {
    const taskId = 'test-task';

    // Checkpoint 생성
    const checkpoint = await createCheckpoint(taskId, 'manual', {
      phase: 1,
      step: 'Planning',
    });

    expect(checkpoint).not.toBeNull();

    // 복구
    const success = await restoreFromCheckpoint(taskId);
    expect(success).toBe(true);

    // 상태 확인
    const state = getAgentState(taskId);
    expect(state?.currentPhase).toBe(1);
  });

  it('should handle missing checkpoint', async () => {
    const success = await restoreFromCheckpoint('non-existent-task');
    expect(success).toBe(false);
  });
});
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`creation.md`** - Checkpoint 생성 (양방향 동기화)
2. **`../lifecycle/execution.md`** - 에이전트 재개
3. **`../../CLAUDE.md`** - 에이전트 관리자 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Checkpoint 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`creation.md`** - Checkpoint 생성
4. **`../lifecycle/execution.md`** - 실행 및 제어

## 다음 단계

- **Checkpoint Creation**: `creation.md` - Checkpoint 생성
- **Agent Execution**: `../lifecycle/execution.md` - 에이전트 제어
- **Error Handling**: `../protocols/error.md` - 에러 처리

## 관련 문서

- **Checkpoint Creation**: `creation.md`
- **Agent Execution**: `../lifecycle/execution.md`
- **Error Handling**: `../protocols/error.md`
- **Queue Management**: `../queue/priority.md`
