# Glossary (용어집)

이 문서는 Claude Code Server 프로젝트에서 사용되는 주요 용어를 정의합니다.

---

## 아키텍처 (Architecture)

### Tier 1: Web Server (웹 서버)
- **정의**: Next.js 기반 웹 애플리케이션 계층
- **역할**: 사용자 인터페이스, REST API 제공, SSE 스트리밍
- **위치**: `packages/claude-code-server/`
- **통신**: HTTP/HTTPS, Server-Sent Events

### Tier 2: Agent Manager (에이전트 관리자)
- **정의**: 에이전트 생명주기를 관리하는 오케스트레이션 계층
- **역할**: Sub-Agent 생성/제어, 프로토콜 파싱, 상태 추적, Checkpoint 관리
- **위치**: `packages/agent-manager/`
- **통신**: Process IPC (stdin/stdout/stderr), signals

### Tier 3: Sub-Agent (서브 에이전트)
- **정의**: Claude Code CLI를 통해 실행되는 실제 작업 수행 에이전트
- **역할**: 가이드 문서 읽기, 산출물 생성, 프로토콜 통신
- **위치**: `packages/sub-agent/`
- **실행**: `child_process.spawn('claude', ['code', ...])`

---

## 작업 (Tasks)

### Task (작업)
- **정의**: 사용자가 요청한 하나의 완전한 작업 단위
- **예시**: "Todo 앱 만들기", "기존 앱에 로그인 추가"
- **속성**: id, title, type, status, description
- **생명주기**: draft → pending → in_progress → review → completed / failed

### Task Type (작업 타입)
프로젝트에서 지원하는 4가지 작업 유형:

#### 1. create_app (새 앱 생성)
- **워크플로우**: Phase 1 (기획 9단계) → Phase 2 (설계 5단계) → Phase 3 (개발 6단계) → Phase 4 (테스트)
- **산출물**: 기획 문서 9개 + 설계 문서 5개 + 실행 가능한 코드 프로젝트

#### 2. modify_app (기존 앱 수정)
- **워크플로우**: Phase 1 (분석) → Phase 2 (계획) → Phase 3 (구현) → Phase 4 (테스트)
- **산출물**: 분석 문서 + 수정 계획 + 변경된 코드

#### 3. workflow (워크플로우 자동화)
- **워크플로우**: Phase 1 (기획) → Phase 2 (설계) → Phase 3 (개발) → Phase 4 (테스트)
- **산출물**: 워크플로우 정의 + 자동화 스크립트

#### 4. custom (자유 형식)
- **워크플로우**: 사용자 정의 (Phase 구조 없음)
- **산출물**: 대화형 결과물

---

## 워크플로우 (Workflow)

### Phase (페이즈)
- **정의**: Task 실행의 주요 단계
- **용도**: 작업을 논리적 단계로 구분
- **예시**: Phase 1 (기획), Phase 2 (설계), Phase 3 (개발), Phase 4 (테스트)
- **전이**: Phase N 완료 → 검증 → 리뷰 → 승인 → Phase N+1

### Step (스텝)
- **정의**: Phase 내의 세부 작업 단계
- **예시**: Phase 1의 Step 1 (아이디어), Step 2 (시장 분석), ...
- **산출물**: 각 Step마다 하나의 문서 또는 코드 파일 생성

### Deliverable (산출물)
- **정의**: Phase 또는 Step 완료 시 생성되는 결과물
- **타입**:
  - 문서 (Markdown): Phase 1-2에서 주로 생성
  - 코드 (TypeScript, JavaScript, etc.): Phase 3에서 생성
- **위치**: Workspace 내 (`docs/planning/`, `docs/design/`, `src/`)

---

## 리뷰 시스템 (Review System)

### Review Gate (리뷰 게이트)
- **정의**: Phase 완료 후 다음 Phase 진행 전 품질 확인 지점
- **프로세스**: 10단계 (검증 → 리뷰 → 승인/거부)
- **참조**: `/docs/WORKFLOWS.md` (lines 211-220)

### Verification (검증)
- **정의**: Phase 완료 후 자동으로 실행되는 품질 검사
- **실행**: 별도의 Claude Code 검증 에이전트가 산출물 검사
- **검사 항목**:
  - 파일 존재 여부
  - 최소 길이 (문서: ≥500자)
  - 플레이스홀더 없음 (`[TODO]`, `[Insert X]`)
  - 섹션 완전성
  - 정보 일관성

### Auto-Rework (자동 재작업)
- **정의**: 검증 실패 시 자동으로 재작업을 시도하는 메커니즘
- **시도 횟수**: 최대 3회
- **프로세스**:
  1. 검증 실패 → 검증 리포트 전달
  2. Agent가 피드백 반영하여 수정
  3. 재검증
  4. 3회 실패 시 → 사용자 개입 요청

### Review (리뷰)
- **정의**: 검증 통과 후 사용자가 산출물을 확인하는 단계
- **UI**: 웹 UI에서 문서/코드 확인, 코멘트 작성, 승인/거부
- **결과**:
  - 승인 (Approve): 다음 Phase 진행
  - 변경 요청 (Request Changes): 피드백과 함께 재작업

---

## 상태 관리 (State Management)

### Task Status (작업 상태)
Task의 현재 상태:

- **draft**: 초안 작성 중
- **pending**: 실행 대기 중
- **in_progress**: 실행 중
- **review**: 리뷰 대기 중 (Phase 완료 후)
- **completed**: 완료
- **failed**: 실패

**상태 전이**:
```
draft → pending → in_progress → review → completed
                      ↓
                   failed
```

### Agent Status (에이전트 상태)
Sub-Agent의 현재 실행 상태:

- **idle**: 유휴 (작업 할당 전)
- **running**: 실행 중
- **paused**: 일시 중지 (수동 또는 checkpoint)
- **waiting_dependency**: 의존성 대기 중
- **waiting_question**: 사용자 질문 응답 대기 중
- **waiting_review**: 리뷰 대기 중
- **completed**: 완료
- **failed**: 실패

**상태 전이**: `/docs/STATE_MACHINE.md` 참조

---

## 통신 프로토콜 (Communication Protocols)

### Protocol (프로토콜)
- **정의**: Sub-Agent와 Platform 간 구조화된 통신 포맷
- **전송 방식**: Sub-Agent의 stdout에 특정 형식으로 출력
- **파싱**: Agent Manager가 실시간으로 파싱하여 처리

### DEPENDENCY_REQUEST (의존성 요청)
- **용도**: 외부 리소스(API 키, 환경 변수 등) 요청
- **형식**: `[DEPENDENCY_REQUEST]...[/DEPENDENCY_REQUEST]`
- **처리**: Agent 일시중지 → 사용자 입력 → 환경변수 주입 → Agent 재개

### USER_QUESTION (사용자 질문)
- **용도**: 불명확한 요구사항이나 선택지에 대해 질문
- **형식**: `[USER_QUESTION]...[/USER_QUESTION]`
- **처리**: Agent 일시중지 → 사용자 응답 → Agent 재개

### PHASE_COMPLETE (Phase 완료)
- **용도**: Phase 완료 신호
- **형식**: `=== PHASE N COMPLETE ===`
- **처리**: Agent 일시중지 → 검증 → 리뷰 → 승인 시 다음 Phase

### ERROR (에러)
- **용도**: 복구 가능/불가능한 에러 보고
- **형식**: `[ERROR]...[/ERROR]`
- **처리**: Checkpoint 생성 → 에러 타입에 따라 재시도 또는 실패 처리

**상세 사양**: `/docs/PROTOCOLS.md` 참조

---

## 저장 및 복구 (Persistence & Recovery)

### Workspace (작업공간)
- **정의**: 각 Task의 모든 파일과 상태가 저장되는 디렉토리
- **경로**: `/projects/{task-id}/`
- **구조**:
  ```
  /projects/{task-id}/
  ├── docs/           # 문서 산출물
  ├── src/            # 코드 산출물
  ├── .metadata/      # Task 메타데이터
  ├── .checkpoints/   # 체크포인트
  └── .logs/          # 실행 로그
  ```
- **특징**: Single Source of Truth (파일 시스템이 1차 저장소, DB는 2차 인덱스)

### Checkpoint (체크포인트)
- **정의**: Agent의 현재 상태를 저장하여 나중에 복구할 수 있게 하는 스냅샷
- **생성 시점**:
  - 자동: 10분마다
  - Rate Limit 감지 시
  - 에러 발생 시
  - Phase 완료 시
  - 수동 일시중지 시
- **저장 내용**: Agent 상태, 대화 히스토리, 환경 변수, 진행률
- **위치**: `/projects/{task-id}/.checkpoints/{timestamp}.json`

### Recovery (복구)
- **정의**: 시스템 재시작 시 중단된 Task를 자동으로 복구하는 프로세스
- **방법**: Workspace 스캔 → Task 발견 → 최신 Checkpoint 복구 → Agent 재개
- **보장**: 시스템 crash 후에도 작업 손실 없음

---

## 가이드 시스템 (Guide System)

### Guide Document (가이드 문서)
- **정의**: Sub-Agent가 각 Phase를 수행할 때 참조하는 구조화된 지침 문서
- **총 개수**: 24개
- **분류**:
  - `guide/planning/`: 9개 (Phase 1 기획)
  - `guide/design/`: 5개 (Phase 2 설계)
  - `guide/development/`: 6개 (Phase 3 개발)
  - `guide/verification/`: 3개 (Phase별 검증 기준)
  - `guide/review/`: 1개 (리뷰 프로세스)
- **형식**: Markdown
- **내용**: 목적, 입력, 작업 항목, 산출물 템플릿, 체크리스트

---

## 모니터링 (Monitoring)

### Token Usage (토큰 사용량)
- **정의**: Claude API 호출 시 사용된 입력/출력 토큰 수
- **추적**: 실시간 모니터링, Task별 누적
- **용도**: 비용 계산, Rate Limit 예방

### Rate Limit (요청 제한)
- **정의**: Claude API의 분당/시간당 토큰 사용 제한
- **처리**:
  - Limit 근접 시 자동 일시중지
  - Checkpoint 생성
  - Reset 시간 대기 후 자동 재개

### Progress (진행률)
- **정의**: Task 완료 정도를 백분율로 표시
- **계산**: (완료된 Phase 수 + 현재 Phase 진행률) / 전체 Phase 수
- **표시**: 웹 UI의 진행 바

---

## 보안 (Security)

### Encryption (암호화)
- **대상**: API 키, 환경 변수, 민감한 의존성
- **방식**: AES-256-GCM
- **키 관리**: `ENCRYPTION_KEY` 환경 변수 (32바이트)

### Path Validation (경로 검증)
- **목적**: Path Traversal 공격 방지
- **방법**: 모든 파일 경로를 Workspace 기준 경로로 정규화하여 검증
- **금지**: `../`, 절대 경로, 심볼릭 링크

### Input Sanitization (입력 정제)
- **목적**: Prompt Injection 방지
- **방법**: 사용자 입력에서 프로토콜 태그 제거, 특수 문자 이스케이프

---

## 실시간 기능 (Real-time Features)

### SSE (Server-Sent Events)
- **정의**: 서버에서 클라이언트로 실시간 데이터를 푸시하는 HTTP 기반 프로토콜
- **용도**: Agent 로그 스트리밍, 상태 업데이트
- **엔드포인트**: `GET /api/tasks/{id}/stream`
- **형식**: `data: {"type": "log", "content": "..."}\n\n`

### Streaming (스트리밍)
- **정의**: Agent의 stdout을 실시간으로 웹 UI에 표시
- **구현**: Agent stdout → Agent Manager → SSE → 브라우저
- **이벤트 타입**: log, status, protocol, error

---

## 기타 (Miscellaneous)

### Claude Code CLI
- **정의**: Anthropic의 공식 명령줄 인터페이스
- **설치**: `npm install -g @anthropic-ai/claude-code`
- **인증**: `claude login` (API 키 환경변수 불필요)
- **실행**: `claude code --yes ...`

### Working Directory (작업 디렉토리)
- **정의**: Sub-Agent의 현재 작업 디렉토리 (`cwd`)
- **값**: `/projects/{task-id}/`
- **사용**: 모든 파일 읽기/쓰기는 이 디렉토리 기준 상대 경로 사용

### Placeholder (플레이스홀더)
- **정의**: 미완성 콘텐츠를 나타내는 임시 텍스트
- **예시**: `[TODO]`, `[Insert description]`, `...`
- **검증**: 산출물에 플레이스홀더가 남아있으면 검증 실패

---

## 관련 문서

- **아키텍처**: `/docs/ARCHITECTURE.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **프로토콜 상세**: `/docs/PROTOCOLS.md`
- **상태 전이**: `/docs/STATE_MACHINE.md`
- **API 참조**: `/docs/API.md`
- **빠른 시작**: `/docs/QUICK_START.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
