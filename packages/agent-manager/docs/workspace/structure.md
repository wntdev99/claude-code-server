# 작업 공간 구조 (Workspace Structure)

## 개요

각 Task마다 독립된 작업 공간(Workspace)이 생성되며, 모든 결과물, 메타데이터, 체크포인트, 로그가 하나의 폴더 안에 관리됩니다.

> **핵심**: 시스템이 재시작되어도 작업 디렉토리만 있으면 모든 상태를 복구할 수 있습니다.

## 작업 공간 루트 경로

### 기본 경로

```typescript
// agent-manager/lib/workspace/constants.ts
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/projects';

// Task별 작업 디렉토리
export function getTaskWorkspace(taskId: string): string {
  return path.join(WORKSPACE_ROOT, taskId);
}
```

### 예시

```bash
/projects/
├── task_20240215_abc123/    # Task 1
├── task_20240215_def456/    # Task 2
└── task_20240215_ghi789/    # Task 3
```

## 작업 디렉토리 구조

### 전체 레이아웃

```
/projects/{task-id}/
│
├── .metadata/              # 메타데이터 (시스템 관리)
│   ├── task.json          # Task 정보
│   ├── agent-state.json   # Agent 실행 상태
│   ├── history.jsonl      # 이벤트 히스토리
│   └── tokens.json        # 토큰 사용량 추적
│
├── .checkpoints/          # Checkpoint 시스템
│   ├── checkpoint_001/
│   │   ├── snapshot.tar.gz   # 파일 스냅샷
│   │   └── metadata.json     # 체크포인트 메타
│   ├── checkpoint_002/
│   │   ├── snapshot.tar.gz
│   │   └── metadata.json
│   └── latest.json        # 최신 체크포인트 정보
│
├── .logs/                 # 로그 파일
│   ├── agent.log          # 통합 로그
│   ├── stdout.log         # 표준 출력
│   ├── stderr.log         # 에러 출력
│   └── protocols.jsonl    # 프로토콜 이벤트 로그
│
├── .cache/                # 임시 캐시
│   └── prompt-cache/      # 프롬프트 캐싱
│
├── docs/                  # 문서 결과물 (Phase 1-2)
│   ├── planning/
│   │   ├── 01_idea.md
│   │   ├── 02_market.md
│   │   └── ...
│   └── design/
│       ├── 01_screen.md
│       ├── 02_data_model.md
│       └── ...
│
├── src/                   # 코드 결과물 (Phase 3)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
│
├── tests/                 # 테스트 코드
│   ├── unit/
│   └── integration/
│
├── guide/                 # 가이드 문서 (심볼릭 링크)
│   ├── planning/
│   ├── design/
│   └── development/
│
├── package.json           # 프로젝트 의존성
├── README.md              # 프로젝트 설명
├── .env.example           # 환경 변수 템플릿
└── .gitignore             # Git ignore 설정
```

## 메타데이터 디렉토리 (.metadata/)

### task.json

Task의 기본 정보를 저장합니다.

```json
{
  "id": "task_20240215_abc123",
  "title": "AI Todo App 개발",
  "type": "create_app",
  "status": "in_progress",
  "description": "AI 기반 할일 관리 앱 개발",
  "createdAt": "2024-02-15T10:00:00.000Z",
  "startedAt": "2024-02-15T10:05:00.000Z",
  "updatedAt": "2024-02-15T10:30:00.000Z",
  "currentPhase": 1,
  "totalPhases": 4,
  "workingDir": "/projects/task_20240215_abc123"
}
```

### agent-state.json

Agent의 현재 실행 상태를 저장합니다.

```json
{
  "taskId": "task_20240215_abc123",
  "status": "running",
  "currentPhase": 1,
  "currentStep": "Creating persona document",
  "progress": 35,
  "tokensUsed": 12500,
  "lastUpdate": "2024-02-15T10:30:00.000Z",
  "blockedBy": null,
  "checkpointId": "checkpoint_002",
  "metadata": {
    "model": "claude-sonnet-4-5",
    "startTime": "2024-02-15T10:05:00.000Z",
    "completedSteps": [
      "01_idea.md",
      "02_market.md"
    ],
    "pendingSteps": [
      "03_persona.md",
      "04_journey.md"
    ]
  }
}
```

### history.jsonl

모든 이벤트를 시간순으로 기록합니다 (JSON Lines 형식).

```jsonl
{"timestamp":"2024-02-15T10:00:00.000Z","event":"task_created","data":{"taskId":"task_20240215_abc123"}}
{"timestamp":"2024-02-15T10:05:00.000Z","event":"agent_started","data":{"pid":12345}}
{"timestamp":"2024-02-15T10:10:00.000Z","event":"phase_started","data":{"phase":1}}
{"timestamp":"2024-02-15T10:15:00.000Z","event":"document_created","data":{"file":"docs/planning/01_idea.md"}}
{"timestamp":"2024-02-15T10:20:00.000Z","event":"checkpoint_created","data":{"checkpointId":"checkpoint_001"}}
{"timestamp":"2024-02-15T10:25:00.000Z","event":"dependency_requested","data":{"type":"api_key","name":"OPENAI_API_KEY"}}
```

### tokens.json

토큰 사용량 추적

```json
{
  "total": {
    "input": 8500,
    "output": 4000,
    "cost": 0.25
  },
  "byPhase": {
    "1": {
      "input": 3200,
      "output": 1800,
      "cost": 0.12
    },
    "2": {
      "input": 5300,
      "output": 2200,
      "cost": 0.13
    }
  },
  "history": [
    {
      "timestamp": "2024-02-15T10:10:00.000Z",
      "input": 1200,
      "output": 600,
      "cost": 0.04
    }
  ]
}
```

## Checkpoint 디렉토리 (.checkpoints/)

### 구조

```
.checkpoints/
├── checkpoint_001/
│   ├── snapshot.tar.gz    # 전체 파일 스냅샷
│   └── metadata.json      # 체크포인트 메타데이터
├── checkpoint_002/
│   ├── snapshot.tar.gz
│   └── metadata.json
└── latest.json            # 최신 체크포인트 참조
```

### latest.json

```json
{
  "checkpointId": "checkpoint_002",
  "path": ".checkpoints/checkpoint_002",
  "createdAt": "2024-02-15T10:20:00.000Z",
  "phase": 1,
  "progress": 35,
  "type": "periodic"
}
```

### checkpoint metadata.json

```json
{
  "id": "checkpoint_002",
  "taskId": "task_20240215_abc123",
  "type": "periodic",
  "phase": 1,
  "progress": 35,
  "agentState": {
    "status": "running",
    "currentStep": "Creating persona document"
  },
  "files": [
    "docs/planning/01_idea.md",
    "docs/planning/02_market.md"
  ],
  "tokensUsed": 12500,
  "createdAt": "2024-02-15T10:20:00.000Z",
  "snapshotSize": 1048576
}
```

## 로그 디렉토리 (.logs/)

### agent.log

통합 로그 (구조화된 JSON Lines)

```jsonl
{"timestamp":"2024-02-15T10:05:00.000Z","level":"info","message":"Agent started","taskId":"task_20240215_abc123"}
{"timestamp":"2024-02-15T10:10:00.000Z","level":"info","message":"Reading guide: /guide/planning/01_idea.md"}
{"timestamp":"2024-02-15T10:15:00.000Z","level":"info","message":"Document created: docs/planning/01_idea.md"}
{"timestamp":"2024-02-15T10:25:00.000Z","level":"warn","message":"Dependency requested: OPENAI_API_KEY"}
```

### stdout.log

Agent의 원본 출력

```
Phase 1: Planning

Reading guide: /guide/planning/01_idea.md

Creating idea document...

[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
...
```

### stderr.log

에러 출력

```
Error: Failed to read file
  at readFile (...)
  at ...
```

### protocols.jsonl

프로토콜 이벤트만 추출

```jsonl
{"timestamp":"2024-02-15T10:25:00.000Z","protocol":"DEPENDENCY_REQUEST","data":{"type":"api_key","name":"OPENAI_API_KEY"}}
{"timestamp":"2024-02-15T10:30:00.000Z","protocol":"USER_QUESTION","data":{"category":"business","question":"..."}}
```

## 결과물 디렉토리

### docs/ (Phase 1-2)

```
docs/
├── planning/
│   ├── 01_idea.md
│   ├── 02_market.md
│   ├── 03_persona.md
│   ├── 04_journey.md
│   ├── 05_business_model.md
│   ├── 06_product.md
│   ├── 07_features.md
│   ├── 08_tech_stack.md
│   └── 09_roadmap.md
└── design/
    ├── 01_screen.md
    ├── 02_data_model.md
    ├── 03_task_flow.md
    ├── 04_api.md
    └── 05_architecture.md
```

### src/ (Phase 3)

실제 코드 프로젝트

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── components/
│   ├── ui/
│   └── features/
├── lib/
│   ├── db/
│   └── utils/
└── ...
```

## 작업 공간 관리 함수

### 작업 공간 생성

```typescript
// agent-manager/lib/workspace/manager.ts
import fs from 'fs/promises';
import path from 'path';

export async function createWorkspace(taskId: string): Promise<string> {
  const workspaceDir = getTaskWorkspace(taskId);

  // 1. 루트 디렉토리 생성
  await fs.mkdir(workspaceDir, { recursive: true });

  // 2. 서브 디렉토리 생성
  await Promise.all([
    fs.mkdir(path.join(workspaceDir, '.metadata'), { recursive: true }),
    fs.mkdir(path.join(workspaceDir, '.checkpoints'), { recursive: true }),
    fs.mkdir(path.join(workspaceDir, '.logs'), { recursive: true }),
    fs.mkdir(path.join(workspaceDir, '.cache'), { recursive: true }),
    fs.mkdir(path.join(workspaceDir, 'docs/planning'), { recursive: true }),
    fs.mkdir(path.join(workspaceDir, 'docs/design'), { recursive: true }),
  ]);

  // 3. 가이드 디렉토리 심볼릭 링크
  const guideSource = path.join(process.cwd(), 'guide');
  const guideTarget = path.join(workspaceDir, 'guide');

  try {
    await fs.symlink(guideSource, guideTarget, 'dir');
  } catch (error) {
    // 심볼릭 링크 실패 시 복사
    await fs.cp(guideSource, guideTarget, { recursive: true });
  }

  console.log(`Workspace created: ${workspaceDir}`);
  return workspaceDir;
}
```

### 메타데이터 초기화

```typescript
// agent-manager/lib/workspace/manager.ts
export async function initializeMetadata(
  taskId: string,
  task: Task
): Promise<void> {
  const workspaceDir = getTaskWorkspace(taskId);
  const metadataDir = path.join(workspaceDir, '.metadata');

  // task.json
  await fs.writeFile(
    path.join(metadataDir, 'task.json'),
    JSON.stringify({
      id: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      description: task.description,
      createdAt: task.createdAt,
      workingDir: workspaceDir,
    }, null, 2)
  );

  // agent-state.json
  await fs.writeFile(
    path.join(metadataDir, 'agent-state.json'),
    JSON.stringify({
      taskId: task.id,
      status: 'idle',
      currentPhase: null,
      currentStep: null,
      progress: 0,
      tokensUsed: 0,
      lastUpdate: new Date().toISOString(),
    }, null, 2)
  );

  // history.jsonl
  await appendHistory(taskId, {
    event: 'task_created',
    data: { taskId: task.id },
  });

  // tokens.json
  await fs.writeFile(
    path.join(metadataDir, 'tokens.json'),
    JSON.stringify({
      total: { input: 0, output: 0, cost: 0 },
      byPhase: {},
      history: [],
    }, null, 2)
  );
}
```

### 히스토리 추가

```typescript
// agent-manager/lib/workspace/manager.ts
export async function appendHistory(
  taskId: string,
  event: { event: string; data: any }
): Promise<void> {
  const workspaceDir = getTaskWorkspace(taskId);
  const historyFile = path.join(workspaceDir, '.metadata/history.jsonl');

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
  }) + '\n';

  await fs.appendFile(historyFile, line);
}
```

### 작업 공간 정리

```typescript
// agent-manager/lib/workspace/manager.ts
export async function cleanupWorkspace(
  taskId: string,
  keepBackup: boolean = true
): Promise<void> {
  const workspaceDir = getTaskWorkspace(taskId);

  if (keepBackup) {
    // 백업 생성
    const backupDir = path.join(WORKSPACE_ROOT, '_backups', taskId);
    await fs.cp(workspaceDir, backupDir, { recursive: true });
    console.log(`Backup created: ${backupDir}`);
  }

  // 작업 디렉토리 삭제
  await fs.rm(workspaceDir, { recursive: true, force: true });
  console.log(`Workspace cleaned: ${workspaceDir}`);
}
```

## 디스크 사용량 관리

### 공간 체크

```typescript
// agent-manager/lib/workspace/disk.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getWorkspaceSize(taskId: string): Promise<number> {
  const workspaceDir = getTaskWorkspace(taskId);

  try {
    const { stdout } = await execAsync(`du -sb ${workspaceDir}`);
    const size = parseInt(stdout.split('\t')[0]);
    return size;
  } catch (error) {
    console.error(`Failed to get workspace size for ${taskId}:`, error);
    return 0;
  }
}

export async function checkDiskSpace(): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  const { stdout } = await execAsync(`df -B1 ${WORKSPACE_ROOT}`);
  const lines = stdout.trim().split('\n');
  const [, total, used, available] = lines[1].split(/\s+/);

  return {
    total: parseInt(total),
    used: parseInt(used),
    available: parseInt(available),
  };
}
```

### 오래된 작업 정리

```typescript
// agent-manager/lib/workspace/cleanup.ts
export async function cleanupOldWorkspaces(
  olderThanDays: number = 30
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const workspaces = await fs.readdir(WORKSPACE_ROOT);

  for (const workspace of workspaces) {
    if (workspace.startsWith('_')) continue; // 백업 폴더 제외

    const workspaceDir = path.join(WORKSPACE_ROOT, workspace);
    const taskFile = path.join(workspaceDir, '.metadata/task.json');

    try {
      const taskData = JSON.parse(await fs.readFile(taskFile, 'utf-8'));

      if (taskData.status === 'completed' || taskData.status === 'failed') {
        const completedAt = new Date(taskData.completedAt);

        if (completedAt < cutoffDate) {
          await cleanupWorkspace(workspace, true);
          console.log(`Cleaned up old workspace: ${workspace}`);
        }
      }
    } catch (error) {
      console.error(`Failed to process workspace ${workspace}:`, error);
    }
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`persistence.md`** - 영속성 관리 (이 구조 기반)
2. **`lifecycle.md`** - 작업 공간 생명주기
3. **`../checkpoint/creation.md`** - Checkpoint 디렉토리 구조
4. **`../../CLAUDE.md`** - 에이전트 관리자 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Workspace 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`../lifecycle/creation.md`** - 작업 공간 준비
4. **`persistence.md`** - 영속성 관리

## 다음 단계

- **영속성 관리**: `persistence.md` - 시스템 재시작 시 복구
- **작업 공간 생명주기**: `lifecycle.md` - 생성부터 삭제까지
- **Checkpoint 시스템**: `../checkpoint/creation.md` - 체크포인트 생성

## 관련 문서

- **Checkpoint Creation**: `../checkpoint/creation.md`
- **Checkpoint Recovery**: `../checkpoint/recovery.md`
- **Agent Lifecycle**: `../lifecycle/creation.md`
- **Deliverables Collection**: `../../../claude-code-server/docs/features/deliverables-collection.md`
