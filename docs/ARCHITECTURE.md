# 시스템 아키텍처

## 개요

Claude Code Server는 **3-Tier 아키텍처**로 구축된 웹 기반 에이전트 관리 시스템으로, Claude Code CLI를 브라우저를 통해 작업을 제출하고 Claude Code 에이전트가 자동으로 실행하는 플랫폼으로 변환하며, 포괄적인 진행 상황 추적 및 사용자 상호작용을 제공합니다.

## 3-Tier 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│                      (Web Browser)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/SSE
┌────────────────────────────▼────────────────────────────────────┐
│                    TIER 1: WEB SERVER                           │
│                  (claude-code-server)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js Application (App Router)                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  UI Pages  │  │ API Routes │  │ SSE Stream │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │                                                           │  │
│  │  Features:                                                │  │
│  │  - Task CRUD operations                                  │  │
│  │  - Real-time log streaming (SSE)                         │  │
│  │  - Review UI (approve/reject)                            │  │
│  │  - Dependency provision interface                        │  │
│  │  - User question response interface                      │  │
│  │  - Settings management                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Process Spawning & IPC
┌────────────────────────────▼────────────────────────────────────┐
│                  TIER 2: AGENT MANAGER                          │
│                    (agent-manager)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent Orchestration Engine                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │Lifecycle │  │  Queue   │  │ Protocol │  │ Token   │ │  │
│  │  │  Mgmt    │  │  Mgmt    │  │  Parser  │  │ Tracker │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  │                                                           │  │
│  │  Responsibilities:                                        │  │
│  │  - Spawn/manage Claude Code processes                    │  │
│  │  - Assign work to sub-agents                             │  │
│  │  - Parse agent output for protocols                      │  │
│  │  - Track state & progress                                │  │
│  │  - Handle rate limits & checkpoints                      │  │
│  │  - Manage task queue                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Task Assignment & Monitoring
┌────────────────────────────▼────────────────────────────────────┐
│                  TIER 3: SUB-AGENT                              │
│                     (sub-agent)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Claude Code Agent Instances                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │   Planning   │  │    Design    │  │  Development  │  │  │
│  │  │   Executor   │  │   Executor   │  │   Executor    │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │  │
│  │                                                           │  │
│  │  Responsibilities:                                        │  │
│  │  - Execute tasks following phase workflows               │  │
│  │  - Reference guide documents                             │  │
│  │  - Generate deliverables (docs + code)                   │  │
│  │  - Communicate via protocols                             │  │
│  │  - Make autonomous decisions                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Reads: /guide/* (24 guide documents)                          │
└─────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 상호작용 흐름

### 1. Task 생성 및 실행

```
User (Browser)
    │
    │ POST /api/tasks { title, type, description }
    ↓
Web Server (claude-code-server)
    │ 1. 입력 검증
    │ 2. 데이터베이스 저장
    │ 3. Agent Manager에 알림
    ↓
Agent Manager
    │ 1. 큐에 추가
    │ 2. 준비되면 Claude Code 프로세스 생성
    │ 3. Sub-agent에 초기 프롬프트 전송
    ↓
Sub-Agent (Claude Code)
    │ 1. 가이드 문서 읽기
    │ 2. Phase 기반 워크플로우 실행
    │ 3. 산출물 생성
    │ 4. 로그 및 프로토콜 메시지 출력
    ↑
Agent Manager
    │ 1. 출력 파싱
    │ 2. 프로토콜 감지 (의존성, 질문, 완료)
    │ 3. 상태 업데이트
    │ 4. Web Server로 이벤트 전달
    ↑
Web Server
    │ 1. 사용자에게 이벤트 스트리밍 (SSE)
    │ 2. UI에 표시
    ↑
User (Browser)
    │ 실시간 로그 및 진행 상황 확인
```

### 2. Phase 완료 및 리뷰 흐름

```
Sub-Agent
    │ Output: === PHASE 1 COMPLETE ===
    ↓
Agent Manager
    │ 1. 완료 신호 파싱
    │ 2. Agent 일시중지
    │ 3. 리뷰 생성
    │ 4. Web Server에 알림
    ↓
Web Server
    │ 1. 산출물 수집
    │ 2. 리뷰 레코드 생성
    │ 3. SSE 이벤트 전송
    │ 4. 리뷰 UI 표시
    ↓
User (Browser)
    │ 1. 산출물 리뷰
    │ 2. 승인 또는 변경 요청
    │ 3. PATCH /api/reviews/{id}/approve
    ↓
Web Server
    │ 1. 리뷰 상태 업데이트
    │ 2. Agent Manager에 알림
    ↓
Agent Manager
    │ 1. 승인 시: 다음 Phase 프롬프트로 Agent 재개
    │ 2. 변경 요청 시: 피드백과 함께 Agent 재개
    ↓
Sub-Agent
    │ 다음 Phase로 진행 또는 현재 Phase 재작업
```

## 데이터 흐름 아키텍처

### 이벤트 기반 아키텍처

플랫폼은 상태 관리를 위해 **이벤트 소싱** 방식을 사용합니다:

```
Domain Event → Event Store → State Reconstruction
```

**Domain Events**:
- `TaskCreated`
- `TaskStarted`
- `PhaseStarted`
- `PhaseCompleted`
- `ReviewCreated`
- `ReviewApproved`
- `DependencyRequested`
- `DependencyProvided`
- `QuestionAsked`
- `QuestionAnswered`
- `TaskCompleted`
- `TaskFailed`

**이점**:
1. **감사 추적**: 모든 상태 변경의 완전한 이력
2. **시간 여행**: 어느 시점의 상태든 재구성 가능
3. **디버깅**: 이벤트 재생으로 문제 재현
4. **분석**: 패턴 및 트렌드 분석

### 상태 저장

```
┌─────────────────────────────────────────┐
│         Database Layer                  │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ Events Table │  │ Snapshots Table│  │
│  └──────────────┘  └────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Tables:                         │  │
│  │  - tasks                         │  │
│  │  - phases                        │  │
│  │  - reviews                       │  │
│  │  - dependencies                  │  │
│  │  - questions                     │  │
│  │  - checkpoints                   │  │
│  │  - events                        │  │
│  │  - usage_metrics                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**개발 환경**: SQLite (임베디드)
**프로덕션**: PostgreSQL (확장 가능)

## 통신 프로토콜

### 1. HTTP/REST APIs

```
Web Server가 RESTful API 제공:

Tasks:
  POST   /api/tasks              - Task 생성
  GET    /api/tasks              - Task 목록
  GET    /api/tasks/[id]         - Task 조회
  PATCH  /api/tasks/[id]         - Task 업데이트
  DELETE /api/tasks/[id]         - Task 삭제
  POST   /api/tasks/[id]/execute - Task 실행
  POST   /api/tasks/[id]/pause   - Task 일시중지
  POST   /api/tasks/[id]/resume  - Task 재개

Reviews:
  GET    /api/tasks/[id]/reviews           - 리뷰 목록
  POST   /api/tasks/[id]/reviews           - 리뷰 생성
  PATCH  /api/reviews/[id]/approve         - 승인
  PATCH  /api/reviews/[id]/request-changes - 변경 요청

Dependencies:
  GET    /api/tasks/[id]/dependencies      - 목록
  POST   /api/dependencies/[id]/provide    - 제공

Questions:
  GET    /api/tasks/[id]/questions         - 목록
  POST   /api/questions/[id]/answer        - 답변
```

### 2. Server-Sent Events (SSE)

```
Web Server가 실시간 업데이트 스트리밍:

GET /api/tasks/[id]/stream

Event types:
  - log: Agent 출력
  - phase_update: Phase 상태 변경
  - step_update: 단계 진행 상황
  - user_question: Agent의 질문
  - review_required: Phase 리뷰 필요
  - complete: Task 완료
  - error: 에러 발생
```

### 3. Platform-Agent 프로토콜

Agent 통신을 위한 구조화된 텍스트 프로토콜:

**사용자 질문**:
```
[USER_QUESTION]
category: business
question: What pricing model?
options: [Subscription, Freemium, Ad-based]
[/USER_QUESTION]
```

**Phase 완료**:
```
=== PHASE N COMPLETE ===
```

**에러**:
```
[ERROR]
type: execution_failed
message: Build failed
[/ERROR]
```

## 기술 스택

### Frontend (Tier 1)
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **State**: Zustand
- **Real-time**: EventSource (SSE)

### Backend (Tier 1 & 2)
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Process Management**: child_process
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Scheduling**: node-cron

### Agent Runtime (Tier 3)
- **Engine**: Claude Code CLI
- **Model**: Claude Sonnet 4.5
- **Context**: CLAUDE.md 가이드 로드
- **Tools**: 전체 Claude Code 도구 모음

## 확장성 고려사항

### 수평 확장

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Web Server  │  │ Web Server  │  │ Web Server  │
│  Instance 1 │  │  Instance 2 │  │  Instance 3 │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼────────┐
                │  Load Balancer │
                └───────┬────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
│   Agent     │  │   Agent    │  │   Agent     │
│  Manager 1  │  │  Manager 2 │  │  Manager 3  │
└─────────────┘  └────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼────────┐
                │   PostgreSQL   │
                │   (Primary)    │
                └────────────────┘
```

### 큐 관리

높은 동시성을 위한 분산 큐 구현:
- **기술**: Redis + Bull
- **기능**: 우선순위 큐, 재시도 로직, Rate Limiting
- **이점**: 여러 Agent Manager가 공유 큐에서 소비 가능

### Rate Limit 처리

**Checkpoint 시스템**:
1. Rate Limit 전 Agent 상태 저장
2. 나중에 실행하기 위해 큐에 저장
3. Reset 시간 후 자동 재개

**Token 예산 관리**:
1. Task당 Token 사용량 추적
2. 실행 전 비용 예측
3. 제한 근접 시 일시중지

## 보안 아키텍처

### 1. 입력 검증

```typescript
// 경로 순회 공격 방지
validatePath(userPath, baseDir)

// 프롬프트 주입 방어
sanitizePrompt(userInput)

// SQL 주입 방지 (Prisma ORM 사용)
```

### 2. 비밀 관리

```typescript
// API 키 및 비밀 암호화
encryptSecret(value) // AES-256-CBC

// 데이터베이스에 암호화하여 저장
// 런타임에만 복호화

// 비밀 로그 금지
```

### 3. 프로세스 격리

```typescript
// 각 Agent는 격리된 프로세스에서 실행
// 제한된 파일시스템 접근
// 샌드박스 환경
// 리소스 제한 (메모리, CPU)
```

### 4. 인증 및 권한 부여

```typescript
// 사용자 인증 (선택사항)
// API 키 인증
// 역할 기반 접근 제어
// 사용자당 Rate Limiting
```

## 배포 아키텍처

### 개발 환경
```
Local Machine
├── Next.js Dev Server (Port 3000)
├── SQLite Database (./prisma/dev.db)
└── Agent Processes (온디맨드 생성)
```

### 프로덕션
```
Cloud Infrastructure (AWS/GCP/Azure)
├── Next.js App (Vercel/Railway/Docker)
│   └── 부하 기반 자동 확장
├── PostgreSQL (관리형 서비스)
│   └── 읽기 확장을 위한 복제본
├── Redis (세션 및 큐)
└── S3/Cloud Storage (산출물)
```

## 모니터링 및 관찰성

### 메트릭
- Task 성공/실패율
- Phase당 평균 실행 시간
- Token 사용량 및 비용
- Rate Limit 발생 건수
- Agent 가동 시간 및 상태

### 로깅
- 구조화된 로그 (JSON)
- 로그 레벨 (debug, info, warn, error)
- 요청 추적을 위한 Correlation ID
- Agent 출력 로그 (보존)

### 알림
- Task 실패
- Rate Limit 초과
- 높은 비용
- 시스템 에러

## 보안 고려사항

### 파일 경로 검증 (Path Traversal 방지)

**문제**: Sub-Agent가 `../../etc/passwd` 같은 경로로 시스템 파일에 접근하거나 덮어쓰려고 시도할 수 있음

**방어 메커니즘**:

#### 1. 경로 검증 (Path Validation)

```typescript
// packages/shared/src/utils/validatePath.ts
import path from 'path';

/**
 * 파일 경로가 허용된 workspace 디렉토리 내에 있는지 검증
 */
export function validatePath(
  filePath: string,
  workspaceRoot: string
): boolean {
  // 1. 절대 경로로 정규화
  const normalizedPath = path.resolve(filePath);
  const normalizedRoot = path.resolve(workspaceRoot);

  // 2. 정규화된 경로가 workspace 내에 있는지 확인
  const isWithinWorkspace = normalizedPath.startsWith(normalizedRoot);

  if (!isWithinWorkspace) {
    console.error(`⛔ Path traversal attempt detected: ${filePath}`);
    return false;
  }

  // 3. 민감한 파일명 차단
  const sensitiveFiles = ['.env', 'id_rsa', 'credentials.json', 'secrets.yaml'];
  const fileName = path.basename(filePath);

  if (sensitiveFiles.includes(fileName)) {
    console.error(`⛔ Attempt to access sensitive file: ${fileName}`);
    return false;
  }

  return true;
}

/**
 * 안전한 파일 쓰기 래퍼
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  workspaceRoot: string
): Promise<void> {
  if (!validatePath(filePath, workspaceRoot)) {
    throw new Error(`Access denied: Path outside workspace`);
  }

  await fs.writeFile(filePath, content, 'utf-8');
}
```

#### 2. Agent Manager에서 경로 검증

```typescript
// packages/agent-manager/src/AgentManager.ts
export class AgentManager {
  async spawnAgent(task: Task): Promise<ChildProcess> {
    const workspaceRoot = `/projects/${task.id}`;

    // Workspace 디렉토리 생성
    await fs.mkdir(workspaceRoot, { recursive: true });

    // Agent 프로세스 생성 with working directory restriction
    const agentProcess = spawn('claude', ['chat'], {
      cwd: workspaceRoot,  // ← Agent의 작업 디렉토리 제한
      env: {
        ...process.env,
        WORKSPACE_ROOT: workspaceRoot,  // ← Agent가 접근 가능한 루트 경로
        ALLOWED_PATHS: workspaceRoot,   // ← 허용된 경로 목록
      },
    });

    return agentProcess;
  }
}
```

#### 3. Sub-Agent 가이드 지침

Sub-Agent는 항상 상대 경로를 사용하도록 가이드:

```markdown
# /guide/development/02_data.md

## 파일 생성 규칙

✅ **허용**: Workspace 내 상대 경로
```javascript
// Good
await writeFile('src/models/User.ts', content);
await writeFile('docs/api.md', content);
```

❌ **금지**: 절대 경로 또는 상위 디렉토리 참조
```javascript
// Bad
await writeFile('/etc/passwd', content);           // 시스템 파일
await writeFile('../../../secrets.txt', content);  // Path traversal
await writeFile('~/.ssh/id_rsa', content);        // Home directory
```

#### 4. 추가 보안 강화 (Multi-Layer Defense)

Path Traversal 공격을 방어하기 위한 다층 보안 메커니즘:

##### Layer 1: Canonical Path Resolution (정규 경로 확인)

```typescript
// packages/shared/src/utils/pathValidation.ts

import fs from 'fs/promises';
import path from 'path';

/**
 * 다층 경로 검증 (심볼릭 링크, 하드 링크 해결)
 */
export async function validatePathEnhanced(
  filePath: string,
  workspaceRoot: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. 정규 경로 확인 (심볼릭 링크 해결)
    const canonicalPath = await fs.realpath(filePath).catch(() => filePath);
    const canonicalRoot = await fs.realpath(workspaceRoot);

    // 2. Workspace 경계 확인
    if (!canonicalPath.startsWith(canonicalRoot)) {
      errors.push(`Path outside workspace: ${canonicalPath}`);
      return { valid: false, errors, warnings, canonicalPath };
    }

    // 3. 심볼릭 링크 감지
    const stats = await fs.lstat(filePath);
    if (stats.isSymbolicLink()) {
      const linkTarget = await fs.readlink(filePath);

      warnings.push(`File is a symbolic link to: ${linkTarget}`);

      // 링크 대상도 검증
      const targetCanonical = await fs.realpath(linkTarget).catch(() => linkTarget);
      if (!targetCanonical.startsWith(canonicalRoot)) {
        errors.push(`Symbolic link points outside workspace: ${targetCanonical}`);
        return { valid: false, errors, warnings, canonicalPath };
      }
    }

    // 4. 시스템 디렉토리 Deny-list
    const deniedPaths = [
      '/etc',
      '/sys',
      '/proc',
      '/dev',
      '/root',
      '/boot',
      '/usr/bin',
      '/usr/sbin',
      '/var/log',
    ];

    for (const deniedPath of deniedPaths) {
      if (canonicalPath.startsWith(deniedPath)) {
        errors.push(`Access to system directory denied: ${deniedPath}`);
        return { valid: false, errors, warnings, canonicalPath };
      }
    }

    return {
      valid: true,
      errors: [],
      warnings,
      canonicalPath,
    };
  } catch (error) {
    errors.push(`Path validation error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canonicalPath?: string;
}
```

##### Layer 2: Workspace Boundary Enforcement (작업공간 경계 강제)

```typescript
// packages/agent-manager/src/security/WorkspaceSandbox.ts

/**
 * Workspace 샌드박스 (chroot-like 경계 강제)
 */
export class WorkspaceSandbox {
  private readonly workspaceRoot: string;
  private readonly deniedSystemPaths: Set<string>;

  constructor(taskId: string) {
    this.workspaceRoot = path.resolve(`/projects/${taskId}`);
    this.deniedSystemPaths = new Set([
      '/etc',
      '/sys',
      '/proc',
      '/dev',
      '/root',
      '/boot',
      '/bin',
      '/sbin',
      '/lib',
      '/lib64',
      '/usr/bin',
      '/usr/sbin',
      '/usr/lib',
      '/var/log',
      '/tmp',
      '/home',
    ]);
  }

  /**
   * 경로가 샌드박스 내에 있는지 확인
   */
  async isPathAllowed(filePath: string): Promise<boolean> {
    // 1. 절대 경로로 변환
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.workspaceRoot, filePath);

    // 2. 정규 경로 확인 (심볼릭 링크 해결)
    let canonicalPath: string;
    try {
      canonicalPath = await fs.realpath(absolutePath);
    } catch (error) {
      // 파일이 존재하지 않는 경우 (생성 예정)
      canonicalPath = path.resolve(absolutePath);
    }

    // 3. Workspace 경계 확인
    if (!canonicalPath.startsWith(this.workspaceRoot)) {
      console.error(`🚫 Path outside workspace boundary:`, {
        requested: filePath,
        canonical: canonicalPath,
        workspace: this.workspaceRoot,
      });
      return false;
    }

    // 4. 시스템 경로 Deny-list 확인
    for (const deniedPath of this.deniedSystemPaths) {
      if (canonicalPath.startsWith(deniedPath)) {
        console.error(`🚫 Access to system directory denied:`, {
          canonical: canonicalPath,
          deniedPath,
        });
        return false;
      }
    }

    // 5. 상위 디렉토리 참조 감지
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      console.warn(`⚠️  Path contains parent directory reference:`, {
        path: filePath,
        normalized: normalizedPath,
      });

      // 정규화 후에도 경계를 벗어나는지 재확인
      if (!canonicalPath.startsWith(this.workspaceRoot)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 안전한 파일 쓰기
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!(await this.isPathAllowed(filePath))) {
      throw new SecurityError(
        `Access denied: Path outside workspace or system directory`
      );
    }

    // 디렉토리 확인
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 파일 쓰기
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`✅ File written within sandbox: ${filePath}`);
  }

  /**
   * 안전한 파일 읽기
   */
  async readFile(filePath: string): Promise<string> {
    if (!(await this.isPathAllowed(filePath))) {
      throw new SecurityError(
        `Access denied: Path outside workspace or system directory`
      );
    }

    return await fs.readFile(filePath, 'utf-8');
  }
}

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

##### Layer 3: System Directory Deny-list

```typescript
// packages/shared/src/security/systemPaths.ts

/**
 * 시스템 디렉토리 Deny-list (OS별)
 */
export const SYSTEM_DIRECTORY_DENYLIST = {
  linux: [
    '/etc',          // 시스템 설정
    '/sys',          // 시스템 정보
    '/proc',         // 프로세스 정보
    '/dev',          // 디바이스 파일
    '/root',         // Root 사용자 홈
    '/boot',         // 부팅 파일
    '/bin',          // 시스템 바이너리
    '/sbin',         // 시스템 관리자 바이너리
    '/lib',          // 라이브러리
    '/lib64',        // 64비트 라이브러리
    '/usr/bin',      // 사용자 바이너리
    '/usr/sbin',     // 사용자 관리자 바이너리
    '/usr/lib',      // 사용자 라이브러리
    '/var/log',      // 시스템 로그
    '/var/run',      // 런타임 데이터
    '/tmp',          // 임시 파일 (선택적)
    '/home',         // 다른 사용자 홈 (선택적)
  ],
  darwin: [
    '/System',       // macOS 시스템
    '/Library',      // 시스템 라이브러리
    '/private/etc',  // 설정
    '/private/var',  // 시스템 변수
    '/usr/bin',
    '/usr/sbin',
    '/Applications', // 애플리케이션 (선택적)
  ],
  windows: [
    'C:\\Windows',   // Windows 시스템
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\ProgramData',
    'C:\\Users\\All Users',
  ],
};

/**
 * OS에 맞는 Deny-list 반환
 */
export function getSystemDenylist(): string[] {
  const platform = process.platform;

  if (platform === 'linux') {
    return SYSTEM_DIRECTORY_DENYLIST.linux;
  } else if (platform === 'darwin') {
    return SYSTEM_DIRECTORY_DENYLIST.darwin;
  } else if (platform === 'win32') {
    return SYSTEM_DIRECTORY_DENYLIST.windows;
  }

  return [];
}
```

##### Layer 4: Symbolic Link Detection and Handling

```typescript
// packages/shared/src/security/symlinkHandler.ts

/**
 * 심볼릭 링크 감지 및 처리
 */
export class SymlinkHandler {
  /**
   * 경로가 심볼릭 링크인지 확인
   */
  static async isSymlink(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.lstat(filePath);
      return stats.isSymbolicLink();
    } catch (error) {
      return false;
    }
  }

  /**
   * 심볼릭 링크 대상 확인
   */
  static async getSymlinkTarget(filePath: string): Promise<string | null> {
    try {
      if (await this.isSymlink(filePath)) {
        return await fs.readlink(filePath);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 심볼릭 링크가 안전한지 검증
   */
  static async validateSymlink(
    symlinkPath: string,
    workspaceRoot: string
  ): Promise<ValidationResult> {
    const target = await this.getSymlinkTarget(symlinkPath);

    if (!target) {
      return { valid: true, warnings: [] };
    }

    // 대상 경로 정규화
    const targetAbsolute = path.isAbsolute(target)
      ? target
      : path.resolve(path.dirname(symlinkPath), target);

    const canonicalTarget = await fs.realpath(targetAbsolute).catch(() => targetAbsolute);
    const canonicalRoot = await fs.realpath(workspaceRoot);

    // 대상이 Workspace 외부를 가리키는지 확인
    if (!canonicalTarget.startsWith(canonicalRoot)) {
      return {
        valid: false,
        warnings: [
          `Symbolic link points outside workspace: ${canonicalTarget}`,
        ],
      };
    }

    return { valid: true, warnings: [] };
  }

  /**
   * 하드 링크 감지
   */
  static async hasMultipleLinks(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.nlink > 1;
    } catch (error) {
      return false;
    }
  }
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
}
```

##### Integration Example

```typescript
// packages/agent-manager/src/security/PathSecurityManager.ts

/**
 * 통합 경로 보안 관리자
 */
export class PathSecurityManager {
  private sandbox: WorkspaceSandbox;

  constructor(taskId: string) {
    this.sandbox = new WorkspaceSandbox(taskId);
  }

  /**
   * 완전한 경로 검증 (모든 레이어)
   */
  async validatePath(filePath: string): Promise<SecurityCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Layer 1: Canonical path resolution
    const enhancedValidation = await validatePathEnhanced(
      filePath,
      this.sandbox.workspaceRoot
    );

    if (!enhancedValidation.valid) {
      errors.push(...enhancedValidation.errors);
    }
    warnings.push(...enhancedValidation.warnings);

    // Layer 2: Workspace boundary enforcement
    const isAllowed = await this.sandbox.isPathAllowed(filePath);

    if (!isAllowed) {
      errors.push('Path violates workspace boundary');
    }

    // Layer 3: System directory deny-list (already in Layer 2)

    // Layer 4: Symlink detection
    if (await SymlinkHandler.isSymlink(filePath)) {
      const symlinkValidation = await SymlinkHandler.validateSymlink(
        filePath,
        this.sandbox.workspaceRoot
      );

      if (!symlinkValidation.valid) {
        errors.push('Symbolic link points outside workspace');
      }
      warnings.push(...symlinkValidation.warnings);
    }

    // Hard link detection
    if (await SymlinkHandler.hasMultipleLinks(filePath)) {
      warnings.push('File has multiple hard links');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canonicalPath: enhancedValidation.canonicalPath,
    };
  }

  /**
   * 안전한 파일 작업
   */
  async safeFileOperation(
    operation: 'read' | 'write',
    filePath: string,
    content?: string
  ): Promise<any> {
    const validation = await this.validatePath(filePath);

    if (!validation.valid) {
      throw new SecurityError(
        `Security check failed: ${validation.errors.join(', ')}`
      );
    }

    // 경고 로깅
    if (validation.warnings.length > 0) {
      console.warn(`⚠️  Path security warnings:`, validation.warnings);
    }

    // 파일 작업 수행
    if (operation === 'read') {
      return await this.sandbox.readFile(filePath);
    } else {
      await this.sandbox.writeFile(filePath, content!);
    }
  }
}

interface SecurityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canonicalPath?: string;
}
```

##### Unit Tests

```typescript
// packages/shared/tests/pathSecurity.test.ts

import { PathSecurityManager } from '../src/security/PathSecurityManager';

describe('PathSecurityManager - Enhanced Path Validation', () => {
  let manager: PathSecurityManager;

  beforeEach(() => {
    manager = new PathSecurityManager('test_task_123');
  });

  test('allows paths within workspace', async () => {
    const result = await manager.validatePath('/projects/test_task_123/src/index.ts');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('blocks path traversal', async () => {
    const result = await manager.validatePath('../../../etc/passwd');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('outside workspace'))).toBe(true);
  });

  test('blocks system directories', async () => {
    const result = await manager.validatePath('/etc/shadow');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('system directory'))).toBe(true);
  });

  test('detects symbolic links', async () => {
    // Create a test symlink
    await fs.symlink('/etc/passwd', '/projects/test_task_123/passwd_link');

    const result = await manager.validatePath('/projects/test_task_123/passwd_link');

    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes('symbolic link'))).toBe(true);
  });

  test('allows relative paths', async () => {
    const result = await manager.validatePath('src/utils/helper.ts');

    expect(result.valid).toBe(true);
  });
});
```

##### Monitoring and Alerting

```typescript
/**
 * 경로 보안 위반 모니터링
 */
class PathSecurityMetrics {
  /**
   * 보안 위반 추적
   */
  trackSecurityViolation(
    taskId: string,
    filePath: string,
    violationType: string
  ): void {
    metrics.increment('security.path_violation', {
      type: violationType,
    });

    // 심각한 위반: 즉시 알림
    logger.error('Path security violation detected', {
      taskId,
      filePath,
      violationType,
      timestamp: new Date().toISOString(),
    });

    // Slack/이메일 알림
    if (violationType === 'system_directory' || violationType === 'path_traversal') {
      this.sendSecurityAlert(taskId, filePath, violationType);
    }
  }

  /**
   * 보안 알림 전송
   */
  private sendSecurityAlert(
    taskId: string,
    filePath: string,
    violationType: string
  ): void {
    // Implement alert logic (Slack, email, etc.)
    console.error(`🚨 SECURITY ALERT: ${violationType} in task ${taskId}`);
  }
}
```

##### 추가 보안 계층 (Optional)

**Option A: Chroot Jail** (Linux only)
```bash
# Agent 프로세스를 chroot 환경에서 실행
sudo chroot /projects/task_123 claude chat
```

**Option B: Docker 컨테이너**
```bash
# Agent를 컨테이너 내에서 실행
docker run --rm -v /projects/task_123:/workspace:ro -w /workspace claude-agent
```

**Option C: 파일 시스템 감시**
```typescript
// 실시간으로 파일 쓰기 감시
import { watch } from 'chokidar';

const watcher = watch(workspaceRoot, {
  ignored: /(^|[\/\\])\../,  // 숨김 파일 무시
});

watcher.on('add', async (filePath) => {
  const validation = await pathSecurityManager.validatePath(filePath);

  if (!validation.valid) {
    console.error(`⛔ Unauthorized file creation: ${filePath}`);
    await fs.unlink(filePath);  // 즉시 삭제
  }
});
```

### 기타 보안 고려사항

1. **API 키 암호화**: AES-256-GCM으로 암호화하여 저장
2. **입력 검증**: 모든 사용자 입력 sanitize
3. **Rate Limiting**: API 엔드포인트에 속도 제한 적용
4. **프로세스 격리**: 각 Sub-Agent는 독립된 프로세스
5. **로그 민감 정보 제거**: 로그에 API 키, 비밀번호 노출 방지

## 향후 개선사항

1. **멀티 테넌트 지원**: 팀을 위한 별도 워크스페이스
2. **커스텀 워크플로우**: 사용자 정의 Phase 구조
3. **플러그인 시스템**: 확장 가능한 통합
4. **고급 분석**: 사용 패턴, 비용 최적화
5. **분산 실행**: Agent Manager 클러스터링
6. **실시간 협업**: 동일 Task에 대한 여러 사용자

## 데이터베이스 동시성 제어 (DB Concurrency Control)

### Optimistic Locking 전략

여러 프로세스나 사용자가 동시에 같은 레코드를 수정할 때 데이터 무결성을 보장하는 메커니즘입니다.

#### 문제 상황

```
User A: Review 조회 (status: pending, version: 1)
User B: Review 조회 (status: pending, version: 1)

User A: Review 승인 → UPDATE ... WHERE version = 1 → success (version: 2)
User B: Review 승인 → UPDATE ... WHERE version = 1 → fail (version mismatch)
```

#### Prisma Schema 설정

```prisma
// prisma/schema.prisma

model Task {
  id          String   @id @default(cuid())
  title       String
  status      TaskStatus
  version     Int      @default(0)  // ← Optimistic lock version
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  reviews     Review[]
  questions   Question[]

  @@index([status])
}

model Review {
  id              String       @id @default(cuid())
  taskId          String
  phase           Int
  status          ReviewStatus
  version         Int          @default(0)  // ← Optimistic lock version
  deliverables    Json
  approvedBy      String?
  approvedAt      DateTime?
  comment         String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  task            Task         @relation(fields: [taskId], references: [id])

  @@unique([taskId, phase])
  @@index([taskId, status])
}

model Question {
  id          String          @id @default(cuid())
  taskId      String
  category    QuestionCategory
  question    String
  options     Json?
  answer      String?
  status      QuestionStatus
  version     Int             @default(0)  // ← Optimistic lock version
  askedAt     DateTime        @default(now())
  answeredAt  DateTime?

  task        Task            @relation(fields: [taskId], references: [id])

  @@index([taskId, status])
}

model Checkpoint {
  id                  String   @id @default(cuid())
  taskId              String
  reason              CheckpointReason
  executionState      Json
  resumeContext       Json
  version             Int      @default(0)  // ← Optimistic lock version
  createdAt           DateTime @default(now())

  @@index([taskId, createdAt])
}
```

#### TypeScript 구현 예시

**1. Review 승인 (Optimistic Locking)**

```typescript
// packages/core/src/use-cases/ApproveReview.ts

export class ApproveReviewUseCase {
  async execute(
    reviewId: string,
    userId: string,
    comment?: string
  ): Promise<Review> {
    return await db.$transaction(async (tx) => {
      // 1. 현재 버전과 함께 Review 조회
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          id: true,
          status: true,
          version: true,  // ← 현재 버전
          taskId: true,
          phase: true,
        },
      });

      if (!review) {
        throw new ReviewNotFoundError(reviewId);
      }

      if (review.status !== 'pending') {
        throw new ReviewAlreadyProcessedError(review.status);
      }

      // 2. 승인 처리 (버전 체크)
      try {
        const updated = await tx.review.update({
          where: {
            id: reviewId,
            version: review.version,  // ← Optimistic lock condition
          },
          data: {
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date(),
            comment,
            version: { increment: 1 },  // ← 버전 증가
          },
        });

        // 3. Task 상태 업데이트
        await this.updateTaskStatus(tx, review.taskId, review.phase);

        return updated;
      } catch (error) {
        if (error.code === 'P2025') {
          // Prisma: Record not found (version mismatch)
          throw new OptimisticLockError(
            `Review ${reviewId} was modified by another process`
          );
        }
        throw error;
      }
    });
  }
}
```

**2. Question 응답 처리**

```typescript
export class AnswerQuestionUseCase {
  async execute(
    questionId: string,
    answer: string
  ): Promise<Question> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await this.attemptAnswer(questionId, answer);
      } catch (error) {
        if (error instanceof OptimisticLockError && attempt < maxRetries - 1) {
          attempt++;
          console.warn(`⚠️  Retry ${attempt}/${maxRetries} for question ${questionId}`);
          await sleep(100 * attempt); // Exponential backoff
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Failed to answer question after ${maxRetries} attempts`);
  }

  private async attemptAnswer(
    questionId: string,
    answer: string
  ): Promise<Question> {
    return await db.$transaction(async (tx) => {
      const question = await tx.question.findUnique({
        where: { id: questionId },
        select: { id: true, status: true, version: true, taskId: true },
      });

      if (!question) {
        throw new QuestionNotFoundError(questionId);
      }

      if (question.status !== 'pending') {
        throw new QuestionAlreadyAnsweredError();
      }

      // Optimistic lock으로 업데이트
      const updated = await tx.question.update({
        where: {
          id: questionId,
          version: question.version,
        },
        data: {
          answer,
          status: 'answered',
          answeredAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Agent에 답변 전달
      await this.resumeAgentWithAnswer(question.taskId, answer);

      return updated;
    }).catch((error) => {
      if (error.code === 'P2025') {
        throw new OptimisticLockError('Question was already answered');
      }
      throw error;
    });
  }
}
```

**3. Checkpoint 저장 (Conflict 처리)**

```typescript
export class CheckpointManager {
  async saveCheckpoint(
    taskId: string,
    reason: CheckpointReason,
    state: ExecutionState
  ): Promise<Checkpoint> {
    try {
      return await db.checkpoint.create({
        data: {
          taskId,
          reason,
          executionState: state.toJSON(),
          resumeContext: state.resumeContext,
          version: 0,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        console.warn(`⚠️  Checkpoint already exists for ${taskId}`);

        // 최신 checkpoint 반환
        return await db.checkpoint.findFirst({
          where: { taskId },
          orderBy: { createdAt: 'desc' },
        });
      }
      throw error;
    }
  }

  /**
   * Checkpoint 복구 (Optimistic lock)
   */
  async restoreCheckpoint(checkpointId: string): Promise<ExecutionState> {
    return await db.$transaction(async (tx) => {
      const checkpoint = await tx.checkpoint.findUnique({
        where: { id: checkpointId },
        select: {
          id: true,
          taskId: true,
          executionState: true,
          resumeContext: true,
          version: true,
        },
      });

      if (!checkpoint) {
        throw new CheckpointNotFoundError(checkpointId);
      }

      // Checkpoint 사용 기록 (버전 업데이트)
      await tx.checkpoint.update({
        where: {
          id: checkpointId,
          version: checkpoint.version,
        },
        data: {
          version: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return ExecutionState.fromJSON(checkpoint.executionState);
    });
  }
}
```

#### 에러 처리 및 재시도 전략

```typescript
// packages/shared/src/errors/OptimisticLockError.ts

export class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

// Retry wrapper
export async function withOptimisticLockRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        lastError = error;
        const backoff = Math.min(100 * Math.pow(2, attempt), 1000);
        await sleep(backoff);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Operation failed after ${maxRetries} retries: ${lastError.message}`
  );
}
```

**사용 예시**:

```typescript
// API Route에서 retry 적용
export async function POST(req: Request) {
  const { reviewId, comment } = await req.json();

  try {
    const review = await withOptimisticLockRetry(
      () => approveReview(reviewId, userId, comment),
      3  // 최대 3회 재시도
    );

    return Response.json({ success: true, data: review });
  } catch (error) {
    if (error instanceof OptimisticLockError) {
      return Response.json(
        { success: false, error: 'Review was modified by another user. Please refresh and try again.' },
        { status: 409 }  // Conflict
      );
    }
    throw error;
  }
}
```

#### 모니터링 및 디버깅

```typescript
// Optimistic lock 충돌 감지
export class ConcurrencyMonitor {
  private conflictCounter = new Map<string, number>();

  recordConflict(resource: string, operation: string): void {
    const key = `${resource}:${operation}`;
    this.conflictCounter.set(key, (this.conflictCounter.get(key) || 0) + 1);

    console.warn(`⚠️  Optimistic lock conflict: ${key}`);

    // 충돌이 자주 발생하면 알림
    if (this.conflictCounter.get(key)! > 10) {
      console.error(`🚨 High contention detected: ${key}`);
      // 알림 전송
      notifyAdmins({
        type: 'high_contention',
        resource,
        operation,
        count: this.conflictCounter.get(key),
      });
    }
  }

  getConflictStats(): Record<string, number> {
    return Object.fromEntries(this.conflictCounter);
  }
}
```

#### 성능 고려사항

**Optimistic Locking의 장단점**:

장점:
- ✅ 데드락 없음
- ✅ 읽기 성능 우수 (lock 불필요)
- ✅ 낮은 경합 시나리오에 적합

단점:
- ❌ 높은 경합 시 재시도 빈번
- ❌ 클라이언트 재시도 로직 필요

**언제 사용할까**:
- ✅ Review 승인/거부 (낮은 빈도)
- ✅ Question 응답 (낮은 빈도)
- ✅ Checkpoint 복구 (낮은 빈도)
- ❌ 로그 쓰기 (높은 빈도 → append-only 사용)

---

## Zombie Process 방지 전략

### 개요

Agent Manager는 다수의 Sub-Agent 프로세스를 spawn합니다. 프로세스가 비정상 종료되거나 부모 프로세스가 종료 신호를 받지 못하면 **Zombie 프로세스**가 발생할 수 있습니다.

### Zombie 프로세스란?

**정의**: 자식 프로세스가 종료되었지만 부모 프로세스가 `waitpid()`를 호출하지 않아 커널의 프로세스 테이블에 남아있는 상태.

**문제점**:
- 시스템 리소스 낭비 (PID 테이블 점유)
- 프로세스 수 제한에 도달하면 새 프로세스 생성 불가
- 장기 실행 시 시스템 불안정

**증상**:
```bash
ps aux | grep defunct
# 또는
ps aux | grep Z
```

출력 예시:
```
user  12345  0.0  0.0      0     0 ?        Z    10:00   0:00 [claude] <defunct>
```

### 방지 전략

#### 1. 프로세스 종료 시 waitpid() 호출

모든 자식 프로세스는 종료 시 명시적으로 대기(wait)해야 합니다.

```typescript
// packages/agent-manager/src/ProcessManager.ts

import { spawn, ChildProcess } from 'child_process';

export class ProcessManager {
  private processes = new Map<string, ChildProcess>();
  private processCleanupQueue = new Set<string>();

  /**
   * Agent 프로세스 생성
   */
  spawnAgent(taskId: string, args: string[]): ChildProcess {
    const agentProcess = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false, // 부모와 동일한 프로세스 그룹
    });

    this.processes.set(taskId, agentProcess);

    // 종료 이벤트 리스너 등록
    agentProcess.on('exit', (code, signal) => {
      console.log(`Agent ${taskId} exited: code=${code}, signal=${signal}`);
      this.cleanupProcess(taskId);
    });

    // 에러 이벤트 리스너
    agentProcess.on('error', (error) => {
      console.error(`Agent ${taskId} error:`, error);
      this.cleanupProcess(taskId);
    });

    return agentProcess;
  }

  /**
   * 프로세스 정리 (Zombie 방지)
   */
  private async cleanupProcess(taskId: string): Promise<void> {
    const process = this.processes.get(taskId);
    if (!process) return;

    // 중복 정리 방지
    if (this.processCleanupQueue.has(taskId)) {
      console.warn(`⚠️  Cleanup already in progress for ${taskId}`);
      return;
    }

    this.processCleanupQueue.add(taskId);

    try {
      // stdio 스트림 닫기
      process.stdin?.end();
      process.stdout?.destroy();
      process.stderr?.destroy();

      // Map에서 제거
      this.processes.delete(taskId);

      console.log(`✅ Process cleaned up: ${taskId}`);
    } finally {
      this.processCleanupQueue.delete(taskId);
    }
  }

  /**
   * 프로세스 강제 종료
   */
  async killProcess(taskId: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const process = this.processes.get(taskId);
    if (!process || process.killed) {
      return;
    }

    return new Promise((resolve) => {
      // 종료 대기 타임아웃 (5초)
      const timeout = setTimeout(() => {
        console.warn(`⚠️  Process ${taskId} did not exit gracefully, sending SIGKILL`);
        process.kill('SIGKILL');
      }, 5000);

      // 종료 이벤트 대기
      process.once('exit', () => {
        clearTimeout(timeout);
        this.cleanupProcess(taskId);
        resolve();
      });

      // 종료 신호 전송
      process.kill(signal);
    });
  }
}
```

#### 2. 주기적 Zombie 프로세스 모니터링

시스템에 남아있는 Zombie 프로세스를 주기적으로 감지하고 정리합니다.

```typescript
export class ZombieProcessMonitor {
  private monitorInterval: NodeJS.Timeout | null = null;

  /**
   * 모니터링 시작 (1분마다)
   */
  start(): void {
    this.monitorInterval = setInterval(() => {
      this.checkZombieProcesses();
    }, 60 * 1000); // 1분

    console.log('🔍 Zombie process monitor started');
  }

  /**
   * 모니터링 중지
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Zombie 프로세스 감지 및 정리
   */
  private async checkZombieProcesses(): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Zombie 프로세스 찾기 (Linux/macOS)
      const { stdout } = await execAsync(
        "ps aux | grep 'claude' | grep 'Z' | awk '{print $2}'"
      );

      const zombiePids = stdout
        .split('\n')
        .filter(Boolean)
        .map((pid: string) => parseInt(pid.trim()));

      if (zombiePids.length > 0) {
        console.warn(`⚠️  Found ${zombiePids.length} zombie processes:`, zombiePids);

        // 알림 전송
        await this.notifyAdmins({
          type: 'zombie_processes',
          count: zombiePids.length,
          pids: zombiePids,
        });

        // 자동 정리 시도 (부모 프로세스 재시작)
        await this.attemptZombieCleanup(zombiePids);
      }
    } catch (error) {
      console.error('Error checking zombie processes:', error);
    }
  }

  /**
   * Zombie 정리 시도
   */
  private async attemptZombieCleanup(zombiePids: number[]): Promise<void> {
    for (const pid of zombiePids) {
      try {
        // 부모 PID 찾기
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync(`ps -o ppid= -p ${pid}`);
        const parentPid = parseInt(stdout.trim());

        console.log(`Zombie ${pid} has parent ${parentPid}`);

        // 부모가 현재 프로세스인 경우
        if (parentPid === process.pid) {
          console.log(`Attempting to wait for zombie ${pid}`);

          // waitpid() 호출 (Node.js는 자동으로 수행하지만, 명시적 호출 가능)
          // Note: Node.js에서는 이미 종료된 프로세스에 대해 자동으로 waitpid 호출됨
          // 추가 조치 불필요
        }
      } catch (error) {
        console.error(`Failed to clean zombie ${pid}:`, error);
      }
    }
  }
}
```

#### 3. 부모 프로세스 종료 시 자식 프로세스 정리

Agent Manager가 종료될 때 모든 자식 프로세스를 정리합니다.

```typescript
export class ProcessManager {
  /**
   * 시스템 종료 시 모든 프로세스 정리
   */
  async shutdownAll(): Promise<void> {
    console.log('🛑 Shutting down all agent processes...');

    const killPromises = Array.from(this.processes.keys()).map((taskId) =>
      this.killProcess(taskId, 'SIGTERM')
    );

    await Promise.all(killPromises);

    console.log('✅ All agent processes terminated');
  }
}

// 서버 시작 시 종료 핸들러 등록
const processManager = new ProcessManager();

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await processManager.shutdownAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT (Ctrl+C), shutting down gracefully...');
  await processManager.shutdownAll();
  process.exit(0);
});

process.on('exit', () => {
  console.log('Process exiting, ensuring all children are terminated');
  // Note: exit 이벤트에서는 비동기 작업 불가, 동기 정리만 가능
});
```

#### 4. Process Group을 이용한 일괄 종료

프로세스 그룹을 사용하면 부모와 모든 자식 프로세스를 한 번에 종료할 수 있습니다.

```typescript
export class ProcessManager {
  spawnAgent(taskId: string, args: string[]): ChildProcess {
    const agentProcess = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true, // 새 프로세스 그룹 생성
    });

    // 프로세스 그룹 ID 저장
    const pgid = agentProcess.pid;

    this.processes.set(taskId, agentProcess);
    this.processGroups.set(taskId, pgid!);

    return agentProcess;
  }

  /**
   * 프로세스 그룹 전체 종료
   */
  async killProcessGroup(taskId: string): Promise<void> {
    const pgid = this.processGroups.get(taskId);
    if (!pgid) return;

    try {
      // 음수 PID는 프로세스 그룹 전체에 신호 전송
      process.kill(-pgid, 'SIGTERM');

      console.log(`✅ Killed process group ${pgid}`);
    } catch (error) {
      console.error(`Failed to kill process group ${pgid}:`, error);
    } finally {
      this.processGroups.delete(taskId);
    }
  }
}
```

#### 5. 자동 정리 타임아웃

프로세스가 종료되지 않으면 일정 시간 후 강제 종료합니다.

```typescript
export class ProcessManager {
  async killProcessWithTimeout(
    taskId: string,
    gracefulTimeoutMs: number = 5000
  ): Promise<void> {
    const process = this.processes.get(taskId);
    if (!process) return;

    console.log(`Sending SIGTERM to ${taskId}...`);
    process.kill('SIGTERM');

    // Graceful shutdown 대기
    const gracefulShutdown = new Promise<void>((resolve) => {
      process.once('exit', () => {
        console.log(`✅ ${taskId} exited gracefully`);
        resolve();
      });
    });

    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn(`⚠️  ${taskId} did not exit after ${gracefulTimeoutMs}ms`);
        resolve();
      }, gracefulTimeoutMs);
    });

    await Promise.race([gracefulShutdown, timeout]);

    // 여전히 살아있으면 SIGKILL
    if (!process.killed) {
      console.warn(`💀 Sending SIGKILL to ${taskId}`);
      process.kill('SIGKILL');

      // SIGKILL 후 대기
      await new Promise<void>((resolve) => {
        process.once('exit', () => {
          console.log(`✅ ${taskId} killed forcefully`);
          resolve();
        });

        // SIGKILL 후에도 종료되지 않으면 (드물지만 발생 가능)
        setTimeout(() => {
          console.error(`❌ ${taskId} could not be killed`);
          resolve();
        }, 2000);
      });
    }

    this.cleanupProcess(taskId);
  }
}
```

### 모니터링 및 알림

```typescript
// 프로세스 상태 모니터링 API
export async function GET() {
  const processManager = getProcessManager();

  const activeProcesses = Array.from(processManager.getProcesses().entries()).map(
    ([taskId, proc]) => ({
      taskId,
      pid: proc.pid,
      killed: proc.killed,
      exitCode: proc.exitCode,
      signalCode: proc.signalCode,
    })
  );

  // Zombie 프로세스 수 확인
  const zombieCount = await countZombieProcesses();

  return Response.json({
    activeProcesses,
    zombieCount,
    totalProcesses: activeProcesses.length,
  });
}

async function countZombieProcesses(): Promise<number> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(
      "ps aux | grep 'claude' | grep 'Z' | wc -l"
    );

    return parseInt(stdout.trim());
  } catch {
    return 0;
  }
}
```

### 테스트

```typescript
// __tests__/zombie-prevention.test.ts

describe('Zombie Process Prevention', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    await processManager.shutdownAll();
  });

  test('should cleanup process on exit', async () => {
    const taskId = 'test-task';
    const proc = processManager.spawnAgent(taskId, ['--help']);

    await new Promise((resolve) => proc.once('exit', resolve));

    // 프로세스가 Map에서 제거되었는지 확인
    expect(processManager.getProcesses().has(taskId)).toBe(false);
  });

  test('should kill process gracefully', async () => {
    const taskId = 'test-task';
    const proc = processManager.spawnAgent(taskId, ['--version']);

    await processManager.killProcess(taskId, 'SIGTERM');

    expect(proc.killed).toBe(true);
  });

  test('should force kill if graceful shutdown fails', async () => {
    const taskId = 'test-task';

    // 긴 실행 프로세스 생성
    const proc = processManager.spawnAgent(taskId, ['run', 'infinite-loop']);

    await processManager.killProcessWithTimeout(taskId, 1000);

    expect(proc.killed).toBe(true);
  }, 10000);
});
```

## 성능 최적화: High-Frequency Log Buffering

### 문제 상황

Agent는 매우 빠르게 로그를 출력할 수 있습니다 (초당 100줄 이상). 각 로그마다 개별 SSE 이벤트를 전송하면 다음 문제가 발생합니다:

1. **SSE 연결 과부하**: 클라이언트가 초당 수백 개의 작은 이벤트 처리
2. **네트워크 대역폭 낭비**: 각 이벤트마다 HTTP 헤더 오버헤드
3. **브라우저 렌더링 지연**: DOM 업데이트가 너무 빈번해 UI 멈춤
4. **서버 리소스 소모**: 각 이벤트마다 JSON 직렬화 및 네트워크 I/O

**예시 시나리오**:
```bash
npm install  # 1000+ 줄 출력
webpack build  # 500+ 줄 컴파일 로그
pytest --verbose  # 100+ 테스트 결과
```

### 해결 방안: Adaptive Buffering

로그 출력 속도에 따라 동적으로 버퍼 크기를 조절하는 적응형 버퍼링 전략을 사용합니다.

### Buffering Strategies

#### 1. Time-based Batching (시간 기반 배치)

일정 시간 동안 로그를 수집한 후 한 번에 전송합니다.

```typescript
// packages/agent-manager/src/buffering/TimeBasedLogBuffer.ts

/**
 * 시간 기반 로그 버퍼
 */
export class TimeBasedLogBuffer {
  private buffer: LogEntry[] = [];
  private flushInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private onFlush: (logs: LogEntry[]) => void;

  constructor(
    flushIntervalMs: number,
    onFlush: (logs: LogEntry[]) => void
  ) {
    this.flushInterval = flushIntervalMs;
    this.onFlush = onFlush;
    this.startTimer();
  }

  /**
   * 로그 추가
   */
  addLog(log: LogEntry): void {
    this.buffer.push(log);
  }

  /**
   * 버퍼 flush
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0);
    this.onFlush(logs);
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // 남은 로그 전송
  }
}
```

**사용 예시**:
```typescript
const buffer = new TimeBasedLogBuffer(100, (logs) => {
  // 100ms마다 한 번에 전송
  broadcaster.broadcast(taskId, {
    type: 'log_batch',
    data: { logs },
  });
});

agentProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    buffer.addLog({ timestamp: new Date(), message: line });
  }
});
```

#### 2. Size-based Batching (크기 기반 배치)

일정 개수의 로그가 쌓이면 전송합니다.

```typescript
// packages/agent-manager/src/buffering/SizeBasedLogBuffer.ts

/**
 * 크기 기반 로그 버퍼
 */
export class SizeBasedLogBuffer {
  private buffer: LogEntry[] = [];
  private batchSize: number;
  private onFlush: (logs: LogEntry[]) => void;

  constructor(
    batchSize: number,
    onFlush: (logs: LogEntry[]) => void
  ) {
    this.batchSize = batchSize;
    this.onFlush = onFlush;
  }

  /**
   * 로그 추가 (자동 flush)
   */
  addLog(log: LogEntry): void {
    this.buffer.push(log);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * 버퍼 flush
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0);
    this.onFlush(logs);
  }

  /**
   * 정리
   */
  dispose(): void {
    this.flush();
  }
}
```

#### 3. Adaptive Batching (적응형 배치)

로그 출력 속도를 감지하여 동적으로 버퍼 크기와 flush 간격을 조정합니다.

```typescript
// packages/agent-manager/src/buffering/AdaptiveLogBuffer.ts

/**
 * 적응형 로그 버퍼
 *
 * 로그 출력 속도에 따라 동적으로 배치 크기와 flush 간격 조정
 */
export class AdaptiveLogBuffer {
  private buffer: LogEntry[] = [];
  private onFlush: (logs: LogEntry[]) => void;

  // 버퍼 설정 (동적 조정)
  private currentBatchSize: number;
  private currentFlushInterval: number;

  // 설정 범위
  private readonly MIN_BATCH_SIZE = 10;
  private readonly MAX_BATCH_SIZE = 100;
  private readonly MIN_FLUSH_INTERVAL = 50; // ms
  private readonly MAX_FLUSH_INTERVAL = 500; // ms

  // 로그 속도 추적
  private logRateWindow: number[] = []; // 최근 로그 속도 (logs/sec)
  private lastLogTime = Date.now();
  private logCountInWindow = 0;
  private rateCalculationInterval = 1000; // 1초마다 속도 계산

  // 타이머
  private flushTimer: NodeJS.Timeout | null = null;
  private rateTimer: NodeJS.Timeout | null = null;

  constructor(onFlush: (logs: LogEntry[]) => void) {
    this.onFlush = onFlush;
    this.currentBatchSize = this.MIN_BATCH_SIZE;
    this.currentFlushInterval = this.MAX_FLUSH_INTERVAL;

    this.startFlushTimer();
    this.startRateCalculation();
  }

  /**
   * 로그 추가
   */
  async addLog(log: LogEntry): Promise<void> {
    this.buffer.push(log);
    this.logCountInWindow++;

    // 버퍼 크기 도달 시 즉시 flush
    if (this.buffer.length >= this.currentBatchSize) {
      await this.flush();
    }
  }

  /**
   * 버퍼 flush
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0);

    try {
      this.onFlush(logs);
    } catch (error) {
      console.error('❌ Failed to flush logs:', error);
    }
  }

  /**
   * 로그 속도 감지 및 버퍼 조정
   */
  private adjustBatchingStrategy(): void {
    const now = Date.now();
    const elapsed = now - this.lastLogTime;

    if (elapsed >= this.rateCalculationInterval) {
      // 현재 로그 속도 계산 (logs/sec)
      const logsPerSecond = (this.logCountInWindow / elapsed) * 1000;

      // 속도 히스토리 저장 (최근 10개)
      this.logRateWindow.push(logsPerSecond);
      if (this.logRateWindow.length > 10) {
        this.logRateWindow.shift();
      }

      // 평균 로그 속도
      const avgRate =
        this.logRateWindow.reduce((a, b) => a + b, 0) / this.logRateWindow.length;

      console.log(`📊 Log rate: ${logsPerSecond.toFixed(1)} logs/sec (avg: ${avgRate.toFixed(1)})`);

      // 속도에 따라 버퍼 조정
      if (avgRate > 100) {
        // 매우 높은 속도: 큰 배치, 짧은 간격
        this.currentBatchSize = this.MAX_BATCH_SIZE;
        this.currentFlushInterval = this.MIN_FLUSH_INTERVAL;
      } else if (avgRate > 50) {
        // 높은 속도: 중간 배치, 중간 간격
        this.currentBatchSize = Math.floor((this.MIN_BATCH_SIZE + this.MAX_BATCH_SIZE) / 2);
        this.currentFlushInterval = Math.floor(
          (this.MIN_FLUSH_INTERVAL + this.MAX_FLUSH_INTERVAL) / 2
        );
      } else if (avgRate > 10) {
        // 보통 속도: 작은 배치, 긴 간격
        this.currentBatchSize = this.MIN_BATCH_SIZE + 10;
        this.currentFlushInterval = this.MAX_FLUSH_INTERVAL - 100;
      } else {
        // 낮은 속도: 최소 배치, 최대 간격
        this.currentBatchSize = this.MIN_BATCH_SIZE;
        this.currentFlushInterval = this.MAX_FLUSH_INTERVAL;
      }

      console.log(
        `⚙️  Adjusted buffering: batchSize=${this.currentBatchSize}, flushInterval=${this.currentFlushInterval}ms`
      );

      // Flush timer 재시작
      this.restartFlushTimer();

      // 카운터 리셋
      this.lastLogTime = now;
      this.logCountInWindow = 0;
    }
  }

  /**
   * Flush timer 시작
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.currentFlushInterval);
  }

  /**
   * Flush timer 재시작
   */
  private restartFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
  }

  /**
   * 속도 계산 timer 시작
   */
  private startRateCalculation(): void {
    this.rateTimer = setInterval(() => {
      this.adjustBatchingStrategy();
    }, this.rateCalculationInterval);
  }

  /**
   * 정리
   */
  async dispose(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.rateTimer) {
      clearInterval(this.rateTimer);
      this.rateTimer = null;
    }

    await this.flush();
  }

  /**
   * 버퍼 통계
   */
  getStats() {
    return {
      bufferSize: this.buffer.length,
      currentBatchSize: this.currentBatchSize,
      currentFlushInterval: this.currentFlushInterval,
      avgLogRate:
        this.logRateWindow.reduce((a, b) => a + b, 0) / this.logRateWindow.length || 0,
    };
  }
}
```

**사용 예시**:
```typescript
// Agent Manager에서 사용
const buffer = new AdaptiveLogBuffer((logs) => {
  broadcaster.broadcast(taskId, {
    type: 'log_batch',
    sequence: sequencer.getNextSequence(taskId),
    data: { logs },
  });
});

agentProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(Boolean);
  for (const line of lines) {
    buffer.addLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: line,
    });
  }
});
```

### Backpressure Handling (역압 처리)

버퍼가 가득 차면 Agent를 일시 중지하여 메모리 오버플로우를 방지합니다.

```typescript
/**
 * 역압 지원 로그 버퍼
 */
export class BackpressureLogBuffer extends AdaptiveLogBuffer {
  private readonly MAX_BUFFER_SIZE = 10000; // 최대 10,000 로그
  private readonly PAUSE_THRESHOLD = 8000; // 80% 도달 시 일시중지
  private readonly RESUME_THRESHOLD = 5000; // 50%로 감소 시 재개

  private isPaused = false;
  private agentProcess: ChildProcess | null = null;

  setAgentProcess(process: ChildProcess): void {
    this.agentProcess = process;
  }

  /**
   * 로그 추가 with backpressure
   */
  async addLog(log: LogEntry): Promise<void> {
    await super.addLog(log);

    // Backpressure 확인
    this.checkBackpressure();
  }

  /**
   * Backpressure 확인 및 Agent 제어
   */
  private checkBackpressure(): void {
    const bufferSize = this.buffer.length;

    // 버퍼 오버플로우 위험
    if (bufferSize >= this.MAX_BUFFER_SIZE) {
      console.error(`❌ Buffer overflow! Dropping oldest logs...`);
      this.buffer.splice(0, bufferSize - this.MAX_BUFFER_SIZE);
    }

    // 버퍼 80% 도달 → Agent 일시중지
    if (!this.isPaused && bufferSize >= this.PAUSE_THRESHOLD && this.agentProcess) {
      console.warn(`⏸️  Pausing agent due to buffer backpressure (${bufferSize} logs)`);
      this.pauseAgent();
    }

    // 버퍼 50%로 감소 → Agent 재개
    if (this.isPaused && bufferSize <= this.RESUME_THRESHOLD && this.agentProcess) {
      console.log(`▶️  Resuming agent (buffer reduced to ${bufferSize} logs)`);
      this.resumeAgent();
    }
  }

  /**
   * Agent 일시중지 (SIGSTOP)
   */
  private pauseAgent(): void {
    if (!this.agentProcess) return;

    try {
      this.agentProcess.kill('SIGTSTP'); // Terminal stop (pause)
      this.isPaused = true;
    } catch (error) {
      console.error('Failed to pause agent:', error);
    }
  }

  /**
   * Agent 재개 (SIGCONT)
   */
  private resumeAgent(): void {
    if (!this.agentProcess) return;

    try {
      this.agentProcess.kill('SIGCONT'); // Continue
      this.isPaused = false;
    } catch (error) {
      console.error('Failed to resume agent:', error);
    }
  }
}
```

### Priority Lanes (우선순위 레인)

중요한 이벤트는 즉시 전송하고, 일반 로그는 버퍼링합니다.

```typescript
/**
 * 우선순위 레인 로그 버퍼
 */
export class PriorityLaneLogBuffer extends AdaptiveLogBuffer {
  /**
   * 우선순위가 높은 이벤트는 즉시 전송
   */
  async addLog(log: LogEntry): Promise<void> {
    if (this.isCritical(log)) {
      // 즉시 전송 (버퍼 우회)
      this.onFlush([log]);
    } else if (this.isHigh(log)) {
      // 버퍼에 추가하고 즉시 flush
      this.buffer.push(log);
      await this.flush();
    } else {
      // 일반 버퍼링
      await super.addLog(log);
    }
  }

  /**
   * 크리티컬 이벤트 판별
   */
  private isCritical(log: LogEntry): boolean {
    return (
      log.level === 'error' ||
      log.message.includes('=== PHASE') ||
      log.message.includes('[USER_QUESTION]') ||
      log.message.includes('[ERROR]')
    );
  }

  /**
   * 높은 우선순위 이벤트 판별
   */
  private isHigh(log: LogEntry): boolean {
    return log.level === 'warn' || log.message.includes('[DEPENDENCY_REQUEST]');
  }
}
```

### 압축 (Compression)

대용량 로그 배치는 gzip으로 압축하여 전송합니다.

```typescript
import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);

/**
 * 압축 지원 로그 버퍼
 */
export class CompressedLogBuffer extends AdaptiveLogBuffer {
  private readonly COMPRESSION_THRESHOLD = 10 * 1024; // 10KB 이상이면 압축

  /**
   * 로그 배치 전송 (압축)
   */
  protected async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0);
    const payload = JSON.stringify({ logs });

    // 크기가 크면 압축
    if (payload.length > this.COMPRESSION_THRESHOLD) {
      const compressed = await gzipAsync(payload);

      console.log(
        `📦 Compressed ${logs.length} logs: ${payload.length}B → ${compressed.length}B (${((compressed.length / payload.length) * 100).toFixed(1)}%)`
      );

      this.onFlush({
        compressed: true,
        data: compressed.toString('base64'),
      });
    } else {
      // 작은 배치는 압축하지 않음
      this.onFlush({ compressed: false, logs });
    }
  }
}
```

### SSE Broadcast Rate Limiting

SSE 브로드캐스트 자체에도 속도 제한을 적용하여 클라이언트 과부하를 방지합니다.

```typescript
/**
 * 속도 제한 브로드캐스터
 */
export class RateLimitedBroadcaster extends StreamBroadcaster {
  private readonly MAX_EVENTS_PER_SECOND = 10;
  private eventCounts = new Map<string, number[]>(); // taskId → timestamps

  /**
   * 브로드캐스트 with rate limiting
   */
  broadcast(taskId: string, event: SSEEvent): void {
    // 속도 제한 확인
    if (!this.canBroadcast(taskId)) {
      console.warn(`⚠️  Rate limit exceeded for task ${taskId}, queuing event`);
      this.queueEvent(taskId, event);
      return;
    }

    // 즉시 브로드캐스트
    super.broadcast(taskId, event);

    // 속도 추적
    this.trackBroadcast(taskId);
  }

  /**
   * 브로드캐스트 가능 여부 확인
   */
  private canBroadcast(taskId: string): boolean {
    const now = Date.now();
    const timestamps = this.eventCounts.get(taskId) || [];

    // 최근 1초 이내의 이벤트만 카운트
    const recentEvents = timestamps.filter((ts) => now - ts < 1000);

    return recentEvents.length < this.MAX_EVENTS_PER_SECOND;
  }

  /**
   * 브로드캐스트 추적
   */
  private trackBroadcast(taskId: string): void {
    const now = Date.now();
    const timestamps = this.eventCounts.get(taskId) || [];

    timestamps.push(now);

    // 오래된 타임스탬프 제거
    const recent = timestamps.filter((ts) => now - ts < 1000);
    this.eventCounts.set(taskId, recent);
  }

  /**
   * 이벤트 큐에 추가 (나중에 전송)
   */
  private queueEvent(taskId: string, event: SSEEvent): void {
    // TODO: Redis 큐 또는 메모리 큐에 저장
    // 1초 후 재시도
  }
}
```

### 모니터링 및 메트릭

```typescript
/**
 * 로그 버퍼 모니터링
 */
export class LogBufferMetrics {
  private totalLogsBuffered = 0;
  private totalLogsFlushed = 0;
  private totalBytesBuffered = 0;
  private flushLatencies: number[] = [];

  /**
   * 버퍼 추가 추적
   */
  trackBuffered(log: LogEntry): void {
    this.totalLogsBuffered++;
    this.totalBytesBuffered += JSON.stringify(log).length;
  }

  /**
   * Flush 추적
   */
  trackFlushed(logs: LogEntry[], latency: number): void {
    this.totalLogsFlushed += logs.length;
    this.flushLatencies.push(latency);
  }

  /**
   * 메트릭 조회
   */
  getStats() {
    return {
      totalLogsBuffered: this.totalLogsBuffered,
      totalLogsFlushed: this.totalLogsFlushed,
      bufferingRate: this.totalLogsFlushed / this.totalLogsBuffered,
      avgBytesPerLog: this.totalBytesBuffered / this.totalLogsBuffered,
      avgFlushLatency:
        this.flushLatencies.reduce((a, b) => a + b, 0) / this.flushLatencies.length,
      p50FlushLatency: this.percentile(this.flushLatencies, 0.5),
      p95FlushLatency: this.percentile(this.flushLatencies, 0.95),
      p99FlushLatency: this.percentile(this.flushLatencies, 0.99),
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
}
```

### Example Scenarios

#### Scenario 1: npm install (1000+ 줄)

```typescript
// 매우 빠른 로그 출력
// 적응형 버퍼가 자동으로 큰 배치 크기로 조정

const buffer = new AdaptiveLogBuffer((logs) => {
  console.log(`Flushed ${logs.length} logs`);
});

// 시뮬레이션: 1초에 1000줄
for (let i = 0; i < 1000; i++) {
  buffer.addLog({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Installing package ${i}...`,
  });
}

// 결과:
// - 초기: batchSize=10, flushInterval=500ms
// - 속도 감지 후: batchSize=100, flushInterval=50ms
// - 총 10회 flush (100줄씩)
```

#### Scenario 2: webpack build (빠른 컴파일 로그)

```typescript
// 중간 속도 로그 출력
// Priority lane으로 에러는 즉시 전송

const buffer = new PriorityLaneLogBuffer((logs) => {
  broadcaster.broadcast(taskId, { type: 'log_batch', data: { logs } });
});

// 일반 로그: 버퍼링
buffer.addLog({ level: 'info', message: 'Compiling module...' });

// 에러 로그: 즉시 전송
buffer.addLog({ level: 'error', message: 'Compilation failed!' });
```

#### Scenario 3: 메모리 제한

```typescript
// 버퍼 크기 제한: 10MB
// 초과 시 Agent 일시중지

const buffer = new BackpressureLogBuffer((logs) => {
  // SSE 전송
});

buffer.setAgentProcess(agentProcess);

// 버퍼가 8000개 도달 → Agent SIGTSTP
// 버퍼가 5000개로 감소 → Agent SIGCONT
```

---

## 참조 문서

- **기능 명세**: `FEATURES.md`
- **API 문서**: `API.md`
- **워크플로우 상세**: `WORKFLOWS.md`
- **개발 가이드**: `DEVELOPMENT.md`
- **Web Server 가이드**: `/packages/claude-code-server/CLAUDE.md`
- **Agent Manager 가이드**: `/packages/agent-manager/CLAUDE.md`
- **Sub-Agent 가이드**: `/packages/sub-agent/CLAUDE.md`
