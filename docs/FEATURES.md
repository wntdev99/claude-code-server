● 🚀 Claude Code Server - 새 프로젝트 필수 
  핵심 기능 정리                             
                                             
  ---                                        
  📌 1. 핵심 가치 제안 (Core Value           
  Proposition)                               
                                             
  "Claude Code CLI를 웹 기반 에이전트 관리   
  플랫폼으로 전환"                           
                                             
  사용자가 웹 브라우저에서 작업을 등록하면
  → 플랫폼이 Claude Code 에이전트를 실행하고
  → 진행 상황을 추적하며
  → 필요시 사용자와 상호작용하여
  → 완성된 프로젝트를 생성

  ---
  🎯 2. 필수 핵심 기능 (Must-Have Features)

  A. 작업 관리 (Task Management)

  A1. 작업 타입 (4가지)

  타입: create_app
  용도: 앱/웹 프로젝트 생성
  워크플로우: 기획 → 설계 → 개발 -> 테스트 (4 Phase-A)
  ────────────────────────────────────────

  타입: modify_app
  용도: 생성된 앱/웹 수정
  워크플로우: 분석 → 계획 → 구현 → 테스트 (4 Phase-B)
  ────────────────────────────────────────
  
  타입: workflow
  용도: 워크플로우 자동화
  워크플로우: 기획 → 설계 → 개발 -> 테스트 (4 Phase-C)
  ────────────────────────────────────────
  
  타입: custom
  용도: 자유 형식 대화
  워크플로우: 프롬프트 기반 자율 실행 및 응답
  ────────────────────────────────────────
  

  A2. 작업 생명주기 관리

  // 필수 상태
  type TaskStatus =
    | 'draft'          // 초안 (폼 작성 중)
    | 'pending'        // 실행 대기
    | 'in_progress'    // 실행 중
    | 'review'         // 리뷰 대기
    | 'completed'      // 완료
    | 'failed'         // 실패

  // 필수 기능
  - 작업 생성 (에이전트 관리자가 서브 에이전트에게 지침에 따라 작업을 생성하도록 지시)
  - 작업 실행 (에이전트 관리자가 서브 에이전트에게 생성된 작업을 실행하도록 지시)
  - 작업 일시 중지 / 재개 (에이전트 관리자는 서브 에이전트에게 작업을 일시 중지시키거나 재개시킬 수 있음)
  - 작업 취소 / 삭제 (에이전트 관리자는 서브 에이전트에게 작업취소 시키고 삭제 시킬 수 있어야함)

  ---
  B. Phase 기반 워크플로우 (create_app 핵심)

  B1. 4-Phase-A 구조

  Phase 1: 기획 (Planning) - 9단계
  01. 아이디어 정의
  02. 시장 분석
  03. 페르소나 정의
  04. 사용자 여정
  05. 비즈니스 모델
  06. 제품 정의
  07. 기능 명세
  08. 기술 검토
  09. 로드맵
  → 결과물: docs/planning/*.md (9개 문서)

  Phase 2: 설계 (Design) - 5단계
  01. 화면 설계
  02. 데이터 모델
  03. 작업 흐름
  04. API 설계
  05. 아키텍처
  → 결과물: docs/design/*.md (5개 문서)

  Phase 3: 개발 (Development) - 6단계
  01. 프로젝트 초기화
  02. 데이터 계층
  03. 비즈니스 로직
  04. UI 구현
  05. 테스트
  06. 배포 준비
  → 결과물: 실제 코드 프로젝트

  B2. Phase 진행 관리

  필수 기능:
  - Phase/Step 자동 감지 (에이전트 출력 파싱)
  - 진행률 실시간 계산
  - Phase 완료 검증 (파일 존재 확인)
  - Phase 간 의존성 체크

  ---
  C. 리뷰 게이트 시스템 (Review Gate)

  C1. Phase 완료 후 승인 프로세스

  Phase 완료
    ↓
  자동 리뷰 생성 (산출물 수집)
    ↓
  사용자 리뷰 (웹 UI)
    ├─ 승인 → 다음 Phase 자동 시작
    └─ 수정 요청 → 재작업 후 재리뷰

  C2. 리뷰 상태 관리

  type ReviewStatus =
    | 'pending'           // 리뷰 대기
    | 'in_review'         // 리뷰 중
    | 'approved'          // 승인됨
    | 'changes_requested' // 수정 요청

  // 필수 기능
  - 리뷰 문서 자동 수집
  - 파일별 피드백 (코멘트, 수정 요청)
  - 피드백 상태 추적 (open/resolved)
  - 승인 후 자동 Phase 전환

  ---
  D. 플랫폼-에이전트 통신 프로토콜

  D1. 의존성 요청/제공 (Dependency)

  프로토콜:
  [DEPENDENCY_REQUEST]
  type: api_key | env_variable | service |
  file | permission | package
  name: OPENAI_API_KEY
  description: OpenAI API 호출에 필요
  required: true
  [/DEPENDENCY_REQUEST]

  동작:
  1. 에이전트가 필요한 의존성 출력
  2. 플랫폼이 감지하여 작업 일시 중지
  3. 사용자에게 UI로 입력 요청
  4. 사용자가 제공 → 환경변수 저장
  5. 작업 자동 재개 (환경변수 주입)

  자동 감지 패턴 (간편 사용):
  "OPENAI_API_KEY 환경 변수가 필요합니다"
  "Need API key for FIGMA_ACCESS_TOKEN"

  D2. 사용자 질문 요청/응답

  프로토콜:
  [USER_QUESTION]
  category: business | clarification | choice
   | confirmation
  question: 수익 모델을 어떻게 가져갈
  계획인가요?
  options:
    - 유료 구독
    - 프리미엄
    - 광고 기반
  default: 프리미엄
  required: false
  [/USER_QUESTION]

  필수 기능:
  - 질문 큐 관리
  - 답변 대기 중 작업 중단
  - 답변 제공 후 자동 재개
  - 답변 히스토리 저장

  D3. Phase 완료 신호

  === PHASE 1 COMPLETE ===
  완료: Phase 1 (기획)
  생성된 문서:
  - docs/planning/01_idea.md
  - docs/planning/02_market.md
  ...

  D4. 에러 프로토콜

  [ERROR]
  type: missing_file | execution_failed |
  validation_error
  message: 에러 설명
  details: 상세 정보
  [/ERROR]

  ---
  E. 실시간 로그 스트리밍 (SSE)

  E1. 필수 기능

  // SSE 이벤트 타입
  type EventType =
    | 'log'                 // 일반 로그
    | 'phase_update'        // Phase 상태
  변경
    | 'step_update'         // Step 상태 변
    | 'dependency_request'  // 의존성 요청
    | 'user_question'       // 사용자 질문
    | 'review_required'     // 리뷰 필요
    | 'complete'            // 작업 완료
    | 'error'               // 에러 발생

  E2. 로그 관리

  현재 문제점: 메모리에만 저장 (휘발성)

  새 프로젝트 요구사항:
  - 로그 파일 영속화 (logs/{taskId}.jsonl)
  - 재연결 시 이전 로그 복구
  - 로그 압축 및 보관 정책

  ---
  F. 에이전트 상태 추적

  F1. 필수 상태

  type AgentStatus =
    | 'idle'                 // 대기
    | 'running'              // 실행 중
    | 'waiting_review'       // 리뷰 대기
    | 'waiting_dependency'   // 의존성 대기
    | 'waiting_question'     // 질문 대기
    | 'verifying'            // 검증 중
    | 'paused'               // 일시 중지
    | 'completed'            // 완료
    | 'failed'               // 실패
    | 'error'                // 에러

  F2. 추적 정보

  interface AgentStatus {
    taskId: string;
    status: AgentStatus;
    currentAction?: string;        // 현재
  작업
    currentPhase?: string;         // 현재
  Phase
    currentStep?: string;          // 현재
  Step
    progress: number;              // 0-100
    blockedBy?: BlockReason;       // 차단
  사유
    blockedReason?: string;        // 차단
  상세
    currentDocument?: string;      // 작성
   문서
    stepProgress?: {               // Step
  진행률
      current: number;
      total: number;
      completedSteps: string[];
    };
    recentActions?: RecentAction[]; // 최근
  작업 (최대 5개)
    tokensUsed?: number;            // 사용
  토큰
    lastUpdate: string;
  }

  ---
  G. 검증 시스템 (Verification)

  G1. Phase 완료 후 자동 검증

  프로세스:
  Phase 완료
    ↓
  별도 Claude Code 검증 에이전트 실행
    ↓
  검증 리포트 생성 (합격/불합격 항목별)
    ↓
  [합격] → Review 게이트로 진행
  [불합격] → 재작업 에이전트 자동 실행 (최대
  3회)

  G2. 검증 기준

  Phase 1 (기획) - 완전성, 일관성, 품질 검증
  - 9개 문서 모두 존재하는가?
  - 각 문서가 500자 이상인가?
  - 섹션이 누락되지 않았는가?
  - 플레이스홀더가 남아있지 않은가?
  - 문서 간 정보가 일치하는가?

  Phase 2 (설계) - 실현 가능성, 명확성 검증
  - 5개 문서 모두 존재하는가?
  - 화면 설계가 구체적인가?
  - 데이터 모델이 정의되었는가?
  - API 스펙이 완전한가?
  - 아키텍처가 명확한가?

  Phase 3 (개발) - 기능성, 보안 검증
  - 프로젝트 구조가 올바른가?
  - 필수 코드 파일이 존재하는가?
  - 테스트가 작성되었는가?
  - .env가 .gitignore에 있는가?
  - 하드코딩된 비밀번호가 없는가?

  G3. 재작업 메커니즘

  interface ReworkAttempt {
    attemptNumber: number;          // 시도
  번호 (1-3)
    failedCriteria: string[];       // 실패
   검증 항목
    reworkPrompt: string;           // 재작
   프롬프트
    startedAt: string;
    completedAt?: string;
    result: 'success' | 'partial' | 'failed';
  }

  ---
  H. 사용량 추적 (Usage Tracking)

  H1. 토큰 사용량 실시간 추적

  interface UsageData {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;  //
  Prompt caching
    cacheReadInputTokens: number;
  }

  interface UsageMetrics {
    currentSession: UsageData & { totalCost:
  number; taskCount: number };
    rateLimit: { isLimited: boolean; resetAt:
   string | null; };
    windowUsage: UsageData & { totalCost:
  number; }; // 슬라이딩 윈도우
    lifetime: UsageData & { totalCost:
  number; totalTasks: number; };
  }

  H2. Rate Limit 감지 및 대응

  프로세스:
  Claude API Rate Limit 발생
    ↓
  자동 Checkpoint 저장 (대화 히스토리, 환경
  상태)
    ↓
  작업 일시 중지 (대기열 이동)
    ↓
  Rate Limit 해제 시 자동 재개

  ---
  I. Checkpoint 시스템 (세션 저장/복구)

  I1. 저장 항목

  interface TaskCheckpoint {
    taskId: string;
    checkpointId: string;
    createdAt: string;
    reason: 'auto' | 'rate_limit' | 'manual'
  | 'error';
    executionState: {
      conversationHistory:
  ConversationEntry[];  // 대화 전체
      lastMessageId: string | null;
      toolsUsed: string[];
      currentPhase: string | null;
      currentStep: string | null;
      progress: number;
    };
    resumeContext: {
      lastOutput: string;
      pendingActions: string[];
      environmentState: Record<string,
  unknown>;  // 환경변수 등
    };
    rateLimitInfo?: {
      resetAt: string;
      message: string;
    };
  }

  I2. 복구 기능

  - Checkpoint에서 대화 복원
  - 환경 상태 복원 (환경변수, 작업 디렉토리)
  - 진행 상황 복원 (Phase, Step)

  ---
  J. 가이드 시스템 (36개 문서)

  J1. Phase별 가이드

  guide/
  ├── planning/       (9개) - Phase 1 단계별
  작성 가이드
  ├── design/         (5개) - Phase 2 단계별
  작성 가이드
  ├── development/    (6개) - Phase 3 단계별
  구현 가이드
  ├── review/         (1개) - 리뷰 프로세스
  가이드
  ├── verification/   (3개) - Phase별 검증
  기준
  ├── figma/          (4개) - Figma 통합
  가이드
  ├── integrations/   (4개) - 외부 서비스
  통합
  └── 공통 가이드     (4개) - QUICK_START,
  AUTONOMOUS_EXECUTION 등

  J2. 가이드 활용

  - 에이전트 프롬프트에 자동 주입
  - Phase/Step에 맞는 가이드 참조
  - 사용자가 웹에서 가이드 열람 가능

  ---
  K. 외부 서비스 통합

  K1. Figma 통합

  기능:
  - Figma 파일 연결 (Access Token 기반)
  - 기획 단계: 컨셉 아트, 무드보드 생성
  - 설계 단계: 와이어프레임, 프로토타입 생성
  - Dev Mode: 개발자 핸드오프

  API:
  POST /api/tasks/{taskId}/figma
    → Figma 파일 연결

  GET /api/tasks/{taskId}/figma/files
    → 연결된 Figma 파일 목록

  K2. Supabase 통합

  기능:
  - 프로젝트 연결
  - 데이터베이스 스키마 자동 생성
  - 인증 설정

  K3. GitHub 통합

  기능:
  - 저장소 생성
  - 코드 푸시
  - PR 생성 (리뷰용)

  ---
  L. 설정 관리 (Settings)

  L1. 필수 설정 항목

  interface Settings {
    // Claude Code CLI 설정 (CLI 인증은 `claude login`으로 별도 수행)
    claude_model?: string;           // sonnet-4-5 등
    claude_max_tokens?: number;
    claude_auto_accept?: boolean;    // Tool 자동 승인

    // 저장소 설정
    output_directory: string;        // 프로젝트 출력 경로

    // 외부 통합
    supabase_url?: string;
    supabase_anon_key?: string;
    github_token?: string;

    // Workflow용 (MCP 서버)
    notion_token?: string;
    slack_bot_token?: string;
    slack_default_channel?: string;
  }

  L2. 환경변수 관리

  // .env 파일 읽기/쓰기
  saveEnvVariable(key: string, value: string)
  readEnvFile(): Record<string, string>
  deleteEnvVariable(key: string)

  // 에이전트 실행 시 자동 주입

  ---
  M. 알림 시스템 (Notification)

  M1. 알림 카테고리

  type NotificationCategory =
    | 'general'              // 일반
    | 'setting_required'     // 설정 필요
    | 'phase_review'         // Phase 리뷰
  요청
    | 'review_approved'      // 리뷰 승인됨
    | 'changes_requested'    // 수정 요청
    | 'dependency_required'  // 의존성 필요
    | 'question_required'    // 질문 응답
  필요
    | 'task_completed'       // 작업 완료
    | 'error_detected'       // 에러 발생

  M2. 알림 기능

  - 실시간 알림 (SSE 또는 WebSocket)
  - 읽음/안읽음 상태 관리
  - 알림 클릭 시 관련 페이지 이동
  - 알림 자동 정리 (해결됨)

  ---
  N. 작업 대기열 (Task Queue)

  N1. 우선순위 관리

  type QueuePriority = 'critical' | 'high' |
  'normal' | 'low';

  interface QueuedTask {
    taskId: string;
    priority: QueuePriority;
    status: 'queued' | 'waiting_rate_limit' |
   'ready' | 'executing';
    queuedAt: string;
    estimatedStart: string | null;
    retryCount: number;
    maxRetries: number;
    dependsOn: string[];  // 의존하는 Task ID
  }

  N2. 대기열 관리

  - FIFO 또는 우선순위 기반 실행
  - Rate Limit 시 자동 대기
  - 의존성 기반 순서 제어
  - 재시도 로직 (최대 N회)

  ---
  O. 스케줄 작업 (Scheduled Tasks)

  O1. 스케줄 타입

  interface Schedule {
    type: 'hourly' | 'daily' | 'weekly' |
  'monthly' | 'cron';
    time?: string;          // "14:30"
    day?: string;           // "Monday"
    cronExpression?: string; // "0 0 * * *"
    timezone: string;        // "Asia/Seoul"
  }

  O2. 작업 액션

  type TaskAction =
    | 'backup'              // 백업 실행
    | 'dependency_check'    // 의존성
  업데이트 확인
    | 'security_scan'       // 보안 스캔
    | 'health_check'        // 헬스 체크
    | 'report'              // 리포트 생성
    | 'cleanup'             // 정리 작업
    | 'custom'              // 커스텀
  스크립트

  ---
  P. 워크플로우 시스템 (Workflow)

  P1. 워크플로우 구조

  interface Workflow {
    id: string;
    name: string;
    trigger: {
      type: 'schedule' | 'webhook' | 'manual'
   | 'event';
      config: Record<string, any>;
    };
    steps: WorkflowStep[];
    status: 'draft' | 'active' | 'paused' |
  'archived';
  }

  interface WorkflowStep {
    id: string;
    type: 'claude_code' | 'api_call' |
  'script' | 'condition';
    config: Record<string, any>;
    nextSteps: string[];  // 다음 Step ID들
  }

  P2. 실행 이력

  interface WorkflowExecution {
    id: string;
    workflowId: string;
    triggeredBy: 'schedule' | 'webhook' |
  'manual';
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' |
  'failed';
    steps: {
      stepId: string;
      status: 'pending' | 'running' |
  'completed' | 'failed';
      output?: any;
    }[];
  }

  ---
  🔧 3. 기술적 요구사항

  A. 데이터 저장소

  현재: JSON 파일 (문제 많음)

  새 프로젝트 권장:
  개발: SQLite (embedded)
  프로덕션: PostgreSQL

  테이블:
  - tasks
  - phases
  - steps
  - reviews
  - dependencies
  - questions
  - agent_statuses
  - verifications
  - checkpoints
  - notifications
  - usage_metrics
  - workflows
  - scheduled_tasks

  B. 상태 관리 아키텍처

  권장: 이벤트 소싱 (Event Sourcing)

  // 이벤트 기반 상태 변경
  type DomainEvent =
    | TaskCreated
    | TaskStarted
    | PhaseStarted
    | PhaseCompleted
    | ReviewCreated
    | ReviewApproved
    | DependencyRequested
    | DependencyProvided
    | QuestionAsked
    | QuestionAnswered
    | TaskCompleted
    | TaskFailed

  // 이벤트 저장
  events: Event[] {
    id: string;
    taskId: string;
    type: string;
    payload: any;
    timestamp: string;
    userId?: string;
  }

  // 상태 재구성
  function reconstructTaskState(taskId:
  string): Task {
    const events = getEvents(taskId);
    return events.reduce(applyEvent,
  initialState);
  }

  장점:
  - 감사 로그 자동 생성
  - 시간대별 상태 복원 가능
  - 디버깅 용이
  - 이벤트 리플레이로 버그 재현

  C. API 설계

  RESTful API + SSE

  // Tasks
  POST   /api/tasks                    # 작
   생성
  GET    /api/tasks                    # 작
   목록
  GET    /api/tasks/{id}               # 작
   조회
  PATCH  /api/tasks/{id}               # 작
   수정
  DELETE /api/tasks/{id}               # 작
   삭제

  POST   /api/tasks/{id}/execute       # 작
   실행
  POST   /api/tasks/{id}/pause         # 작
   일시 중지
  POST   /api/tasks/{id}/resume        # 작
   재개
  POST   /api/tasks/{id}/cancel        # 작
   취소

  GET    /api/tasks/{id}/stream        # 로
   스트림 (SSE)
  GET    /api/tasks/{id}/status        #
  에이전트 상태
  GET    /api/tasks/{id}/phases        #
  Phase 목록

  // Reviews
  GET    /api/tasks/{id}/reviews       # 리
   목록
  POST   /api/tasks/{id}/reviews       # 리
   생성
  PATCH  /api/reviews/{id}/approve     # 리
   승인
  PATCH  /api/reviews/{id}/request-changes #
  수정 요청
  POST   /api/reviews/{id}/feedback    #
  피드백 추가

  // Dependencies
  GET    /api/tasks/{id}/dependencies  #
  의존성 목록
  POST   /api/dependencies/{id}/provide #
  의존성 제공

  // Questions
  GET    /api/tasks/{id}/questions     # 질
   목록
  POST   /api/questions/{id}/answer    # 질
   답변

  // Verifications
  GET    /api/tasks/{id}/verifications # 검
   리포트

  // Settings
  GET    /api/settings                 # 설
   조회
  PATCH  /api/settings                 # 설
   수정

  // Workflows
  GET    /api/workflows                #
  워크플로우 목록
  POST   /api/workflows                #
  워크플로우 생성
  POST   /api/workflows/{id}/execute   #
  워크플로우 실행

  D. 보안 요구사항

  // 1. 경로 탐색 방지
  function validatePath(userPath: string,
  baseDir: string): boolean {
    const resolved = path.resolve(baseDir,
  userPath);
    return resolved.startsWith(baseDir);
  }

  // 2. 프롬프트 인젝션 방어
  function sanitizePrompt(input: string):
  string {
    // 명령어 패턴 필터링
    // 길이 제한
    // 제어 문자 제거
  }

  // 3. 환경변수 암호화
  function encryptSecret(value: string):
  string {
    // AES-256 암호화
    // Key는 환경변수 또는 KMS에서 관리
  }

  // 4. API Rate Limiting
  // 사용자당 요청 제한

  // 5. CORS 설정
  // 허용된 도메인만 접근

  ---
  📦 4. 필수 의존성 라이브러리

  {
    "dependencies": {
      // 프레임워크
      "next": "^14.0.0",
      "react": "^18.0.0",

      // 상태 관리
      "zustand": "^4.0.0",

      // UI
      "tailwindcss": "^3.0.0",
      "@radix-ui/react-*": "latest",  //
  shadcn/ui
      "lucide-react": "latest",

      // 데이터베이스 (선택)
      "prisma": "^5.0.0",              //
  PostgreSQL ORM
      "better-sqlite3": "^9.0.0",      //
  SQLite

      // 스케줄링
      "node-cron": "^3.0.0",

      // 보안
      "bcrypt": "^5.0.0",
      "jsonwebtoken": "^9.0.0",

      // 유틸리티
      "zod": "^3.0.0",                 //
  스키마 검증
      "date-fns": "^3.0.0"
    }
  }

  ---
  🏗️ 5. 프로젝트 구조 (권장)

  claude-task-platform-v2/
  ├── apps/
  │   ├── web/                    # Next.js
  웹 앱
  │   │   ├── app/                # App
  Router
  │   │   ├── components/         # UI
  컴포넌트
  │   │   ├── lib/                # 비즈니스
  로직
  │   │   └── public/
  │   └── api/                    # (선택)
  별도 API 서버
  │
  ├── packages/
  │   ├── core/                   # 핵심
  도메인 로직
  │   │   ├── entities/           # 엔티티
  (Task, Phase 등)
  │   │   ├── use-cases/          #
  유스케이스 (작업 생성, 실행 등)
  │   │   ├── repositories/       # 저장소
  인터페이스
  │   │   └── events/             # 도메인
  이벤트
  │   │
  │   ├── agent/                  # 에이전트
  실행 엔진
  │   │   ├── executor/           # Claude
  Code 실행
  │   │   ├── parser/             # 출력 파
  │   │   └── protocols/          # 프로토콜
  정의
  │   │
  │   ├── storage/                # 저장소
  구현
  │   │   ├── postgres/           #
  PostgreSQL
  │   │   ├── sqlite/             # SQLite
  │   │   └── json/               # JSON 파
   (개발용)
  │   │
  │   └── shared/                 # 공통
  유틸리티
  │       ├── types/              # 공통 타
  │       ├── utils/              # 유틸 함
  │       └── config/             # 설정
  │
  ├── guide/                      # 가이드
  문서 (36개)
  │   ├── planning/
  │   ├── design/
  │   ├── development/
  │   └── ...
  │
  ├── docs/                       # 개발 문
  │   ├── ARCHITECTURE.md
  │   ├── API.md
  │   └── DEPLOYMENT.md
  │
  ├── prisma/                     # DB 스키
   (Prisma 사용 시)
  │   └── schema.prisma
  │
  └── tests/
      ├── unit/
      ├── integration/
      └── e2e/

  ---
  ✅ 6. 우선순위별 구현 순서

  Phase 1: MVP (필수 기능)

  1. ✅ Task 생성/조회/삭제 (create_app만)
  2. ✅ Claude Code 실행 및 로그 스트리밍
  3. ✅ Phase 진행 감지 (3 Phase)
  4. ✅ 리뷰 게이트 (승인/거부)
  5. ✅ 의존성 요청/제공
  6. ✅ 에이전트 상태 추적
  7. ✅ 가이드 시스템 (36개 문서)

  Phase 2: 안정화

  8. ✅ 데이터베이스 (SQLite → PostgreSQL)
  9. ✅ 이벤트 소싱 아키텍처
  10. ✅ Checkpoint 시스템
  11. ✅ 검증 시스템 (자동 재작업)
  12. ✅ 사용량 추적 (토큰, 비용)
  13. ✅ 알림 시스템

  Phase 3: 확장

  14. ✅ 다른 작업 타입 (modify_project,
  custom)
  15. ✅ 스케줄 작업
  16. ✅ 워크플로우
  17. ✅ 외부 통합 (Figma, GitHub, Supabase)
  18. ✅ 사용자 질문 시스템
  19. ✅ 작업 대기열

  ---
  🎯 7. 핵심 차별화 요소

  기존 프로젝트의 강점 (반드시 유지):

  1. 체계적인 3-Phase 워크플로우
    - 기획 → 설계 → 개발 단계적 진행
    - 각 Phase별 명확한 산출물
  2. 36개 가이드 문서 시스템
    - 에이전트가 참조하는 상세한 가이드
    - 일관된 품질 보장
  3. 플랫폼-에이전트 통신 프로토콜
    - 의존성 요청/제공 자동화
    - 사용자 질문 자동 감지
  4. 리뷰 게이트 시스템
    - Phase별 사용자 승인
    - 품질 관리
  5. 검증 시스템
    - 자동 검증 + 재작업
    - 품질 보장

  ---
  📝 최종 체크리스트

  새 프로젝트에 반드시 포함되어야 할 것:

  - 5가지 작업 타입 (create_app 우선)
  - 3-Phase 워크플로우 (기획-설계-개발)
  - 36개 가이드 문서
  - 플랫폼-에이전트 통신 프로토콜 (의존성,
  질문, 완료 신호, 에러)
  - 리뷰 게이트 시스템
  - 검증 시스템 (자동 재작업)
  - 실시간 로그 스트리밍 (SSE)
  - 에이전트 상태 추적
  - Checkpoint 시스템
  - 사용량 추적 (토큰, 비용)
  - 알림 시스템
  - 환경변수 관리
  - 설정 시스템

  제거해도 되는 것:
  - 기존 JSON 파일 기반 저장소 (→ DB로 교체)
  - 분산된 상태 관리 (→ 이벤트 소싱으로 통합)
  - 메모리 기반 로그 (→ 영속화)

