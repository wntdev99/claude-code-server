# Workspace (작업 공간) 문서

## 개요

Workspace는 각 Task마다 독립적으로 생성되는 작업 디렉토리입니다. 모든 결과물, 메타데이터, Checkpoint, 로그가 하나의 폴더 안에 관리되며, 시스템 재시작 시에도 복구 가능합니다.

## 핵심 원칙

### 1. 단일 진실 공급원 (Single Source of Truth)

작업 디렉토리만 있으면 모든 상태를 복구할 수 있습니다.

```
/projects/{task-id}/
└── 모든 정보가 여기에!
    ├── .metadata/      # 메타데이터
    ├── .checkpoints/   # Checkpoint
    ├── .logs/          # 로그
    └── docs/, src/     # 결과물
```

### 2. 영속성 (Persistence)

- 파일 시스템이 주 저장소
- 데이터베이스는 인덱스 역할
- 메모리는 휘발성 (재시작 시 복구)

### 3. 자기완결성 (Self-Contained)

각 작업 디렉토리는 독립적이며, 다른 Task에 영향을 주지 않습니다.

## 문서 목록

### 필수 문서

1. **[structure.md](structure.md)** - 작업 공간 구조
   - 디렉토리 레이아웃
   - 파일 구조
   - 메타데이터 포맷
   - 관리 함수

2. **[persistence.md](persistence.md)** - 영속성 관리
   - 시스템 재시작 시 복구
   - 데이터베이스 동기화
   - 히스토리 재생
   - 백업 및 복원

3. **[lifecycle.md](lifecycle.md)** - 작업 공간 생명주기
   - 생성 → 활성 → 일시중지 → 완료 → 보관 → 삭제
   - 자동 Checkpoint
   - 로그 모니터링
   - 보관 정책

## 빠른 가이드

### 작업 공간 생성

```typescript
import { createTaskWorkspace } from '@/lib/workspace/lifecycle';

const workspaceDir = await createTaskWorkspace(task);
// /projects/task_abc123 생성됨
```

### 시스템 재시작 시 복구

```typescript
import { bootstrapSystem } from '@/lib/bootstrap/recovery';

await bootstrapSystem();
// 모든 작업 디렉토리 스캔 → 데이터베이스 동기화 → 활성 작업 복구
```

### 결과물 수집

```typescript
import { collectDeliverables } from '@/lib/deliverables/collector';

const deliverables = await collectDeliverables(taskId, phase);
// docs/planning/*.md 수집
```

### 작업 완료 후 보관

```typescript
import { archiveWorkspace } from '@/lib/workspace/lifecycle';

const archiveFile = await archiveWorkspace(taskId);
// /projects/_archive/task_abc123.tar.gz 생성
// /projects/task_abc123 제거
```

## 주요 기능

### 1. 자동 Checkpoint (10분마다)

```typescript
// 자동으로 실행됨
setInterval(() => {
  createCheckpoint(taskId, 'periodic');
}, 10 * 60 * 1000);
```

### 2. 히스토리 로깅

```typescript
await appendHistory(taskId, {
  event: 'phase_completed',
  data: { phase: 1 },
});
// .metadata/history.jsonl에 추가됨
```

### 3. 디스크 사용량 모니터링

```typescript
// 5분마다 실행
setInterval(async () => {
  const { total, used } = await checkDiskSpace();
  if (used / total > 0.9) {
    await cleanupOldWorkspaces(7); // 7일 이상 된 작업 정리
  }
}, 5 * 60 * 1000);
```

## 디렉토리 구조

```
/projects/
├── task_20240215_abc123/      # Task 1
│   ├── .metadata/
│   │   ├── task.json
│   │   ├── agent-state.json
│   │   ├── history.jsonl
│   │   └── tokens.json
│   ├── .checkpoints/
│   │   ├── checkpoint_001/
│   │   ├── checkpoint_002/
│   │   └── latest.json
│   ├── .logs/
│   │   ├── agent.log
│   │   ├── stdout.log
│   │   └── stderr.log
│   ├── docs/
│   │   ├── planning/
│   │   └── design/
│   └── src/
│
├── task_20240215_def456/      # Task 2
│
├── _archive/                   # 보관된 작업들
│   ├── task_20240210_old.tar.gz
│   └── ...
│
└── _backups/                   # 백업 파일들
    └── task_20240215_abc123_1234567890.tar.gz
```

## 작업 상태 전이

```
생성 (Creation)
  ↓
활성 (Active)
  ├─→ 일시중지 (Paused)
  │     ↓
  │   재개 → Active
  ↓
완료 (Completed)
  ↓
보관 (Archived)
  ↓
삭제 (Deleted)
```

## 복구 시나리오

### 시나리오 1: 서버 재시작

```typescript
// 시스템 시작 시 자동 실행
await bootstrapSystem();

// 1. 작업 디렉토리 스캔
// 2. 메타데이터 읽기
// 3. 데이터베이스 동기화
// 4. 진행 중이던 작업 복구
```

### 시나리오 2: 크래시 후 복구

```typescript
// Checkpoint에서 복구
const checkpoint = await findLatestCheckpoint(taskId);
await restoreFromCheckpoint(taskId, checkpoint.id);

// 에이전트 재시작
await resumeAgent({ taskId });
```

### 시나리오 3: 수동 복구

```typescript
// 사용자가 특정 Checkpoint 선택
await restoreFromCheckpoint(taskId, userSelectedCheckpointId);
```

## 보관 정책

### 기본 정책

```typescript
const DEFAULT_ARCHIVE_POLICY = {
  completedOlderThan: 30,   // 완료된 작업: 30일 후 보관
  failedOlderThan: 7,       // 실패한 작업: 7일 후 보관
  minDiskSpacePercent: 80,  // 디스크 80% 사용 시 강제 보관
};
```

### 자동 보관

```typescript
// 매일 자정 실행
cron.schedule('0 0 * * *', () => {
  autoArchive();
});
```

## 모니터링

### Workspace 상태 확인

```typescript
const stats = await getWorkspaceStats();

console.log(stats);
// {
//   total: 10,
//   byStatus: {
//     active: 2,
//     paused: 1,
//     completed: 5,
//     failed: 1,
//     archived: 1,
//   },
//   diskUsage: {
//     total: 524288000,  // 500MB
//     byTask: { ... }
//   }
// }
```

## 문제 해결

### "작업 디렉토리가 없어요"

```typescript
// Task 메타데이터에서 경로 확인
const task = await db.task.findUnique({ where: { id: taskId } });
console.log(task.workingDir);

// 디렉토리 존재 확인
await fs.access(task.workingDir);
```

### "Checkpoint에서 복구가 안돼요"

```typescript
// Checkpoint 유효성 검사
const validation = await validateCheckpoint(checkpoint);

if (!validation.valid) {
  console.error('Invalid checkpoint:', validation.errors);
}
```

### "디스크 공간이 부족해요"

```typescript
// 오래된 작업 정리
await cleanupOldWorkspaces(7);  // 7일 이상

// 강제 보관
await autoArchive({
  completedOlderThan: 7,
  failedOlderThan: 3,
  minDiskSpacePercent: 70,
});
```

## Best Practices

### ✅ 좋은 방법

1. **정기적인 Checkpoint 생성**
   - 자동 Checkpoint (10분마다)
   - 중요한 시점에 수동 Checkpoint

2. **히스토리 로깅**
   - 모든 중요 이벤트 기록
   - 디버깅 및 복구에 활용

3. **정기적인 보관**
   - 완료된 작업은 30일 후 보관
   - 디스크 공간 관리

4. **백업 유지**
   - 보관 전 백업 생성
   - 백업 파일 별도 저장

### ❌ 피해야 할 실수

1. **메모리 상태만 의존**
   - 항상 파일 시스템에 저장

2. **데이터베이스만 업데이트**
   - 파일 시스템과 동기화 필수

3. **Checkpoint 없이 종료**
   - 항상 종료 전 Checkpoint 생성

4. **보관 없이 삭제**
   - 영구 삭제 전 반드시 보관

## 관련 문서

### Agent Manager

- **Checkpoint Creation**: `../checkpoint/creation.md`
- **Checkpoint Recovery**: `../checkpoint/recovery.md`
- **Agent Lifecycle**: `../lifecycle/creation.md`

### Web Server

- **Deliverables Collection**: `../../../claude-code-server/docs/features/deliverables-collection.md`
- **Task Management**: `../../../claude-code-server/docs/features/task-management.md`

### 프로젝트 개요

- **Agent Manager Guide**: `../../CLAUDE.md`
- **Architecture**: `../../../../docs/ARCHITECTURE.md`

## 다음 단계

1. **[structure.md](structure.md)** 읽기 - 작업 공간 구조 이해
2. **[persistence.md](persistence.md)** 읽기 - 복구 메커니즘 이해
3. **[lifecycle.md](lifecycle.md)** 읽기 - 생명주기 관리 이해

---

**중요**: 작업 디렉토리는 시스템의 핵심입니다. 항상 파일 시스템을 단일 진실 공급원으로 관리하세요!
