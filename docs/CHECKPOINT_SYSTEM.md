# Checkpoint System (체크포인트 시스템)

이 문서는 Claude Code Server의 Checkpoint 시스템을 상세히 설명합니다.

---

## 개요

Checkpoint는 **Agent의 현재 상태를 스냅샷으로 저장**하여 나중에 복구할 수 있게 하는 시스템입니다.

### 목적

1. **장애 복구**: 시스템 crash 시 작업 손실 방지
2. **Rate Limit 대응**: API 제한 시 일시중지 후 자동 재개
3. **사용자 제어**: 수동 일시중지 및 재개
4. **에러 복구**: 에러 발생 시 이전 상태로 롤백

### 핵심 원칙

```
"작업 디렉토리(Workspace)가 Single Source of Truth"

모든 상태는 파일 시스템에 저장되며,
시스템이 재시작되어도 Workspace에서 복구 가능
```

---

## Checkpoint 생성 시점

### 자동 생성

#### 1. 주기적 자동 저장 (10분마다)
```
Agent 실행 중
   ↓
10분 경과
   ↓
Checkpoint 자동 생성
   ↓
계속 실행
```

**설정**:
```typescript
const AUTO_CHECKPOINT_INTERVAL = 10 * 60 * 1000; // 10분 (밀리초)

setInterval(() => {
  if (agent.status === 'running') {
    createCheckpoint(agent.taskId);
  }
}, AUTO_CHECKPOINT_INTERVAL);
```

#### 2. Rate Limit 감지 시
```
Agent 실행 중
   ↓
[ERROR] type: recoverable, message: Rate limit exceeded
   ↓
Checkpoint 생성
   ↓
Agent 일시중지 (SIGTSTP)
   ↓
Rate Limit reset 대기
   ↓
Agent 자동 재개 (SIGCONT)
```

#### 3. 에러 발생 시
```
Agent 실행 중
   ↓
[ERROR] (any type)
   ↓
Checkpoint 생성 (현재 상태 보존)
   ↓
에러 타입에 따라 처리:
  - recoverable: 재시도
  - fatal: Task 실패
```

#### 4. Phase 완료 시
```
Phase N 완료
   ↓
=== PHASE N COMPLETE ===
   ↓
Checkpoint 생성
   ↓
Agent 일시중지
   ↓
검증 → 리뷰
   ↓
승인 시 Phase N+1 시작
```

### 수동 생성

#### 사용자가 "일시중지" 클릭
```
웹 UI에서 "Pause" 버튼 클릭
   ↓
Checkpoint 생성
   ↓
Agent 일시중지 (SIGTSTP)
```

---

## Checkpoint 구조

### 파일 위치

```
/projects/{task-id}/.checkpoints/
├── checkpoint_2024-02-15T10-30-00.json   # 자동 (10분마다)
├── checkpoint_2024-02-15T10-40-00.json   # 자동 (10분마다)
├── checkpoint_phase1_complete.json       # Phase 완료
├── checkpoint_rate_limit.json            # Rate Limit
├── checkpoint_user_pause.json            # 사용자 일시중지
└── latest.json -> checkpoint_2024-02-15T10-40-00.json  # 심볼릭 링크
```

### Checkpoint 데이터 구조

```typescript
interface Checkpoint {
  // 메타데이터
  id: string;                           // checkpoint_abc123
  taskId: string;                       // task_xyz789
  createdAt: string;                    // ISO 8601 timestamp
  createdBy: 'auto' | 'user' | 'system';
  reason: string;                       // 'interval' | 'rate_limit' | 'error' | 'phase_complete' | 'user_pause'

  // Task 상태
  task: {
    status: TaskStatus;                 // 'in_progress', 'review', etc.
    type: TaskType;                     // 'create_app', etc.
    currentPhase: number | null;        // 1, 2, 3, 4
    progress: number;                   // 0-100
  };

  // Agent 상태
  agent: {
    status: AgentStatus;                // 'running', 'paused', etc.
    pid: number;                        // Process ID
    currentPhase: number | null;
    currentStep: string | null;         // '03_users'
    tokensUsed: number;
    blockedBy: string | null;
  };

  // 대화 히스토리
  conversationHistory: {
    messages: ConversationMessage[];    // 모든 대화 내역
    lastMessageIndex: number;           // 마지막 메시지 인덱스
  };

  // 환경 변수
  environment: {
    variables: Record<string, string>;  // 암호화된 환경 변수
    dependencies: Dependency[];         // 제공된 의존성 목록
  };

  // 작업 디렉토리 상태
  workspace: {
    path: string;                       // /projects/task_xyz789/
    deliverables: string[];             // 생성된 파일 목록
    lastModified: string;               // 마지막 수정 시간
  };

  // 프로토콜 상태
  protocols: {
    pendingDependencies: DependencyRequest[];
    pendingQuestions: UserQuestion[];
    completedPhases: number[];
  };
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    phase?: number;
    step?: string;
    type?: 'protocol' | 'log' | 'error';
  };
}
```

### 예시 Checkpoint JSON

```json
{
  "id": "checkpoint_abc123",
  "taskId": "task_xyz789",
  "createdAt": "2024-02-15T10:30:00Z",
  "createdBy": "auto",
  "reason": "interval",

  "task": {
    "status": "in_progress",
    "type": "create_app",
    "currentPhase": 1,
    "progress": 35
  },

  "agent": {
    "status": "running",
    "pid": 12345,
    "currentPhase": 1,
    "currentStep": "03_users",
    "tokensUsed": 12500,
    "blockedBy": null
  },

  "conversationHistory": {
    "messages": [
      {
        "role": "system",
        "content": "You are a sub-agent executing Phase 1 (Planning)...",
        "timestamp": "2024-02-15T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "I'll start by reading guide/planning/01_idea.md...",
        "timestamp": "2024-02-15T10:01:00Z"
      }
    ],
    "lastMessageIndex": 25
  },

  "environment": {
    "variables": {
      "OPENAI_API_KEY": "encrypted:abc123..."
    },
    "dependencies": [
      {
        "type": "api_key",
        "name": "OPENAI_API_KEY",
        "providedAt": "2024-02-15T10:05:00Z"
      }
    ]
  },

  "workspace": {
    "path": "/projects/task_xyz789/",
    "deliverables": [
      "docs/planning/01_idea.md",
      "docs/planning/02_market.md",
      "docs/planning/03_users.md"
    ],
    "lastModified": "2024-02-15T10:29:50Z"
  },

  "protocols": {
    "pendingDependencies": [],
    "pendingQuestions": [],
    "completedPhases": []
  }
}
```

---

## Checkpoint 생성 프로세스

### 1. 상태 수집

```typescript
async function createCheckpoint(taskId: string, reason: string): Promise<Checkpoint> {
  // 1. Task 상태 조회
  const task = await db.task.findUnique({ where: { id: taskId } });

  // 2. Agent 상태 조회
  const agent = await getAgentStatus(taskId);

  // 3. 대화 히스토리 수집
  const conversationHistory = await getConversationHistory(taskId);

  // 4. 환경 변수 수집
  const environment = await getEnvironmentVariables(taskId);

  // 5. Workspace 스캔
  const workspace = await scanWorkspace(taskId);

  // 6. 프로토콜 상태 수집
  const protocols = await getProtocolState(taskId);

  // 7. Checkpoint 객체 생성
  const checkpoint: Checkpoint = {
    id: generateCheckpointId(),
    taskId,
    createdAt: new Date().toISOString(),
    createdBy: reason === 'user_pause' ? 'user' : 'system',
    reason,
    task: extractTaskState(task),
    agent: extractAgentState(agent),
    conversationHistory,
    environment,
    workspace,
    protocols,
  };

  return checkpoint;
}
```

### 2. 파일 저장

```typescript
async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const checkpointDir = `/projects/${checkpoint.taskId}/.checkpoints/`;
  const filename = `checkpoint_${checkpoint.createdAt.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(checkpointDir, filename);

  // 1. 디렉토리 확인
  await fs.mkdir(checkpointDir, { recursive: true });

  // 2. JSON 파일 저장
  await fs.writeFile(filepath, JSON.stringify(checkpoint, null, 2));

  // 3. latest.json 심볼릭 링크 업데이트
  const latestPath = path.join(checkpointDir, 'latest.json');
  await fs.unlink(latestPath).catch(() => {}); // 기존 링크 삭제 (에러 무시)
  await fs.symlink(filename, latestPath);

  // 4. DB에 Checkpoint 레코드 생성
  await db.checkpoint.create({
    data: {
      id: checkpoint.id,
      taskId: checkpoint.taskId,
      filepath,
      createdAt: checkpoint.createdAt,
      reason: checkpoint.reason,
    },
  });

  console.log(`✅ Checkpoint saved: ${filepath}`);
}
```

### 3. 정리 (Cleanup)

오래된 Checkpoint 자동 삭제:

```typescript
async function cleanupOldCheckpoints(taskId: string): Promise<void> {
  const checkpointDir = `/projects/${taskId}/.checkpoints/`;
  const files = await fs.readdir(checkpointDir);

  // 1. 생성 시간 기준 정렬
  const checkpoints = files
    .filter(f => f.startsWith('checkpoint_') && f.endsWith('.json'))
    .map(f => ({
      filename: f,
      createdAt: extractTimestamp(f),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // 2. 최신 10개만 유지
  const MAX_CHECKPOINTS = 10;
  const toDelete = checkpoints.slice(MAX_CHECKPOINTS);

  // 3. 삭제
  for (const checkpoint of toDelete) {
    await fs.unlink(path.join(checkpointDir, checkpoint.filename));
    console.log(`🗑️  Old checkpoint deleted: ${checkpoint.filename}`);
  }
}
```

---

## Checkpoint 복구 프로세스

### 시나리오 1: 시스템 재시작 후 자동 복구

```typescript
async function bootstrapSystem(): Promise<void> {
  console.log('🔄 System starting... Checking for interrupted tasks');

  // 1. Workspace 스캔하여 Task 발견
  const projectsDir = '/projects/';
  const taskDirs = await fs.readdir(projectsDir);

  for (const taskDir of taskDirs) {
    const taskId = taskDir;
    const workspacePath = path.join(projectsDir, taskId);

    // 2. Task 메타데이터 읽기
    const metadataPath = path.join(workspacePath, '.metadata', 'task.json');
    if (!await fs.exists(metadataPath)) continue;

    const taskMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    // 3. 중단된 Task인지 확인
    if (taskMetadata.status === 'in_progress' || taskMetadata.status === 'paused') {
      console.log(`📋 Found interrupted task: ${taskId}`);

      // 4. 최신 Checkpoint 로드
      const restored = await restoreFromCheckpoint(taskId);

      if (restored) {
        console.log(`✅ Task ${taskId} restored successfully`);
      } else {
        console.log(`❌ Failed to restore task ${taskId}`);
      }
    }
  }

  console.log('✅ System bootstrap complete');
}
```

### 시나리오 2: Rate Limit 후 자동 복구

```typescript
async function handleRateLimit(taskId: string, resetTime: Date): Promise<void> {
  console.log(`⏸️  Rate limit hit for task ${taskId}`);

  // 1. Checkpoint 생성
  const checkpoint = await createCheckpoint(taskId, 'rate_limit');
  await saveCheckpoint(checkpoint);

  // 2. Agent 일시중지
  const agent = await getAgent(taskId);
  agent.process.kill('SIGTSTP');

  // 3. 상태 업데이트
  await updateAgentStatus(taskId, 'paused');

  // 4. Reset 시간 계산
  const waitMs = resetTime.getTime() - Date.now();
  console.log(`⏰ Waiting ${waitMs}ms until rate limit resets`);

  // 5. 스케줄러에 재개 작업 등록
  setTimeout(async () => {
    console.log(`🔄 Rate limit reset. Resuming task ${taskId}`);
    await restoreFromCheckpoint(taskId, checkpoint.id);
  }, waitMs);
}
```

### 시나리오 3: 수동 복구 (사용자가 "재개" 클릭)

```typescript
async function resumeTask(taskId: string): Promise<void> {
  console.log(`▶️  User requested resume for task ${taskId}`);

  // 1. 최신 Checkpoint 확인
  const checkpoint = await getLatestCheckpoint(taskId);

  if (!checkpoint) {
    throw new Error('No checkpoint found to resume from');
  }

  // 2. Checkpoint에서 복구
  await restoreFromCheckpoint(taskId, checkpoint.id);

  console.log(`✅ Task ${taskId} resumed`);
}
```

### 복구 구현

```typescript
async function restoreFromCheckpoint(
  taskId: string,
  checkpointId?: string
): Promise<boolean> {
  try {
    // 1. Checkpoint 로드
    const checkpoint = checkpointId
      ? await loadCheckpoint(taskId, checkpointId)
      : await loadLatestCheckpoint(taskId);

    if (!checkpoint) {
      console.error(`No checkpoint found for task ${taskId}`);
      return false;
    }

    console.log(`📂 Loading checkpoint: ${checkpoint.id}`);

    // 2. Workspace 검증
    const workspaceValid = await validateWorkspace(checkpoint.workspace);
    if (!workspaceValid) {
      console.error('Workspace validation failed');
      return false;
    }

    // 3. Agent 프로세스 생성
    const agent = await createAgent({
      taskId: checkpoint.taskId,
      taskType: checkpoint.task.type,
      workingDir: checkpoint.workspace.path,
    });

    // 4. 환경 변수 재주입
    await injectEnvironmentVariables(agent, checkpoint.environment);

    // 5. 대화 히스토리 복원
    await restoreConversationHistory(agent, checkpoint.conversationHistory);

    // 6. Agent 상태 복원
    await updateAgentStatus(taskId, checkpoint.agent.status);

    // 7. Agent 재개 (SIGCONT)
    if (checkpoint.agent.status === 'running') {
      agent.process.kill('SIGCONT');
    }

    console.log(`✅ Checkpoint restored: ${checkpoint.id}`);
    return true;

  } catch (error) {
    console.error(`❌ Checkpoint restore failed:`, error);
    return false;
  }
}
```

---

## 에러 처리

### Checkpoint 생성 실패

```typescript
try {
  await createCheckpoint(taskId, 'interval');
} catch (error) {
  console.error('Failed to create checkpoint:', error);
  // 계속 진행 (Checkpoint 실패가 Agent 실행을 막지 않음)
  // 다음 interval에 재시도
}
```

### Checkpoint 복구 실패

```typescript
const restored = await restoreFromCheckpoint(taskId);

if (!restored) {
  // Fallback: Task를 처음부터 재시작
  console.log('Checkpoint restore failed. Restarting task from beginning');

  // 사용자에게 알림
  await notifyUser({
    type: 'warning',
    message: 'Task could not be restored from checkpoint. Restarting from beginning.',
  });

  // Task 재시작
  await restartTask(taskId);
}
```

---

## 모니터링 및 로그

### Checkpoint 생성 로그

```json
{
  "timestamp": "2024-02-15T10:30:00Z",
  "type": "checkpoint_created",
  "taskId": "task_xyz789",
  "checkpointId": "checkpoint_abc123",
  "reason": "interval",
  "size": 1024000,
  "duration_ms": 150
}
```

### Checkpoint 복구 로그

```json
{
  "timestamp": "2024-02-15T10:45:00Z",
  "type": "checkpoint_restored",
  "taskId": "task_xyz789",
  "checkpointId": "checkpoint_abc123",
  "success": true,
  "duration_ms": 500,
  "messages_restored": 25,
  "environment_variables": 3
}
```

---

## 최적화

### 1. 증분 Checkpoint (Incremental)

전체 상태 대신 변경사항만 저장:

```typescript
interface IncrementalCheckpoint {
  baseCheckpointId: string;          // 기반이 되는 Checkpoint
  changes: {
    conversationHistory: {
      newMessages: ConversationMessage[];
      startIndex: number;
    };
    workspace: {
      newFiles: string[];
      modifiedFiles: string[];
    };
  };
}
```

### 2. 압축

```typescript
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

async function saveCompressedCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const json = JSON.stringify(checkpoint);
  const compressed = await gzipAsync(json);

  const filepath = `/projects/${checkpoint.taskId}/.checkpoints/${checkpoint.id}.json.gz`;
  await fs.writeFile(filepath, compressed);
}
```

### 3. 병렬 저장

```typescript
await Promise.all([
  saveCheckpointToFile(checkpoint),
  saveCheckpointToDB(checkpoint),
  updateWorkspaceMetadata(checkpoint),
]);
```

---

## 관련 문서

- **워크플로우**: `/docs/WORKFLOWS.md`
- **상태 기계**: `/docs/STATE_MACHINE.md`
- **Workspace 관리**: `/packages/agent-manager/docs/workspace/`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
