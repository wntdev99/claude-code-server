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
├── checkpoint_phase_complete_1708000800000.json  # Phase 완료
├── checkpoint_rate_limit_1708000200000.json      # Rate Limit
├── checkpoint_manual_1708000500000.json          # 사용자 일시중지 (manual)
└── (최신 10개 파일만 보존, 이전 파일은 자동 삭제)
```

### Checkpoint 데이터 구조

```typescript
interface Checkpoint {
  // 메타데이터
  id: string;                           // checkpoint_abc123
  taskId: string;                       // task_xyz789
  createdAt: string;                    // ISO 8601 timestamp
  createdBy: 'auto' | 'user' | 'system';
  reason: string;                       // 'interval' | 'rate_limit' | 'error' | 'phase_complete' | 'manual'

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
    createdBy: reason === 'manual' ? 'user' : 'system',
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

## File Size Limits (파일 크기 제한)

### 문제 상황

Agent가 과도하게 큰 파일을 생성하여 시스템 리소스를 고갈시킬 수 있습니다:

**문제가 있는 시나리오**:
- 100MB+ 크기의 단일 소스 코드 파일
- 거대한 로그 파일 (수 GB)
- 과도하게 큰 Checkpoint 파일
- 전체 Workspace가 수 GB 초과

**문제점**:
- 메모리 부족 (OOM) 에러
- 디스크 공간 고갈
- 느린 파일 I/O
- Checkpoint 복구 실패
- 백업 시스템 과부하

### 해결 방안

파일 타입별 크기 제한을 설정하고 강제:

#### 1. 파일 크기 제한 정의

```typescript
// packages/shared/src/config/fileSizeLimits.ts

/**
 * 파일 타입별 크기 제한 (바이트 단위)
 */
export const FILE_SIZE_LIMITS = {
  // 소스 코드 파일
  sourceCode: {
    maxSize: 10 * 1024 * 1024,        // 10 MB
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp'],
  },

  // 문서 파일
  documentation: {
    maxSize: 5 * 1024 * 1024,         // 5 MB
    extensions: ['.md', '.txt', '.rst', '.adoc'],
  },

  // 설정 파일
  configuration: {
    maxSize: 1 * 1024 * 1024,         // 1 MB
    extensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
  },

  // Checkpoint 파일
  checkpoint: {
    maxSize: 50 * 1024 * 1024,        // 50 MB
    extensions: ['.checkpoint', '.json'],
  },

  // 로그 파일
  logs: {
    maxSize: 100 * 1024 * 1024,       // 100 MB
    extensions: ['.log'],
  },

  // 이미지 파일
  images: {
    maxSize: 10 * 1024 * 1024,        // 10 MB
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  },

  // 기타 파일 (기본값)
  default: {
    maxSize: 20 * 1024 * 1024,        // 20 MB
    extensions: [],
  },
};

/**
 * Workspace 전체 크기 제한
 */
export const WORKSPACE_LIMITS = {
  maxTotalSize: 500 * 1024 * 1024,    // 500 MB
  maxFileCount: 10000,                 // 최대 10,000개 파일
};

/**
 * 파일 확장자로 카테고리 결정
 */
export function getFileSizeLimit(filename: string): number {
  const ext = path.extname(filename).toLowerCase();

  for (const [category, config] of Object.entries(FILE_SIZE_LIMITS)) {
    if (category === 'default') continue;

    if (config.extensions.includes(ext)) {
      return config.maxSize;
    }
  }

  return FILE_SIZE_LIMITS.default.maxSize;
}
```

#### 2. 파일 크기 모니터링 및 검증

```typescript
// packages/shared/src/utils/fileSizeValidator.ts

import fs from 'fs/promises';
import path from 'path';
import { getFileSizeLimit, WORKSPACE_LIMITS } from '../config/fileSizeLimits';

/**
 * 파일 크기 검증기
 */
export class FileSizeValidator {
  /**
   * 파일 크기 검증 (생성 전)
   */
  static validateFileSize(
    filename: string,
    contentSize: number
  ): ValidationResult {
    const maxSize = getFileSizeLimit(filename);

    if (contentSize > maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit: ${this.formatBytes(contentSize)} > ${this.formatBytes(maxSize)}`,
        maxSize,
        actualSize: contentSize,
      };
    }

    return {
      valid: true,
      maxSize,
      actualSize: contentSize,
    };
  }

  /**
   * 기존 파일 크기 확인
   */
  static async checkExistingFile(filePath: string): Promise<FileSizeInfo> {
    try {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const maxSize = getFileSizeLimit(filename);

      return {
        path: filePath,
        size: stats.size,
        maxSize,
        exceedsLimit: stats.size > maxSize,
        percentUsed: (stats.size / maxSize) * 100,
      };
    } catch (error) {
      throw new Error(`Failed to check file size: ${error.message}`);
    }
  }

  /**
   * Workspace 전체 크기 확인
   */
  static async checkWorkspaceSize(workspacePath: string): Promise<WorkspaceSizeInfo> {
    let totalSize = 0;
    let fileCount = 0;
    const oversizedFiles: string[] = [];

    // 재귀적으로 모든 파일 스캔
    async function scanDirectory(dirPath: string): Promise<void> {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 특정 디렉토리 제외 (node_modules, .git 등)
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;

          // 파일 크기 제한 체크
          const maxSize = getFileSizeLimit(entry.name);
          if (stats.size > maxSize) {
            oversizedFiles.push(fullPath);
          }
        }
      }
    }

    await scanDirectory(workspacePath);

    return {
      totalSize,
      fileCount,
      maxTotalSize: WORKSPACE_LIMITS.maxTotalSize,
      maxFileCount: WORKSPACE_LIMITS.maxFileCount,
      exceedsSizeLimit: totalSize > WORKSPACE_LIMITS.maxTotalSize,
      exceedsFileCountLimit: fileCount > WORKSPACE_LIMITS.maxFileCount,
      percentUsed: (totalSize / WORKSPACE_LIMITS.maxTotalSize) * 100,
      oversizedFiles,
    };
  }

  /**
   * 바이트를 사람이 읽기 쉬운 형식으로 변환
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  maxSize: number;
  actualSize: number;
}

interface FileSizeInfo {
  path: string;
  size: number;
  maxSize: number;
  exceedsLimit: boolean;
  percentUsed: number;
}

interface WorkspaceSizeInfo {
  totalSize: number;
  fileCount: number;
  maxTotalSize: number;
  maxFileCount: number;
  exceedsSizeLimit: boolean;
  exceedsFileCountLimit: boolean;
  percentUsed: number;
  oversizedFiles: string[];
}
```

#### 3. Streaming Write for Large Files

```typescript
// packages/shared/src/utils/streamingFileWriter.ts

import { createWriteStream, WriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * 스트리밍 파일 쓰기 (대용량 파일용)
 */
export class StreamingFileWriter {
  private stream: WriteStream;
  private bytesWritten: number = 0;
  private readonly maxSize: number;

  constructor(filePath: string, maxSize: number) {
    this.stream = createWriteStream(filePath);
    this.maxSize = maxSize;
  }

  /**
   * 청크 단위로 쓰기
   */
  async writeChunk(chunk: string | Buffer): Promise<void> {
    const chunkSize = Buffer.byteLength(chunk);

    // 크기 제한 확인
    if (this.bytesWritten + chunkSize > this.maxSize) {
      throw new FileSizeExceededError(
        `File size would exceed limit: ${this.bytesWritten + chunkSize} > ${this.maxSize}`
      );
    }

    return new Promise((resolve, reject) => {
      const canContinue = this.stream.write(chunk);

      this.bytesWritten += chunkSize;

      if (canContinue) {
        resolve();
      } else {
        this.stream.once('drain', resolve);
        this.stream.once('error', reject);
      }
    });
  }

  /**
   * 스트림 종료
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.end(() => resolve());
      this.stream.once('error', reject);
    });
  }

  /**
   * 현재까지 쓰인 바이트 수
   */
  getBytesWritten(): number {
    return this.bytesWritten;
  }
}

class FileSizeExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSizeExceededError';
  }
}

/**
 * 대용량 콘텐츠를 스트리밍으로 쓰기
 */
export async function writeStreamingSafe(
  filePath: string,
  contentStream: Readable,
  maxSize: number
): Promise<void> {
  const writer = new StreamingFileWriter(filePath, maxSize);

  try {
    for await (const chunk of contentStream) {
      await writer.writeChunk(chunk);
    }

    await writer.close();

    console.log(`✅ File written via streaming: ${filePath} (${writer.getBytesWritten()} bytes)`);
  } catch (error) {
    // 에러 발생 시 부분적으로 쓰인 파일 삭제
    await fs.unlink(filePath).catch(() => {});

    throw error;
  }
}
```

#### 4. Size Limit Enforcement (Agent Manager)

```typescript
// packages/agent-manager/src/deliverables/SizeEnforcer.ts

import { FileSizeValidator } from '@shared/utils/fileSizeValidator';

/**
 * 산출물 크기 제한 강제
 */
export class DeliverableSizeEnforcer {
  /**
   * 파일 생성 전 크기 검증
   */
  async validateBeforeWrite(
    filename: string,
    content: string,
    workspacePath: string
  ): Promise<ValidationResult> {
    // 1. 파일 크기 검증
    const contentSize = Buffer.byteLength(content, 'utf-8');
    const fileValidation = FileSizeValidator.validateFileSize(filename, contentSize);

    if (!fileValidation.valid) {
      return {
        allowed: false,
        reason: 'file_too_large',
        error: fileValidation.error,
        actualSize: contentSize,
        maxSize: fileValidation.maxSize,
      };
    }

    // 2. Workspace 전체 크기 확인
    const workspaceInfo = await FileSizeValidator.checkWorkspaceSize(workspacePath);

    if (workspaceInfo.exceedsSizeLimit) {
      return {
        allowed: false,
        reason: 'workspace_size_exceeded',
        error: `Workspace size limit exceeded: ${FileSizeValidator.formatBytes(workspaceInfo.totalSize)} > ${FileSizeValidator.formatBytes(workspaceInfo.maxTotalSize)}`,
        workspaceSize: workspaceInfo.totalSize,
        workspaceLimit: workspaceInfo.maxTotalSize,
      };
    }

    if (workspaceInfo.exceedsFileCountLimit) {
      return {
        allowed: false,
        reason: 'file_count_exceeded',
        error: `File count limit exceeded: ${workspaceInfo.fileCount} > ${workspaceInfo.maxFileCount}`,
        fileCount: workspaceInfo.fileCount,
        maxFileCount: workspaceInfo.maxFileCount,
      };
    }

    // 3. 경고: 80% 이상 사용 시
    if (workspaceInfo.percentUsed >= 80) {
      console.warn(`⚠️  Workspace usage high: ${workspaceInfo.percentUsed.toFixed(1)}%`);
    }

    return {
      allowed: true,
      actualSize: contentSize,
      maxSize: fileValidation.maxSize,
      workspaceUsage: workspaceInfo.percentUsed,
    };
  }

  /**
   * 과도하게 큰 파일 거부 및 Agent 피드백
   */
  async handleOversizedDeliverable(
    taskId: string,
    filename: string,
    actualSize: number,
    maxSize: number
  ): Promise<void> {
    console.error(`❌ Oversized deliverable rejected:`, {
      taskId,
      filename,
      actualSize: FileSizeValidator.formatBytes(actualSize),
      maxSize: FileSizeValidator.formatBytes(maxSize),
    });

    // Agent에 피드백 전송
    await this.sendFeedbackToAgent(taskId, {
      type: 'deliverable_rejected',
      reason: 'file_too_large',
      filename,
      actualSize: FileSizeValidator.formatBytes(actualSize),
      maxSize: FileSizeValidator.formatBytes(maxSize),
      suggestion: 'Please split the file into smaller modules or reduce content size.',
    });

    // 메트릭 기록
    metrics.increment('deliverable.rejected.size_exceeded', {
      taskId,
      filename,
    });
  }

  /**
   * 과도하게 큰 파일 자동 정리
   */
  async cleanupOversizedFiles(workspacePath: string): Promise<CleanupResult> {
    const workspaceInfo = await FileSizeValidator.checkWorkspaceSize(workspacePath);

    const deletedFiles: string[] = [];
    let freedSpace = 0;

    for (const oversizedFile of workspaceInfo.oversizedFiles) {
      try {
        const stats = await fs.stat(oversizedFile);
        await fs.unlink(oversizedFile);

        deletedFiles.push(oversizedFile);
        freedSpace += stats.size;

        console.log(`🗑️  Oversized file deleted: ${oversizedFile} (${FileSizeValidator.formatBytes(stats.size)})`);
      } catch (error) {
        console.error(`Failed to delete oversized file: ${oversizedFile}`, error);
      }
    }

    return {
      deletedCount: deletedFiles.length,
      freedSpace,
      deletedFiles,
    };
  }
}

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  error?: string;
  actualSize?: number;
  maxSize?: number;
  workspaceSize?: number;
  workspaceLimit?: number;
  fileCount?: number;
  maxFileCount?: number;
  workspaceUsage?: number;
}

interface CleanupResult {
  deletedCount: number;
  freedSpace: number;
  deletedFiles: string[];
}
```

#### 5. Monitoring and Alerting

```typescript
// packages/agent-manager/src/monitoring/FileSizeMetrics.ts

/**
 * 파일 크기 모니터링 및 메트릭
 */
export class FileSizeMetrics {
  /**
   * 파일 크기 초과 추적
   */
  trackOversizedFile(
    taskId: string,
    filename: string,
    actualSize: number,
    maxSize: number
  ): void {
    metrics.increment('file.size_exceeded', {
      taskId,
      exceedBy: actualSize - maxSize,
    });

    metrics.histogram('file.size_bytes', actualSize, {
      filename: path.extname(filename),
    });

    // 상세 로그
    logger.warn('Oversized file detected', {
      taskId,
      filename,
      actualSize: FileSizeValidator.formatBytes(actualSize),
      maxSize: FileSizeValidator.formatBytes(maxSize),
      percentOver: ((actualSize / maxSize - 1) * 100).toFixed(1) + '%',
    });
  }

  /**
   * Workspace 사용량 추적
   */
  trackWorkspaceUsage(taskId: string, info: WorkspaceSizeInfo): void {
    metrics.gauge('workspace.total_size_bytes', info.totalSize, { taskId });
    metrics.gauge('workspace.file_count', info.fileCount, { taskId });
    metrics.gauge('workspace.percent_used', info.percentUsed, { taskId });

    // 80% 이상 사용 시 알림
    if (info.percentUsed >= 80) {
      logger.warn('Workspace usage high', {
        taskId,
        percentUsed: info.percentUsed.toFixed(1) + '%',
        totalSize: FileSizeValidator.formatBytes(info.totalSize),
      });
    }

    // 100% 초과 시 긴급 알림
    if (info.exceedsSizeLimit) {
      logger.error('Workspace size limit exceeded', {
        taskId,
        totalSize: FileSizeValidator.formatBytes(info.totalSize),
        limit: FileSizeValidator.formatBytes(info.maxTotalSize),
      });

      // Slack/이메일 알림
      this.sendSizeAlert(taskId, info);
    }
  }

  /**
   * 크기 제한 초과 알림 전송
   */
  private sendSizeAlert(taskId: string, info: WorkspaceSizeInfo): void {
    // Implement alert logic
    console.error(`🚨 SIZE ALERT: Task ${taskId} exceeded workspace limit`);
  }
}
```

#### 6. Unit Tests

```typescript
// packages/shared/tests/fileSizeValidator.test.ts

import { FileSizeValidator } from '../src/utils/fileSizeValidator';
import { FILE_SIZE_LIMITS } from '../src/config/fileSizeLimits';

describe('FileSizeValidator', () => {
  test('accepts file within size limit', () => {
    const result = FileSizeValidator.validateFileSize(
      'index.ts',
      5 * 1024 * 1024 // 5 MB
    );

    expect(result.valid).toBe(true);
  });

  test('rejects file exceeding size limit', () => {
    const result = FileSizeValidator.validateFileSize(
      'huge_file.ts',
      20 * 1024 * 1024 // 20 MB (exceeds 10 MB limit for .ts)
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds limit');
  });

  test('applies correct limit per file type', () => {
    expect(getFileSizeLimit('script.js')).toBe(FILE_SIZE_LIMITS.sourceCode.maxSize);
    expect(getFileSizeLimit('README.md')).toBe(FILE_SIZE_LIMITS.documentation.maxSize);
    expect(getFileSizeLimit('config.json')).toBe(FILE_SIZE_LIMITS.configuration.maxSize);
  });

  test('formats bytes correctly', () => {
    expect(FileSizeValidator.formatBytes(1024)).toBe('1.00 KB');
    expect(FileSizeValidator.formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(FileSizeValidator.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});
```

#### 예시 시나리오

**시나리오 1: 과도하게 큰 소스 코드 파일**

```typescript
// Agent 시도: 15MB 크기의 index.ts 생성
const content = 'x'.repeat(15 * 1024 * 1024);

const validation = FileSizeValidator.validateFileSize('index.ts', content.length);
// → { valid: false, error: "File size exceeds limit: 15.00 MB > 10.00 MB" }

// 결과: 파일 생성 거부, Agent에 피드백 전송
// 피드백: "Please split the file into smaller modules"
```

**시나리오 2: Workspace 크기 제한 초과**

```typescript
const workspaceInfo = await FileSizeValidator.checkWorkspaceSize('/projects/task_123');

if (workspaceInfo.exceedsSizeLimit) {
  console.error('Workspace size limit exceeded:', {
    totalSize: FileSizeValidator.formatBytes(workspaceInfo.totalSize),
    limit: FileSizeValidator.formatBytes(workspaceInfo.maxTotalSize),
  });

  // 자동 정리 실행
  const cleanup = await sizeEnforcer.cleanupOversizedFiles('/projects/task_123');
  // → 과도하게 큰 파일 삭제
}
```

**시나리오 3: 스트리밍 파일 쓰기**

```typescript
// 대용량 로그 파일을 스트리밍으로 쓰기
const logStream = createReadStream('large_log.txt');

await writeStreamingSafe(
  '/projects/task_123/output.log',
  logStream,
  100 * 1024 * 1024 // 100 MB limit
);

// 결과: 메모리 효율적으로 파일 생성
```

### 권장 설정

**프로덕션**:
- 소스 코드: 10 MB max
- 문서: 5 MB max
- Checkpoint: 50 MB max
- Workspace 전체: 500 MB max
- 초과 시 파일 생성 차단

**개발**:
- 제한 완화 (테스트 목적)
- 경고만 출력, 생성 허용

**모니터링**:
- Workspace 사용량 실시간 추적
- 80% 이상 사용 시 경고
- 100% 초과 시 알림 및 자동 정리

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

## Checkpoint 없는 상태 복구 (Cold Start Recovery)

Agent가 첫 번째 checkpoint 생성 전에 crash하거나, 모든 checkpoint가 손상된 경우에는 checkpoint 없이 복구를 시도해야 합니다.

### 발생 시나리오

1. **초기 crash**: Agent가 시작 후 5분 이내 (첫 checkpoint 전) crash
2. **Checkpoint 손상**: 모든 checkpoint 파일이 손상되거나 읽을 수 없음
3. **Disk 장애**: Checkpoint 디렉토리 전체가 손실됨
4. **수동 삭제**: 사용자가 `.checkpoints/` 디렉토리 삭제

### Cold Start 복구 전략

Checkpoint가 없을 때는 **Best-effort recovery**를 수행합니다:

1. Task 메타데이터에서 기본 정보 로드
2. Workspace를 스캔하여 기존 산출물 발견
3. 산출물 패턴으로 마지막 완료 Phase 추론
4. 다음 Phase 또는 현재 Phase 처음부터 재시작

### TypeScript 구현

```typescript
// packages/agent-manager/src/recovery/ColdStartRecovery.ts

import fs from 'fs/promises';
import path from 'path';

/**
 * Checkpoint 없이 Task 복구
 */
export class ColdStartRecovery {
  /**
   * Checkpoint 없는 상태에서 복구 시도
   */
  async recoverWithoutCheckpoint(taskId: string): Promise<RecoveryResult> {
    console.warn(`⚠️  No checkpoint found for task ${taskId}. Attempting cold start recovery...`);

    try {
      // 1. Task 메타데이터 로드
      const metadata = await this.loadTaskMetadata(taskId);
      if (!metadata) {
        throw new Error('Task metadata not found. Cannot recover.');
      }

      // 2. Workspace 스캔하여 산출물 발견
      const workspace = `/projects/${taskId}`;
      const deliverables = await this.scanWorkspace(workspace);

      // 3. 마지막 완료 Phase 추론
      const lastCompletedPhase = this.inferLastCompletedPhase(
        metadata.workflowType,
        deliverables
      );

      // 4. 재시작할 Phase 결정
      const restartPhase = lastCompletedPhase !== null
        ? lastCompletedPhase + 1
        : 1;

      console.log(`📊 Cold start analysis:`);
      console.log(`   - Task type: ${metadata.workflowType}`);
      console.log(`   - Deliverables found: ${deliverables.length} files`);
      console.log(`   - Last completed phase: ${lastCompletedPhase ?? 'None'}`);
      console.log(`   - Restart from: Phase ${restartPhase}`);

      // 5. Agent 재시작
      const agent = await this.restartAgent(taskId, {
        workflowType: metadata.workflowType,
        startPhase: restartPhase,
        userPrompt: metadata.userPrompt,
        partialContext: this.buildPartialContext(deliverables),
      });

      // 6. 사용자에게 알림
      await this.notifyUserOfColdStart(taskId, {
        lastCompletedPhase,
        restartPhase,
        potentialDataLoss: true,
      });

      return {
        success: true,
        recoveryType: 'cold_start',
        restartedPhase: restartPhase,
        warnings: [
          'Conversation history lost (no checkpoint)',
          'Intermediate thinking/planning lost',
          `Restarting from Phase ${restartPhase}`,
        ],
      };

    } catch (error) {
      console.error(`❌ Cold start recovery failed:`, error);
      return {
        success: false,
        recoveryType: 'cold_start',
        error: error.message,
      };
    }
  }

  /**
   * Task 메타데이터 로드
   */
  private async loadTaskMetadata(taskId: string): Promise<TaskMetadata | null> {
    try {
      const metadataPath = path.join('/projects', taskId, '.metadata', 'task.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Workspace 스캔하여 기존 산출물 발견
   */
  private async scanWorkspace(workspacePath: string): Promise<Deliverable[]> {
    const deliverables: Deliverable[] = [];

    try {
      // docs/planning/ 스캔
      const planningDir = path.join(workspacePath, 'docs', 'planning');
      if (await this.dirExists(planningDir)) {
        const files = await fs.readdir(planningDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(planningDir, file), 'utf-8');
            deliverables.push({
              phase: 1,
              file: `docs/planning/${file}`,
              size: content.length,
            });
          }
        }
      }

      // docs/design/ 스캔
      const designDir = path.join(workspacePath, 'docs', 'design');
      if (await this.dirExists(designDir)) {
        const files = await fs.readdir(designDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(designDir, file), 'utf-8');
            deliverables.push({
              phase: 2,
              file: `docs/design/${file}`,
              size: content.length,
            });
          }
        }
      }

      // src/ 스캔 (코드 파일)
      const srcDir = path.join(workspacePath, 'src');
      if (await this.dirExists(srcDir)) {
        const files = await this.recursiveScan(srcDir);
        for (const file of files) {
          deliverables.push({
            phase: 3,
            file: path.relative(workspacePath, file),
            size: (await fs.stat(file)).size,
          });
        }
      }

      return deliverables;
    } catch (error) {
      console.warn(`⚠️  Workspace scan failed:`, error);
      return [];
    }
  }

  /**
   * 산출물 패턴으로 마지막 완료 Phase 추론
   */
  private inferLastCompletedPhase(
    workflowType: string,
    deliverables: Deliverable[]
  ): number | null {
    if (deliverables.length === 0) return null;

    const phaseGroups = new Map<number, Deliverable[]>();
    for (const d of deliverables) {
      if (!phaseGroups.has(d.phase)) {
        phaseGroups.set(d.phase, []);
      }
      phaseGroups.get(d.phase)!.push(d);
    }

    // Phase별 완료 여부 검증
    if (workflowType === 'create_app') {
      // Phase 1: 9개 planning 문서 필요
      const phase1Files = phaseGroups.get(1) || [];
      const phase1Complete = phase1Files.length >= 9 &&
        phase1Files.every(d => d.size >= 500);

      // Phase 2: 5개 design 문서 필요
      const phase2Files = phaseGroups.get(2) || [];
      const phase2Complete = phase2Files.length >= 5 &&
        phase2Files.every(d => d.size >= 500);

      // Phase 3: 코드 파일 존재
      const phase3Files = phaseGroups.get(3) || [];
      const phase3Complete = phase3Files.length > 0;

      if (phase3Complete) return 3;
      if (phase2Complete) return 2;
      if (phase1Complete) return 1;
      return null;

    } else if (workflowType === 'modify_app') {
      // Phase 1: analysis doc
      const phase1Complete = phaseGroups.has(1);
      // Phase 2: modification plan
      const phase2Complete = phaseGroups.has(2);

      if (phase2Complete) return 2;
      if (phase1Complete) return 1;
      return null;

    } else {
      // 기타 workflow: Phase 번호 기준
      const maxPhase = Math.max(...Array.from(phaseGroups.keys()));
      return maxPhase;
    }
  }

  /**
   * 부분 컨텍스트 생성 (산출물 요약)
   */
  private buildPartialContext(deliverables: Deliverable[]): string {
    if (deliverables.length === 0) {
      return 'No previous deliverables found. Starting fresh.';
    }

    const summary = deliverables
      .map(d => `- ${d.file} (${d.size} bytes, Phase ${d.phase})`)
      .join('\n');

    return `
Previous deliverables found in workspace:
${summary}

Note: Due to cold start recovery, conversation history and intermediate thinking are lost.
Please review existing deliverables and continue from where the task was interrupted.
    `.trim();
  }

  /**
   * 사용자에게 Cold Start 알림
   */
  private async notifyUserOfColdStart(
    taskId: string,
    info: { lastCompletedPhase: number | null; restartPhase: number; potentialDataLoss: boolean }
  ): Promise<void> {
    const notification = {
      type: 'warning',
      title: 'Task Recovered (Cold Start)',
      message: `
Task ${taskId} has been recovered without a checkpoint.

⚠️  Potential data loss:
- Conversation history (user questions answered)
- Intermediate thinking and planning
- Exact agent state

✅ Recovered information:
- Task type and user prompt
- Existing deliverables (${info.lastCompletedPhase ?? 0} phases worth)

🔄 Restart plan:
- Resuming from Phase ${info.restartPhase}
${info.lastCompletedPhase !== null ? `- Previous work (up to Phase ${info.lastCompletedPhase}) will be reused` : '- Starting from scratch'}
      `.trim(),
    };

    // Send notification via platform
    await this.sendNotification(taskId, notification);
  }

  // Utility methods
  private async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async recursiveScan(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.recursiveScan(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}

interface RecoveryResult {
  success: boolean;
  recoveryType: 'cold_start';
  restartedPhase?: number;
  warnings?: string[];
  error?: string;
}

interface TaskMetadata {
  taskId: string;
  workflowType: string;
  userPrompt: string;
  createdAt: string;
  status: string;
}

interface Deliverable {
  phase: number;
  file: string;
  size: number;
}
```

### 복구 의사결정 트리

```
Agent crashes or restarts
  ↓
Has recent checkpoint? (< 30 min)
  ├─ YES → Restore from checkpoint (normal recovery)
  └─ NO → Check for ANY checkpoint
      ├─ YES → Restore from older checkpoint
      │         └─ Warn user about potential loss (30+ min of work)
      └─ NO → Cold Start Recovery
          ├─ Load task metadata
          ├─ Scan workspace for deliverables
          ├─ Infer last completed phase
          ├─ Restart from next/current phase
          └─ Notify user of data loss
```

### 제한 사항 및 트레이드오프

Cold Start 복구의 한계:

1. **대화 히스토리 손실**
   - 사용자가 답변한 질문들 (USER_QUESTION) 손실
   - Agent가 받은 의존성 (DEPENDENCY_REQUEST) 손실
   - ⚠️ 결과: Agent가 동일한 질문을 다시 할 수 있음

2. **중간 사고 과정 손실**
   - Agent의 내부 추론 과정 손실
   - 계획 및 디자인 결정의 근거 손실
   - ⚠️ 결과: Agent가 다른 접근 방식을 선택할 수 있음

3. **정확한 진행 상태 파악 불가**
   - Phase는 추론 가능하지만 Phase 내 진행률은 불명확
   - ⚠️ 결과: 일부 중복 작업 가능성

4. **부분 완료된 Phase 처리 어려움**
   - Phase 1이 80% 완료되었다가 crash → 처음부터 다시 시작
   - ⚠️ 결과: 중복 작업 발생

### 완화 전략

이러한 한계를 줄이기 위한 전략:

1. **빠른 첫 Checkpoint**
   - 시작 후 5분 이내 첫 checkpoint 생성
   - → Cold start 가능성 최소화

2. **다중 Checkpoint 보존**
   - 최소 3개의 checkpoint 보관 (7일간)
   - → 단일 checkpoint 손상에도 복구 가능

3. **사용자 알림**
   - Cold start 발생 시 명확한 경고 메시지
   - 잠재적 데이터 손실 설명
   - 재시작 계획 설명

4. **산출물 기반 재개**
   - 기존 산출물 최대한 활용
   - Phase 재시작 시 기존 파일 검토
   - 불필요한 중복 작업 방지

### 예시 시나리오

#### 시나리오 1: Phase 1 80% 완료 시 Crash (Checkpoint 없음)

```
[Before Crash]
- Phase 1 진행 중 (80% complete)
- 9개 문서 중 7개 작성 완료
- 2개 문서 작성 중 (아직 저장 안 됨)
- 첫 checkpoint 생성 직전 crash

[Cold Start Recovery]
1. Scan workspace: 7개 planning 문서 발견
2. Infer phase: Phase 1 미완료 (9개 필요, 7개만 존재)
3. Decision: Phase 1 처음부터 재시작
4. Result: 기존 7개 문서 검토 후 부족한 2개 + 전체 재검증
```

#### 시나리오 2: Phase 2 완료 직후 Crash (Checkpoint 없음)

```
[Before Crash]
- Phase 2 방금 완료
- Phase completion signal 출력 완료
- Checkpoint 생성 시도 중 disk full → crash

[Cold Start Recovery]
1. Scan workspace:
   - 9개 planning 문서 (Phase 1 완료)
   - 5개 design 문서 (Phase 2 완료)
2. Infer phase: Phase 2 완료
3. Decision: Phase 3부터 재시작
4. Result: Phase 1, 2 산출물 활용하여 Phase 3 개발 시작
```

#### 시나리오 3: 모든 Checkpoint 손상

```
[Situation]
- Disk corruption으로 .checkpoints/ 전체 손상
- Task는 Phase 3 개발 중이었음

[Cold Start Recovery]
1. Scan workspace: Phase 1, 2 문서 + 일부 코드 발견
2. Infer phase: Phase 3 진행 중
3. Decision: Phase 3 계속 진행
4. Result:
   - 기존 코드 검토
   - 미완성 부분 식별
   - 개발 계속
   ⚠️  대화 히스토리 손실로 일부 결정의 근거 불명확
```

### 모니터링 메트릭

Cold Start Recovery 추적:

```typescript
interface ColdStartMetrics {
  totalColdStarts: number;          // 총 cold start 발생 횟수
  coldStartRate: number;            // Cold start 비율 (0-1)
  avgRecoveryTime: number;          // 평균 복구 소요 시간 (ms)
  inferenceAccuracy: number;        // Phase 추론 정확도 (0-1)
  userComplaintRate: number;        // 사용자 불만 비율 (중복 작업 등)
}
```

**알림 조건**:
- Cold start rate > 5% → Checkpoint 시스템 점검 필요
- Inference accuracy < 80% → 산출물 패턴 감지 로직 개선 필요

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

## 동시성 처리 (Concurrency Handling)

여러 Agent가 동시에 실행되거나 같은 Agent가 여러 Checkpoint를 빠르게 생성할 때의 처리 전략입니다.

### 시나리오 1: 동시 Checkpoint 저장

**문제**: 여러 Agent가 동시에 Checkpoint 저장 시도

```
Agent A (task_123): Checkpoint 저장 요청 (10:00:00.100)
Agent B (task_456): Checkpoint 저장 요청 (10:00:00.150)
Agent C (task_789): Checkpoint 저장 요청 (10:00:00.200)
```

**해결**: Checkpoint 저장 큐 사용

```typescript
import { Queue } from 'async';

// Checkpoint 저장 큐 (동시 실행 제한: 3)
const checkpointQueue = new Queue(async (task: CheckpointTask) => {
  await saveCheckpointToFile(task);
}, 3); // 최대 3개 동시 저장

function createCheckpoint(taskId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    checkpointQueue.push(
      { taskId, timestamp: Date.now() },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}
```

**성능 고려사항**:
- 동시 실행 제한: 3개 (파일 I/O 부하 방지)
- 큐 크기 제한: 100 (메모리 보호)
- 큐 가득 차면: 가장 오래된 요청부터 거부 (오류 로그)

### 시나리오 2: 같은 Agent의 중복 Checkpoint 요청

**문제**: Rate limit 감지와 자동 주기가 동시에 발생

```
Agent (task_123):
  - 10:00:00: 자동 주기 (10분) → Checkpoint 요청
  - 10:00:00.050: Rate limit 감지 → Checkpoint 요청
```

**해결**: Debouncing + 중복 제거

```typescript
const pendingCheckpoints = new Map<string, NodeJS.Timeout>();

function createCheckpoint(taskId: string, reason: string): void {
  // 1. 이미 대기 중인 요청이 있으면 취소
  if (pendingCheckpoints.has(taskId)) {
    clearTimeout(pendingCheckpoints.get(taskId)!);
  }

  // 2. 100ms debounce (같은 시간대 여러 요청 병합)
  const timer = setTimeout(async () => {
    await saveCheckpoint(taskId, reason);
    pendingCheckpoints.delete(taskId);
  }, 100);

  pendingCheckpoints.set(taskId, timer);
}
```

**효과**:
- 100ms 내 여러 요청 → 1개로 병합
- 마지막 reason이 우선 (Rate limit > auto)
- 불필요한 I/O 방지

### 시나리오 3: Checkpoint 저장 중 다음 Checkpoint 요청

**문제**: Checkpoint 저장이 느릴 때 다음 요청이 들어옴

```
10:00:00: Agent A Checkpoint 저장 시작 (5초 소요)
10:00:02: Agent A Checkpoint 저장 요청 (다시)
10:00:05: 첫 번째 저장 완료
```

**해결**: 저장 중 플래그 + 큐 대기

```typescript
const savingCheckpoints = new Set<string>();

async function createCheckpoint(taskId: string): Promise<void> {
  // 이미 저장 중이면 큐에 추가만 하고 리턴
  if (savingCheckpoints.has(taskId)) {
    console.log(`Checkpoint save in progress for ${taskId}, queuing...`);
    return queueCheckpoint(taskId);
  }

  try {
    savingCheckpoints.add(taskId);
    await saveCheckpointToFile(taskId);
  } finally {
    savingCheckpoints.delete(taskId);
  }
}
```

### 시나리오 4: 다중 Agent Manager 인스턴스 (분산 시스템)

**문제**: 여러 Agent Manager 서버가 같은 Agent의 Checkpoint 저장 시도

**해결**: 파일 잠금 (File Locking) 또는 분산 잠금

```typescript
import * as fs from 'fs';

async function saveCheckpointWithLock(taskId: string): Promise<void> {
  const lockFile = `/checkpoints/${taskId}.lock`;

  try {
    // 1. 배타적 잠금 획득 시도
    const fd = await fs.promises.open(lockFile, 'wx');

    // 2. Checkpoint 저장
    await saveCheckpointToFile(taskId);

    // 3. 잠금 해제
    await fd.close();
    await fs.promises.unlink(lockFile);

  } catch (error) {
    if (error.code === 'EEXIST') {
      // 다른 인스턴스가 이미 저장 중
      console.warn(`Checkpoint for ${taskId} is being saved by another instance`);
      return;
    }
    throw error;
  }
}
```

### 동시성 가드레일

**Agent Manager 전역 설정**:

```typescript
const CHECKPOINT_CONFIG = {
  maxConcurrentSaves: 3,          // 최대 동시 저장
  queueMaxSize: 100,               // 큐 최대 크기
  debounceMs: 100,                 // 중복 요청 병합 시간
  saveTimeoutMs: 30000,            // 저장 타임아웃 (30초)
  retryAttempts: 3,                // 실패 시 재시도 횟수
};
```

**모니터링 메트릭**:
- 큐 길이 (queue length)
- 평균 저장 시간 (avg save time)
- 중복 제거된 요청 수 (deduplicated requests)
- 저장 실패 횟수 (failed saves)

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

## Checkpoint 버전 마이그레이션 전략

### 개요

Checkpoint 데이터 구조는 시스템 업데이트에 따라 변경될 수 있습니다. 기존 Checkpoint와의 호환성을 유지하면서 새로운 구조로 마이그레이션하는 전략이 필요합니다.

### 버전 관리 체계

#### Checkpoint 스키마 버전

```typescript
interface Checkpoint {
  id: string;
  taskId: string;
  version: string; // "1.0", "1.1", "2.0" 등
  schemaVersion: number; // 1, 2, 3 등 (내부 버전)
  createdAt: Date;

  // 실제 데이터
  data: {
    agentState: AgentState;
    conversationHistory: ConversationMessage[];
    workspace: WorkspaceSnapshot;
    environment: Record<string, string>;
  };
}
```

**버전 관리 규칙**:
- **Major 버전 (1.x → 2.x)**: 호환성 깨지는 변경 (마이그레이션 필수)
- **Minor 버전 (1.0 → 1.1)**: 하위 호환 가능한 추가 (마이그레이션 선택)
- **Patch 버전 (1.0.1 → 1.0.2)**: 버그 수정 (마이그레이션 불필요)

### 마이그레이션 전략

#### 1. 지연 마이그레이션 (Lazy Migration)

Checkpoint 로드 시 자동으로 마이그레이션:

```typescript
// packages/agent-manager/src/CheckpointMigration.ts

export class CheckpointMigrator {
  private migrations: Map<number, Migration> = new Map();

  constructor() {
    // 마이그레이션 함수 등록
    this.registerMigration(1, this.migrateV0toV1);
    this.registerMigration(2, this.migrateV1toV2);
    this.registerMigration(3, this.migrateV2toV3);
  }

  /**
   * Checkpoint 로드 시 자동 마이그레이션
   */
  async loadAndMigrate(checkpointPath: string): Promise<Checkpoint> {
    const raw = await fs.readFile(checkpointPath, 'utf-8');
    const checkpoint = JSON.parse(raw) as Checkpoint;

    const currentVersion = this.getCurrentSchemaVersion();
    const checkpointVersion = checkpoint.schemaVersion || 0;

    if (checkpointVersion === currentVersion) {
      // 최신 버전 - 마이그레이션 불필요
      return checkpoint;
    }

    if (checkpointVersion > currentVersion) {
      throw new Error(
        `Checkpoint schema version ${checkpointVersion} is newer than current ${currentVersion}. ` +
        `Please update the system.`
      );
    }

    // 마이그레이션 수행
    console.log(`🔄 Migrating checkpoint from v${checkpointVersion} to v${currentVersion}`);
    const migrated = await this.migrate(checkpoint, checkpointVersion, currentVersion);

    // 마이그레이션된 버전 저장 (선택적)
    if (process.env.SAVE_MIGRATED_CHECKPOINTS === 'true') {
      await this.saveCheckpoint(migrated, checkpointPath);
    }

    return migrated;
  }

  /**
   * 순차적 마이그레이션 실행
   */
  private async migrate(
    checkpoint: Checkpoint,
    fromVersion: number,
    toVersion: number
  ): Promise<Checkpoint> {
    let current = checkpoint;

    for (let v = fromVersion + 1; v <= toVersion; v++) {
      const migration = this.migrations.get(v);
      if (!migration) {
        throw new Error(`Migration to version ${v} not found`);
      }

      console.log(`  → Applying migration v${v - 1} → v${v}`);
      current = await migration(current);
      current.schemaVersion = v;
    }

    return current;
  }

  /**
   * 현재 시스템의 스키마 버전
   */
  private getCurrentSchemaVersion(): number {
    return 3; // 현재 최신 버전
  }

  /**
   * 마이그레이션 함수 등록
   */
  private registerMigration(version: number, fn: Migration): void {
    this.migrations.set(version, fn);
  }

  // ========================================
  // 마이그레이션 함수들
  // ========================================

  /**
   * v0 → v1: conversationHistory에 role 필드 추가
   */
  private migrateV0toV1 = async (checkpoint: any): Promise<Checkpoint> => {
    if (!checkpoint.data.conversationHistory) {
      checkpoint.data.conversationHistory = [];
    }

    // 기존 메시지에 role 추가
    checkpoint.data.conversationHistory = checkpoint.data.conversationHistory.map(
      (msg: any) => ({
        ...msg,
        role: msg.role || 'user', // 기본값: user
      })
    );

    return checkpoint;
  };

  /**
   * v1 → v2: workspace에 dependencies 추가
   */
  private migrateV1toV2 = async (checkpoint: any): Promise<Checkpoint> => {
    if (!checkpoint.data.workspace.dependencies) {
      checkpoint.data.workspace.dependencies = {
        files: [],
        environment: {},
      };
    }

    return checkpoint;
  };

  /**
   * v2 → v3: agentState에 currentPhase 구조화
   */
  private migrateV2toV3 = async (checkpoint: any): Promise<Checkpoint> => {
    const oldPhase = checkpoint.data.agentState.phase;

    // phase를 구조화된 객체로 변환
    checkpoint.data.agentState.currentPhase = {
      number: oldPhase,
      name: this.getPhaseNameFromNumber(oldPhase),
      status: 'in_progress',
      startedAt: checkpoint.createdAt,
    };

    // 구버전 필드 제거
    delete checkpoint.data.agentState.phase;

    return checkpoint;
  };

  private getPhaseNameFromNumber(phase: number): string {
    const names = ['Planning', 'Design', 'Development', 'Testing'];
    return names[phase - 1] || 'Unknown';
  }
}

type Migration = (checkpoint: any) => Promise<Checkpoint>;
```

#### 2. 일괄 마이그레이션 (Batch Migration)

시스템 업데이트 시 모든 Checkpoint를 한 번에 마이그레이션:

```typescript
// scripts/migrate-checkpoints.ts

import { glob } from 'glob';
import { CheckpointMigrator } from './CheckpointMigration';

async function batchMigrateCheckpoints() {
  const migrator = new CheckpointMigrator();

  // 모든 Checkpoint 파일 찾기
  const checkpointFiles = await glob('/projects/**/.checkpoints/*.json');

  console.log(`Found ${checkpointFiles.length} checkpoints to migrate`);

  let successCount = 0;
  let failureCount = 0;

  for (const filepath of checkpointFiles) {
    try {
      console.log(`Migrating: ${filepath}`);

      // 로드 및 마이그레이션
      const migrated = await migrator.loadAndMigrate(filepath);

      // 백업 생성
      await fs.copyFile(filepath, `${filepath}.backup`);

      // 마이그레이션된 버전 저장
      await fs.writeFile(filepath, JSON.stringify(migrated, null, 2));

      successCount++;
    } catch (error) {
      console.error(`Failed to migrate ${filepath}:`, error);
      failureCount++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failure: ${failureCount}`);
}

// 실행
batchMigrateCheckpoints().catch(console.error);
```

#### 3. 하위 호환성 유지 (Backward Compatibility)

새 기능 추가 시 기존 Checkpoint와 호환성 유지:

```typescript
// 새 필드는 Optional로 정의
interface CheckpointV2 {
  id: string;
  taskId: string;
  schemaVersion: number;

  data: {
    agentState: AgentState;
    conversationHistory: ConversationMessage[];
    workspace: WorkspaceSnapshot;
    environment: Record<string, string>;

    // 새 필드: Optional (v2에서 추가)
    metadata?: {
      tags?: string[];
      priority?: 'low' | 'medium' | 'high';
    };
  };
}

// 로드 시 기본값 제공
function loadCheckpoint(checkpoint: CheckpointV2): CheckpointV2 {
  return {
    ...checkpoint,
    data: {
      ...checkpoint.data,
      metadata: checkpoint.data.metadata || {
        tags: [],
        priority: 'medium',
      },
    },
  };
}
```

### 마이그레이션 스크립트 관리

#### 마이그레이션 히스토리

```typescript
// migrations/checkpoint-migrations.ts

export const CHECKPOINT_MIGRATIONS = [
  {
    version: 1,
    date: '2024-01-15',
    description: 'Add role field to conversationHistory',
    breaking: false,
  },
  {
    version: 2,
    date: '2024-02-01',
    description: 'Add dependencies to workspace',
    breaking: false,
  },
  {
    version: 3,
    date: '2024-02-15',
    description: 'Restructure agentState.phase to currentPhase',
    breaking: true,
  },
];

export function getMigrationsSince(version: number): Migration[] {
  return CHECKPOINT_MIGRATIONS.filter(m => m.version > version);
}
```

### 에러 처리 및 롤백

```typescript
export class CheckpointMigrator {
  /**
   * 마이그레이션 실패 시 롤백
   */
  async migrateWithRollback(checkpoint: Checkpoint): Promise<Checkpoint> {
    const backup = JSON.parse(JSON.stringify(checkpoint)); // Deep copy

    try {
      const migrated = await this.migrate(
        checkpoint,
        checkpoint.schemaVersion || 0,
        this.getCurrentSchemaVersion()
      );

      return migrated;
    } catch (error) {
      console.error('Migration failed, rolling back:', error);

      // 백업에서 복구
      return backup;
    }
  }

  /**
   * 검증: 마이그레이션 후 데이터 무결성 확인
   */
  private async validateMigration(checkpoint: Checkpoint): Promise<boolean> {
    try {
      // 필수 필드 존재 확인
      if (!checkpoint.id || !checkpoint.taskId) {
        return false;
      }

      // 데이터 구조 확인
      if (!checkpoint.data.agentState || !checkpoint.data.conversationHistory) {
        return false;
      }

      // 스키마 버전 확인
      if (checkpoint.schemaVersion !== this.getCurrentSchemaVersion()) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
```

### 모니터링 및 로깅

```typescript
// 마이그레이션 통계 수집
export class MigrationMonitor {
  private stats = {
    total: 0,
    success: 0,
    failure: 0,
    byVersion: new Map<string, number>(),
  };

  recordMigration(
    fromVersion: number,
    toVersion: number,
    success: boolean
  ): void {
    this.stats.total++;

    if (success) {
      this.stats.success++;
    } else {
      this.stats.failure++;
    }

    const key = `${fromVersion}→${toVersion}`;
    this.stats.byVersion.set(key, (this.stats.byVersion.get(key) || 0) + 1);
  }

  getStats() {
    return {
      ...this.stats,
      byVersion: Object.fromEntries(this.stats.byVersion),
    };
  }
}
```

### 사용 가이드

#### 개발자를 위한 마이그레이션 작성 가이드

1. **새 마이그레이션 추가 시**:
   ```typescript
   // CheckpointMigrator 생성자에 등록
   this.registerMigration(4, this.migrateV3toV4);

   // 마이그레이션 함수 작성
   private migrateV3toV4 = async (checkpoint: any): Promise<Checkpoint> => {
     // 변경 사항 구현
     checkpoint.data.newField = 'default_value';
     return checkpoint;
   };
   ```

2. **버전 번호 증가**:
   ```typescript
   private getCurrentSchemaVersion(): number {
     return 4; // 3에서 4로 증가
   }
   ```

3. **마이그레이션 히스토리 업데이트**:
   ```typescript
   export const CHECKPOINT_MIGRATIONS = [
     // ...existing migrations
     {
       version: 4,
       date: '2024-03-01',
       description: 'Add newField to data',
       breaking: false,
     },
   ];
   ```

4. **테스트 작성**:
   ```typescript
   test('migrateV3toV4 adds newField', async () => {
     const v3Checkpoint = { schemaVersion: 3, data: {} };
     const migrated = await migrator.migrateV3toV4(v3Checkpoint);
     expect(migrated.data.newField).toBe('default_value');
   });
   ```

---

## 관련 문서

- **워크플로우**: `/docs/WORKFLOWS.md`
- **상태 기계**: `/docs/STATE_MACHINE.md`
- **Workspace 관리**: `/packages/agent-manager/docs/workspace/`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.1
