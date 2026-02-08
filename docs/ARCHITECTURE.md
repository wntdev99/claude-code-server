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

#### 4. 추가 보안 계층 (Optional)

**Option A: Chroot Jail** (Linux only)
```bash
# Agent 프로세스를 chroot 환경에서 실행
sudo chroot /projects/task_123 claude chat
```

**Option B: Docker 컨테이너**
```bash
# Agent를 컨테이너 내에서 실행
docker run --rm -v /projects/task_123:/workspace -w /workspace claude-agent
```

**Option C: 파일 시스템 감시**
```typescript
// 실시간으로 파일 쓰기 감시
import { watch } from 'chokidar';

const watcher = watch(workspaceRoot, {
  ignored: /(^|[\/\\])\../,  // 숨김 파일 무시
});

watcher.on('add', (filePath) => {
  if (!validatePath(filePath, workspaceRoot)) {
    console.error(`⛔ Unauthorized file creation: ${filePath}`);
    fs.unlink(filePath);  // 즉시 삭제
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

## 참조 문서

- **기능 명세**: `FEATURES.md`
- **API 문서**: `API.md`
- **워크플로우 상세**: `WORKFLOWS.md`
- **개발 가이드**: `DEVELOPMENT.md`
- **Web Server 가이드**: `/packages/claude-code-server/CLAUDE.md`
- **Agent Manager 가이드**: `/packages/agent-manager/CLAUDE.md`
- **Sub-Agent 가이드**: `/packages/sub-agent/CLAUDE.md`
