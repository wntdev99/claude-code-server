# 영속성 관리 (Persistence Management)

## 개요

시스템이 재시작되거나 크래시 후에도 작업 디렉토리의 메타데이터만으로 모든 작업을 복구하고 재개할 수 있습니다.

> **핵심 원칙**: 작업 디렉토리는 **단일 진실 공급원(Single Source of Truth)**입니다.

## 영속성 계층

### 1. 파일 시스템 (Primary)

작업 디렉토리 내의 파일들이 주 저장소입니다.

```
/projects/{task-id}/
├── .metadata/          # ✅ 메타데이터 (영속)
├── .checkpoints/       # ✅ Checkpoints (영속)
├── .logs/              # ✅ 로그 (영속)
└── docs/, src/         # ✅ 결과물 (영속)
```

### 2. 데이터베이스 (Secondary)

빠른 조회를 위한 인덱스 역할입니다.

```typescript
// Prisma schema
model Task {
  id          String   @id
  workingDir  String   // 파일 시스템 경로 참조
  status      String
  // ... 기타 필드들
}
```

**중요**: 데이터베이스는 파일 시스템과 **동기화**되어야 합니다.

### 3. 메모리 (Transient)

실행 중인 Agent 프로세스 정보입니다.

```typescript
const agentProcesses = new Map<string, ChildProcess>(); // ❌ 휘발성
```

## 시스템 시작 시 복구

### 초기화 프로세스

```typescript
// agent-manager/lib/bootstrap/recovery.ts
import fs from 'fs/promises';
import path from 'path';

export async function bootstrapSystem(): Promise<void> {
  console.log('Starting system recovery...');

  // 1. 작업 디렉토리 스캔
  const tasks = await discoverTasks();
  console.log(`Found ${tasks.length} tasks on disk`);

  // 2. 데이터베이스 동기화
  await syncDatabase(tasks);

  // 3. 진행 중이던 작업 복구
  await recoverActiveTasks(tasks);

  console.log('System recovery complete');
}
```

### 작업 디스커버리

```typescript
// agent-manager/lib/bootstrap/recovery.ts
export async function discoverTasks(): Promise<TaskMetadata[]> {
  const workspaceRoot = process.env.WORKSPACE_ROOT || '/projects';
  const tasks: TaskMetadata[] = [];

  try {
    const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_')) continue; // 백업 폴더 제외

      const taskDir = path.join(workspaceRoot, entry.name);
      const taskFile = path.join(taskDir, '.metadata/task.json');

      try {
        const taskData = JSON.parse(await fs.readFile(taskFile, 'utf-8'));
        const stateData = await loadAgentState(entry.name);

        tasks.push({
          ...taskData,
          agentState: stateData,
          workingDir: taskDir,
        });
      } catch (error) {
        console.warn(`Failed to load task metadata: ${entry.name}`, error);
      }
    }
  } catch (error) {
    console.error('Failed to discover tasks:', error);
  }

  return tasks;
}

async function loadAgentState(taskId: string): Promise<any> {
  const stateFile = path.join(
    getTaskWorkspace(taskId),
    '.metadata/agent-state.json'
  );

  try {
    return JSON.parse(await fs.readFile(stateFile, 'utf-8'));
  } catch (error) {
    return null;
  }
}
```

### 데이터베이스 동기화

```typescript
// agent-manager/lib/bootstrap/recovery.ts
export async function syncDatabase(tasks: TaskMetadata[]): Promise<void> {
  console.log('Syncing database with file system...');

  for (const task of tasks) {
    try {
      // 데이터베이스에서 Task 조회
      let dbTask = await db.task.findUnique({ where: { id: task.id } });

      if (!dbTask) {
        // 파일 시스템에만 있음 → 데이터베이스에 추가
        console.log(`Adding task to database: ${task.id}`);
        dbTask = await db.task.create({
          data: {
            id: task.id,
            title: task.title,
            type: task.type,
            status: task.status,
            description: task.description,
            workingDir: task.workingDir,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
          },
        });
      } else {
        // 파일 시스템이 더 최신일 수 있음 → 병합
        const fsUpdated = new Date(task.updatedAt);
        const dbUpdated = new Date(dbTask.updatedAt);

        if (fsUpdated > dbUpdated) {
          console.log(`Updating task from file system: ${task.id}`);
          await db.task.update({
            where: { id: task.id },
            data: {
              status: task.status,
              currentPhase: task.currentPhase,
              updatedAt: fsUpdated,
            },
          });
        }
      }
    } catch (error) {
      console.error(`Failed to sync task ${task.id}:`, error);
    }
  }

  // 데이터베이스에만 있고 파일 시스템에 없는 Task 처리
  await cleanupOrphanedTasks(tasks);
}

async function cleanupOrphanedTasks(fsTasks: TaskMetadata[]): Promise<void> {
  const fsTaskIds = new Set(fsTasks.map(t => t.id));
  const dbTasks = await db.task.findMany();

  for (const dbTask of dbTasks) {
    if (!fsTaskIds.has(dbTask.id)) {
      console.warn(`Task in DB but not in filesystem: ${dbTask.id}`);

      // 옵션 1: 데이터베이스에서 제거
      // await db.task.delete({ where: { id: dbTask.id } });

      // 옵션 2: 실패 상태로 표시
      await db.task.update({
        where: { id: dbTask.id },
        data: { status: 'failed' },
      });
    }
  }
}
```

### 활성 작업 복구

```typescript
// agent-manager/lib/bootstrap/recovery.ts
export async function recoverActiveTasks(tasks: TaskMetadata[]): Promise<void> {
  console.log('Recovering active tasks...');

  const activeTasks = tasks.filter(
    t => t.status === 'in_progress' || t.status === 'waiting_review'
  );

  console.log(`Found ${activeTasks.length} active tasks`);

  for (const task of activeTasks) {
    try {
      await recoverTask(task);
    } catch (error) {
      console.error(`Failed to recover task ${task.id}:`, error);

      // 복구 실패 시 상태 업데이트
      await updateTaskStatus(task.id, 'failed');
    }
  }
}

async function recoverTask(task: TaskMetadata): Promise<void> {
  console.log(`Recovering task: ${task.id}`);

  // 1. 최신 Checkpoint 찾기
  const checkpoint = await findLatestCheckpoint(task.id);

  if (!checkpoint) {
    console.warn(`No checkpoint found for ${task.id}, cannot recover`);
    await updateTaskStatus(task.id, 'failed');
    return;
  }

  // 2. Checkpoint에서 복구
  const recovered = await restoreFromCheckpoint(task.id, checkpoint.id);

  if (recovered) {
    console.log(`Task ${task.id} recovered successfully`);

    // 3. 상태에 따라 처리
    if (task.status === 'waiting_review') {
      // 리뷰 대기 중이었음 → 그대로 유지
      console.log(`Task ${task.id} is waiting for review`);
    } else if (task.status === 'in_progress') {
      // 실행 중이었음 → 자동 재개 여부 결정
      const shouldAutoResume = process.env.AUTO_RESUME_ON_RESTART === 'true';

      if (shouldAutoResume) {
        console.log(`Auto-resuming task ${task.id}`);
        await resumeAgent({ taskId: task.id });
      } else {
        console.log(`Task ${task.id} paused, waiting for manual resume`);
        await updateTaskStatus(task.id, 'paused');
      }
    }
  } else {
    console.error(`Failed to recover task ${task.id}`);
    await updateTaskStatus(task.id, 'failed');
  }
}
```

## 메타데이터 동기화

### 파일 시스템 → 메모리

```typescript
// agent-manager/lib/workspace/sync.ts
export async function loadTaskFromDisk(taskId: string): Promise<Task | null> {
  const workspaceDir = getTaskWorkspace(taskId);
  const taskFile = path.join(workspaceDir, '.metadata/task.json');
  const stateFile = path.join(workspaceDir, '.metadata/agent-state.json');

  try {
    const taskData = JSON.parse(await fs.readFile(taskFile, 'utf-8'));
    const stateData = JSON.parse(await fs.readFile(stateFile, 'utf-8'));

    return {
      ...taskData,
      agentState: stateData,
    };
  } catch (error) {
    console.error(`Failed to load task ${taskId} from disk:`, error);
    return null;
  }
}
```

### 메모리 → 파일 시스템

```typescript
// agent-manager/lib/workspace/sync.ts
export async function saveTaskToDisk(task: Task): Promise<void> {
  const workspaceDir = getTaskWorkspace(task.id);
  const taskFile = path.join(workspaceDir, '.metadata/task.json');
  const stateFile = path.join(workspaceDir, '.metadata/agent-state.json');

  try {
    // task.json 업데이트
    await fs.writeFile(
      taskFile,
      JSON.stringify({
        id: task.id,
        title: task.title,
        type: task.type,
        status: task.status,
        description: task.description,
        currentPhase: task.currentPhase,
        createdAt: task.createdAt,
        updatedAt: new Date().toISOString(),
        workingDir: workspaceDir,
      }, null, 2)
    );

    // agent-state.json 업데이트
    if (task.agentState) {
      await fs.writeFile(
        stateFile,
        JSON.stringify({
          ...task.agentState,
          lastUpdate: new Date().toISOString(),
        }, null, 2)
      );
    }
  } catch (error) {
    console.error(`Failed to save task ${task.id} to disk:`, error);
    throw error;
  }
}
```

### 자동 동기화

```typescript
// agent-manager/lib/workspace/sync.ts
export function startAutoSync(intervalMs: number = 30000): void {
  console.log(`Starting auto-sync (every ${intervalMs}ms)`);

  setInterval(async () => {
    const tasks = getAllActiveTasks(); // 메모리에서

    for (const task of tasks) {
      try {
        await saveTaskToDisk(task);
      } catch (error) {
        console.error(`Auto-sync failed for ${task.id}:`, error);
      }
    }
  }, intervalMs);
}
```

## 히스토리 재생

### 이벤트 로그에서 상태 재구성

```typescript
// agent-manager/lib/workspace/replay.ts
export async function replayHistory(taskId: string): Promise<TaskState> {
  const historyFile = path.join(
    getTaskWorkspace(taskId),
    '.metadata/history.jsonl'
  );

  const history = await readHistoryFile(historyFile);
  const state: TaskState = {
    taskId,
    status: 'idle',
    currentPhase: null,
    progress: 0,
    events: [],
  };

  for (const event of history) {
    applyEvent(state, event);
  }

  return state;
}

async function readHistoryFile(filePath: string): Promise<Event[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  return lines.map(line => JSON.parse(line));
}

function applyEvent(state: TaskState, event: Event): void {
  switch (event.event) {
    case 'task_created':
      state.status = 'draft';
      break;

    case 'agent_started':
      state.status = 'in_progress';
      break;

    case 'phase_started':
      state.currentPhase = event.data.phase;
      break;

    case 'phase_completed':
      state.progress = (event.data.phase / 4) * 100;
      break;

    case 'task_completed':
      state.status = 'completed';
      state.progress = 100;
      break;

    case 'task_failed':
      state.status = 'failed';
      break;
  }

  state.events.push(event);
}
```

## 정합성 검증

### 무결성 체크

```typescript
// agent-manager/lib/workspace/validation.ts
export async function validateWorkspace(taskId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const workspaceDir = getTaskWorkspace(taskId);

  // 1. 필수 디렉토리 존재 확인
  const requiredDirs = ['.metadata', '.checkpoints', '.logs'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(workspaceDir, dir);
    try {
      await fs.access(dirPath);
    } catch {
      errors.push(`Missing required directory: ${dir}`);
    }
  }

  // 2. 필수 파일 존재 확인
  const requiredFiles = [
    '.metadata/task.json',
    '.metadata/agent-state.json',
    '.metadata/history.jsonl',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(workspaceDir, file);
    try {
      await fs.access(filePath);
    } catch {
      errors.push(`Missing required file: ${file}`);
    }
  }

  // 3. JSON 파일 파싱 가능 여부
  try {
    const taskFile = path.join(workspaceDir, '.metadata/task.json');
    JSON.parse(await fs.readFile(taskFile, 'utf-8'));
  } catch (error) {
    errors.push('Invalid task.json format');
  }

  try {
    const stateFile = path.join(workspaceDir, '.metadata/agent-state.json');
    JSON.parse(await fs.readFile(stateFile, 'utf-8'));
  } catch (error) {
    errors.push('Invalid agent-state.json format');
  }

  // 4. 최신 Checkpoint 존재 확인
  const latestCheckpoint = await findLatestCheckpoint(taskId);
  if (!latestCheckpoint) {
    warnings.push('No checkpoint found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 복구 가능 여부 체크

```typescript
// agent-manager/lib/workspace/validation.ts
export async function isRecoverable(taskId: string): Promise<boolean> {
  const validation = await validateWorkspace(taskId);

  if (!validation.valid) {
    console.error(`Workspace ${taskId} is not valid:`, validation.errors);
    return false;
  }

  // Checkpoint 존재 여부
  const checkpoint = await findLatestCheckpoint(taskId);
  if (!checkpoint) {
    console.warn(`No checkpoint for ${taskId}, cannot recover`);
    return false;
  }

  return true;
}
```

## 백업 및 복원

### 전체 백업

```typescript
// agent-manager/lib/workspace/backup.ts
import archiver from 'archiver';
import { createWriteStream } from 'fs';

export async function backupWorkspace(
  taskId: string,
  destination?: string
): Promise<string> {
  const workspaceDir = getTaskWorkspace(taskId);
  const backupDir = destination || path.join(WORKSPACE_ROOT, '_backups');
  const backupFile = path.join(
    backupDir,
    `${taskId}_${Date.now()}.tar.gz`
  );

  await fs.mkdir(backupDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(backupFile);
    const archive = archiver('tar', { gzip: true });

    output.on('close', () => {
      console.log(`Backup created: ${backupFile} (${archive.pointer()} bytes)`);
      resolve(backupFile);
    });

    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(workspaceDir, false);
    archive.finalize();
  });
}
```

### 백업에서 복원

```typescript
// agent-manager/lib/workspace/backup.ts
import tar from 'tar';

export async function restoreFromBackup(
  backupFile: string,
  taskId: string
): Promise<void> {
  const workspaceDir = getTaskWorkspace(taskId);

  // 기존 디렉토리 제거
  await fs.rm(workspaceDir, { recursive: true, force: true });

  // 백업 압축 해제
  await tar.extract({
    file: backupFile,
    cwd: path.dirname(workspaceDir),
  });

  console.log(`Restored from backup: ${backupFile} → ${workspaceDir}`);
}
```

## 정리 정책

### 완료된 작업 보관

```typescript
// agent-manager/lib/workspace/archival.ts
export async function archiveCompletedTask(taskId: string): Promise<void> {
  const workspaceDir = getTaskWorkspace(taskId);
  const archiveDir = path.join(WORKSPACE_ROOT, '_archive');

  await fs.mkdir(archiveDir, { recursive: true });

  // 백업 생성
  const backupFile = await backupWorkspace(taskId, archiveDir);

  // 작업 디렉토리 제거
  await fs.rm(workspaceDir, { recursive: true, force: true });

  // 데이터베이스 업데이트
  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'archived',
      archivedAt: new Date(),
      archivePath: backupFile,
    },
  });

  console.log(`Task ${taskId} archived to ${backupFile}`);
}
```

## 모니터링

### 디스크 사용량 모니터링

```typescript
// agent-manager/lib/workspace/monitoring.ts
export async function monitorDiskUsage(): Promise<void> {
  const { total, used, available } = await checkDiskSpace();
  const usagePercent = (used / total) * 100;

  console.log(`Disk usage: ${usagePercent.toFixed(2)}%`);

  if (usagePercent > 90) {
    console.error('CRITICAL: Disk usage above 90%');
    // 오래된 작업 정리
    await cleanupOldWorkspaces(7); // 7일 이상
  } else if (usagePercent > 80) {
    console.warn('WARNING: Disk usage above 80%');
    await cleanupOldWorkspaces(14); // 14일 이상
  }
}

// 5분마다 체크
setInterval(monitorDiskUsage, 5 * 60 * 1000);
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`structure.md`** - 작업 공간 구조 (참조)
2. **`lifecycle.md`** - 작업 공간 생명주기
3. **`../checkpoint/recovery.md`** - Checkpoint 복구 (관련)
4. **`../../CLAUDE.md`** - 에이전트 관리자 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Workspace 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`structure.md`** - 작업 공간 구조
4. **`../checkpoint/recovery.md`** - Checkpoint 복구

## 다음 단계

- **작업 공간 구조**: `structure.md` - 디렉토리 레이아웃
- **Checkpoint 복구**: `../checkpoint/recovery.md` - 복구 메커니즘
- **작업 공간 생명주기**: `lifecycle.md` - 생성부터 삭제까지

## 관련 문서

- **Workspace Structure**: `structure.md`
- **Checkpoint Recovery**: `../checkpoint/recovery.md`
- **Checkpoint Creation**: `../checkpoint/creation.md`
- **Agent Lifecycle**: `../lifecycle/creation.md`
