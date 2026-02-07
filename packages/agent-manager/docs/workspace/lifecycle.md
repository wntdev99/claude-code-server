# 작업 공간 생명주기 (Workspace Lifecycle)

## 개요

작업 공간(Workspace)의 전체 생명주기: 생성 → 사용 → 보관 → 삭제를 관리합니다.

## 생명주기 단계

```
┌─────────────────────────────────────────────────┐
│              작업 공간 생명주기                   │
└─────────────────────────────────────────────────┘

1. 생성 (Creation)
   └─→ Task 생성 시

2. 활성 (Active)
   ├─→ 에이전트 실행 중
   ├─→ Checkpoint 생성
   ├─→ 로그 기록
   └─→ 결과물 생성

3. 일시중지 (Paused)
   ├─→ Rate Limit
   ├─→ 사용자 요청
   └─→ 의존성 대기

4. 완료 (Completed)
   └─→ 모든 Phase 완료

5. 보관 (Archived)
   └─→ 압축 및 장기 보관

6. 삭제 (Deleted)
   └─→ 영구 제거
```

## 1. 생성 단계 (Creation)

### Task 생성 시

```typescript
// agent-manager/lib/workspace/lifecycle.ts
import { createWorkspace, initializeMetadata } from './manager';

export async function createTaskWorkspace(task: Task): Promise<string> {
  console.log(`Creating workspace for task: ${task.id}`);

  try {
    // 1. 작업 디렉토리 생성
    const workspaceDir = await createWorkspace(task.id);

    // 2. 메타데이터 초기화
    await initializeMetadata(task.id, task);

    // 3. 데이터베이스 업데이트
    await db.task.update({
      where: { id: task.id },
      data: { workingDir: workspaceDir },
    });

    // 4. 히스토리 기록
    await appendHistory(task.id, {
      event: 'workspace_created',
      data: { workingDir: workspaceDir },
    });

    console.log(`Workspace created: ${workspaceDir}`);
    return workspaceDir;
  } catch (error) {
    console.error(`Failed to create workspace for ${task.id}:`, error);
    throw error;
  }
}
```

### 디렉토리 구조 생성

```typescript
// agent-manager/lib/workspace/lifecycle.ts
async function setupDirectoryStructure(
  workspaceDir: string,
  taskType: string
): Promise<void> {
  // 기본 디렉토리
  const baseDirs = [
    '.metadata',
    '.checkpoints',
    '.logs',
    '.cache',
  ];

  // Task 타입별 디렉토리
  const taskDirs: Record<string, string[]> = {
    create_app: ['docs/planning', 'docs/design'],
    modify_app: ['docs/analysis', 'docs/changes'],
    workflow: ['docs/planning', 'docs/design'],
    custom: [],
  };

  const dirs = [...baseDirs, ...(taskDirs[taskType] || [])];

  for (const dir of dirs) {
    await fs.mkdir(path.join(workspaceDir, dir), { recursive: true });
  }

  console.log(`Directory structure created for ${taskType}`);
}
```

## 2. 활성 단계 (Active)

### 에이전트 실행 중

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function activateWorkspace(taskId: string): Promise<void> {
  console.log(`Activating workspace: ${taskId}`);

  // 1. 상태 업데이트
  await updateWorkspaceState(taskId, 'active');

  // 2. 히스토리 기록
  await appendHistory(taskId, {
    event: 'workspace_activated',
    data: { timestamp: new Date().toISOString() },
  });

  // 3. 자동 체크포인트 시작
  startAutoCheckpoint(taskId);

  // 4. 로그 모니터링 시작
  startLogMonitoring(taskId);
}

async function updateWorkspaceState(
  taskId: string,
  state: WorkspaceState
): Promise<void> {
  const stateFile = path.join(
    getTaskWorkspace(taskId),
    '.metadata/workspace-state.json'
  );

  await fs.writeFile(
    stateFile,
    JSON.stringify({
      state,
      updatedAt: new Date().toISOString(),
    }, null, 2)
  );
}
```

### 자동 Checkpoint

```typescript
// agent-manager/lib/workspace/lifecycle.ts
const checkpointTimers = new Map<string, NodeJS.Timeout>();

function startAutoCheckpoint(taskId: string): void {
  // 이미 실행 중이면 중지
  if (checkpointTimers.has(taskId)) {
    clearInterval(checkpointTimers.get(taskId)!);
  }

  // 10분마다 Checkpoint 생성
  const timer = setInterval(async () => {
    try {
      await createCheckpoint(taskId, 'periodic');
      console.log(`Auto checkpoint created for ${taskId}`);
    } catch (error) {
      console.error(`Auto checkpoint failed for ${taskId}:`, error);
    }
  }, 10 * 60 * 1000);

  checkpointTimers.set(taskId, timer);
}

function stopAutoCheckpoint(taskId: string): void {
  const timer = checkpointTimers.get(taskId);
  if (timer) {
    clearInterval(timer);
    checkpointTimers.delete(taskId);
    console.log(`Auto checkpoint stopped for ${taskId}`);
  }
}
```

### 로그 모니터링

```typescript
// agent-manager/lib/workspace/lifecycle.ts
function startLogMonitoring(taskId: string): void {
  const logFile = path.join(getTaskWorkspace(taskId), '.logs/agent.log');

  // 파일 변경 감지
  const watcher = fs.watch(logFile, async (eventType) => {
    if (eventType === 'change') {
      // 로그 파일 크기 체크
      const stats = await fs.stat(logFile);
      const sizeInMB = stats.size / (1024 * 1024);

      if (sizeInMB > 100) {
        // 100MB 초과 시 로테이션
        await rotateLogFile(taskId, logFile);
      }
    }
  });

  // watcher 저장 (나중에 정리용)
  logWatchers.set(taskId, watcher);
}

async function rotateLogFile(taskId: string, logFile: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rotatedFile = logFile.replace('.log', `.${timestamp}.log`);

  await fs.rename(logFile, rotatedFile);
  await fs.writeFile(logFile, ''); // 새 로그 파일 생성

  console.log(`Log rotated: ${rotatedFile}`);

  // 오래된 로그 삭제 (7일 이상)
  await cleanupOldLogs(taskId, 7);
}
```

## 3. 일시중지 단계 (Paused)

### 일시중지

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function pauseWorkspace(
  taskId: string,
  reason: PauseReason
): Promise<void> {
  console.log(`Pausing workspace: ${taskId} (${reason})`);

  // 1. 현재 상태 Checkpoint 생성
  await createCheckpoint(taskId, 'pause', { reason });

  // 2. 자동 Checkpoint 중지
  stopAutoCheckpoint(taskId);

  // 3. 상태 업데이트
  await updateWorkspaceState(taskId, 'paused');

  // 4. 히스토리 기록
  await appendHistory(taskId, {
    event: 'workspace_paused',
    data: { reason, timestamp: new Date().toISOString() },
  });
}

type PauseReason = 'rate_limit' | 'user_request' | 'dependency_wait' | 'error';
```

### 재개

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function resumeWorkspace(taskId: string): Promise<void> {
  console.log(`Resuming workspace: ${taskId}`);

  // 1. 최신 Checkpoint에서 복구
  const checkpoint = await findLatestCheckpoint(taskId);
  if (checkpoint && checkpoint.type === 'pause') {
    await restoreFromCheckpoint(taskId, checkpoint.id);
  }

  // 2. 활성화
  await activateWorkspace(taskId);

  // 3. 히스토리 기록
  await appendHistory(taskId, {
    event: 'workspace_resumed',
    data: { timestamp: new Date().toISOString() },
  });
}
```

## 4. 완료 단계 (Completed)

### 정상 완료

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function completeWorkspace(taskId: string): Promise<void> {
  console.log(`Completing workspace: ${taskId}`);

  // 1. 최종 Checkpoint 생성
  await createCheckpoint(taskId, 'final');

  // 2. 자동 Checkpoint 중지
  stopAutoCheckpoint(taskId);

  // 3. 로그 모니터링 중지
  stopLogMonitoring(taskId);

  // 4. 상태 업데이트
  await updateWorkspaceState(taskId, 'completed');

  // 5. 히스토리 기록
  await appendHistory(taskId, {
    event: 'workspace_completed',
    data: {
      timestamp: new Date().toISOString(),
      finalPhase: await getCurrentPhase(taskId),
    },
  });

  // 6. 메타데이터 업데이트
  await updateTaskMetadata(taskId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });

  // 7. 결과물 검증
  await validateDeliverables(taskId);

  console.log(`Workspace completed: ${taskId}`);
}

function stopLogMonitoring(taskId: string): void {
  const watcher = logWatchers.get(taskId);
  if (watcher) {
    watcher.close();
    logWatchers.delete(taskId);
    console.log(`Log monitoring stopped for ${taskId}`);
  }
}
```

### 실패 처리

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function failWorkspace(
  taskId: string,
  error: Error
): Promise<void> {
  console.error(`Failing workspace: ${taskId}`, error);

  // 1. 에러 Checkpoint 생성
  await createCheckpoint(taskId, 'error', {
    error: error.message,
    stack: error.stack,
  });

  // 2. 정리
  stopAutoCheckpoint(taskId);
  stopLogMonitoring(taskId);

  // 3. 상태 업데이트
  await updateWorkspaceState(taskId, 'failed');

  // 4. 히스토리 기록
  await appendHistory(taskId, {
    event: 'workspace_failed',
    data: {
      timestamp: new Date().toISOString(),
      error: error.message,
    },
  });

  // 5. 메타데이터 업데이트
  await updateTaskMetadata(taskId, {
    status: 'failed',
    failedAt: new Date().toISOString(),
    errorMessage: error.message,
  });
}
```

## 5. 보관 단계 (Archived)

### 보관 조건

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export interface ArchivePolicy {
  completedOlderThan: number;  // 일 단위
  failedOlderThan: number;      // 일 단위
  minDiskSpacePercent: number;  // 디스크 사용률 임계값
}

const DEFAULT_ARCHIVE_POLICY: ArchivePolicy = {
  completedOlderThan: 30,   // 30일
  failedOlderThan: 7,       // 7일
  minDiskSpacePercent: 80,  // 80% 이상 사용 시
};
```

### 보관 실행

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function archiveWorkspace(taskId: string): Promise<string> {
  console.log(`Archiving workspace: ${taskId}`);

  const workspaceDir = getTaskWorkspace(taskId);

  // 1. 보관 가능 여부 확인
  const metadata = await loadTaskMetadata(taskId);
  if (metadata.status !== 'completed' && metadata.status !== 'failed') {
    throw new Error(`Cannot archive task in status: ${metadata.status}`);
  }

  // 2. 압축 백업 생성
  const archiveFile = await backupWorkspace(
    taskId,
    path.join(WORKSPACE_ROOT, '_archive')
  );

  // 3. 작업 디렉토리 삭제
  await fs.rm(workspaceDir, { recursive: true, force: true });

  // 4. 데이터베이스 업데이트
  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'archived',
      archivedAt: new Date(),
      archivePath: archiveFile,
    },
  });

  console.log(`Workspace archived: ${archiveFile}`);
  return archiveFile;
}
```

### 자동 보관

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function autoArchive(policy: ArchivePolicy = DEFAULT_ARCHIVE_POLICY): Promise<void> {
  console.log('Running auto-archive...');

  const tasks = await discoverTasks();

  for (const task of tasks) {
    const shouldArchive = await shouldArchiveTask(task, policy);

    if (shouldArchive) {
      try {
        await archiveWorkspace(task.id);
        console.log(`Auto-archived: ${task.id}`);
      } catch (error) {
        console.error(`Failed to auto-archive ${task.id}:`, error);
      }
    }
  }
}

async function shouldArchiveTask(
  task: TaskMetadata,
  policy: ArchivePolicy
): Promise<boolean> {
  const now = Date.now();

  if (task.status === 'completed' && task.completedAt) {
    const age = now - new Date(task.completedAt).getTime();
    const ageDays = age / (1000 * 60 * 60 * 24);

    if (ageDays > policy.completedOlderThan) {
      return true;
    }
  }

  if (task.status === 'failed' && task.failedAt) {
    const age = now - new Date(task.failedAt).getTime();
    const ageDays = age / (1000 * 60 * 60 * 24);

    if (ageDays > policy.failedOlderThan) {
      return true;
    }
  }

  // 디스크 공간 부족 시
  const diskUsage = await checkDiskSpace();
  const usagePercent = (diskUsage.used / diskUsage.total) * 100;

  if (usagePercent > policy.minDiskSpacePercent) {
    // 오래된 순으로 보관
    return task.status === 'completed' || task.status === 'failed';
  }

  return false;
}

// 매일 자정에 실행
cron.schedule('0 0 * * *', () => {
  autoArchive();
});
```

## 6. 삭제 단계 (Deleted)

### 영구 삭제

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function deleteWorkspace(
  taskId: string,
  permanent: boolean = false
): Promise<void> {
  console.log(`Deleting workspace: ${taskId} (permanent: ${permanent})`);

  const workspaceDir = getTaskWorkspace(taskId);

  if (!permanent) {
    // 백업 후 삭제
    await archiveWorkspace(taskId);
  } else {
    // 영구 삭제
    await fs.rm(workspaceDir, { recursive: true, force: true });

    // 데이터베이스에서도 삭제
    await db.task.delete({ where: { id: taskId } });

    console.log(`Workspace permanently deleted: ${taskId}`);
  }
}
```

### 보관 파일 삭제

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export async function deleteArchivedWorkspace(taskId: string): Promise<void> {
  console.log(`Deleting archived workspace: ${taskId}`);

  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task || task.status !== 'archived') {
    throw new Error(`Task ${taskId} is not archived`);
  }

  // 보관 파일 삭제
  if (task.archivePath) {
    await fs.rm(task.archivePath, { force: true });
  }

  // 데이터베이스에서 삭제
  await db.task.delete({ where: { id: taskId } });

  console.log(`Archived workspace deleted: ${taskId}`);
}
```

## 생명주기 이벤트

### 이벤트 핸들러

```typescript
// agent-manager/lib/workspace/lifecycle.ts
export type WorkspaceEvent =
  | 'created'
  | 'activated'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'archived'
  | 'deleted';

type WorkspaceEventHandler = (taskId: string, data?: any) => void | Promise<void>;

const eventHandlers = new Map<WorkspaceEvent, WorkspaceEventHandler[]>();

export function onWorkspaceEvent(
  event: WorkspaceEvent,
  handler: WorkspaceEventHandler
): void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, []);
  }
  eventHandlers.get(event)!.push(handler);
}

async function emitWorkspaceEvent(
  event: WorkspaceEvent,
  taskId: string,
  data?: any
): Promise<void> {
  const handlers = eventHandlers.get(event) || [];

  for (const handler of handlers) {
    try {
      await handler(taskId, data);
    } catch (error) {
      console.error(`Event handler error (${event}):`, error);
    }
  }
}
```

### 사용 예시

```typescript
// 이벤트 리스너 등록
onWorkspaceEvent('completed', async (taskId) => {
  console.log(`Task completed: ${taskId}`);
  // 웹 서버에 알림
  await notifyWebServer(taskId, { type: 'task_completed' });
});

onWorkspaceEvent('failed', async (taskId, data) => {
  console.error(`Task failed: ${taskId}`, data);
  // 알림 전송
  await sendFailureNotification(taskId, data.error);
});
```

## 모니터링

### 상태 대시보드

```typescript
// agent-manager/lib/workspace/monitoring.ts
export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const tasks = await discoverTasks();

  const stats: WorkspaceStats = {
    total: tasks.length,
    byStatus: {
      active: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      archived: 0,
    },
    diskUsage: {
      total: 0,
      byTask: {},
    },
  };

  for (const task of tasks) {
    // 상태별 카운트
    stats.byStatus[task.status]++;

    // 디스크 사용량
    const size = await getWorkspaceSize(task.id);
    stats.diskUsage.byTask[task.id] = size;
    stats.diskUsage.total += size;
  }

  return stats;
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`structure.md`** - 작업 공간 구조
2. **`persistence.md`** - 영속성 관리
3. **`../checkpoint/creation.md`** - Checkpoint 생성
4. **`../../CLAUDE.md`** - 에이전트 관리자 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Workspace 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`structure.md`** - 작업 공간 구조
4. **`persistence.md`** - 영속성 관리

## 다음 단계

- **작업 공간 구조**: `structure.md` - 디렉토리 레이아웃
- **영속성 관리**: `persistence.md` - 복구 및 동기화
- **Checkpoint 시스템**: `../checkpoint/creation.md` - 상태 저장

## 관련 문서

- **Workspace Structure**: `structure.md`
- **Persistence Management**: `persistence.md`
- **Checkpoint Creation**: `../checkpoint/creation.md`
- **Checkpoint Recovery**: `../checkpoint/recovery.md`
