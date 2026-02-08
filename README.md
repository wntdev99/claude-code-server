# Claude Code Server

**Claude Code CLI를 웹 기반 에이전트 관리 플랫폼으로 전환**

## 개요

Claude Code Server는 사용자가 웹 브라우저를 통해 복잡한 개발 작업을 제출하면, Claude Code 에이전트가 포괄적인 진행 상황 추적 및 대화형 사용자 커뮤니케이션과 함께 자율적으로 작업을 실행하는 플랫폼입니다.

### 핵심 가치 제안

- **웹 기반 작업 관리**: CLI 대신 브라우저를 통한 작업 제출
- **자율 에이전트 실행**: Claude Code 에이전트가 구조화된 워크플로우를 따라 독립적으로 작업
- **진행 상황 추적**: Phase 진행, 단계 및 에이전트 상태에 대한 실시간 모니터링
- **대화형 커뮤니케이션**: 에이전트가 의존성 요청, 명확화 질문, 승인 대기
- **품질 보증**: 내장된 리뷰 게이트 및 자동 검증 시스템

## 아키텍처

이 플랫폼은 **3계층 아키텍처**를 따릅니다:

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 (브라우저)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/SSE
┌────────────────────────▼────────────────────────────────────┐
│                   웹 서버 계층                               │
│              (claude-code-server)                           │
│  - Next.js 애플리케이션                                      │
│  - API 라우트 (Tasks, Reviews, Dependencies, Questions)     │
│  - SSE 스트리밍 (실시간 로그)                                 │
│  - UI 컴포넌트 (shadcn/ui)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ 프로세스 관리
┌────────────────────────▼────────────────────────────────────┐
│                  에이전트 관리자 계층                         │
│                  (agent-manager)                            │
│  - Claude Code 프로세스 생명주기 관리                         │
│  - 작업 할당 및 배분                                          │
│  - 상태 및 큐 관리                                            │
│  - 토큰 추적 및 Rate Limit 처리                               │
│  - 체크포인트 시스템                                          │
└────────────────────────┬────────────────────────────────────┘
                         │ 작업 위임
┌────────────────────────▼────────────────────────────────────┐
│                   서브 에이전트 계층                          │
│                    (sub-agent)                              │
│  - Phase 기반 워크플로우에 따른 작업 실행                      │
│  - 가이드 문서 참조 (24개 가이드)                             │
│  - 프로토콜 통신 (Dependencies, Questions)                   │
│  - 산출물 생성                                                │
└─────────────────────────────────────────────────────────────┘
```

## 주요 기능

### 1. 작업 유형 (4가지)

| 유형 | 목적 | 워크플로우 |
|------|------|-----------|
| **create_app** | 새로운 앱/웹 프로젝트 생성 | Planning → Design → Development → Testing (4 Phase-A) |
| **modify_app** | 기존 앱 수정 | Analysis → Planning → Implementation → Testing (4 Phase-B) |
| **workflow** | 워크플로우 자동화 | Planning → Design → Development → Testing (4 Phase-C) |
| **custom** | 자유 형식 대화 | 프롬프트 기반 자율 실행 |

### 2. Phase 기반 워크플로우 시스템

**Phase 1: Planning (기획)** - 9단계
- 아이디어 정의, 시장 분석, 페르소나, 사용자 여정, 비즈니스 모델, 제품 정의, 기능, 기술 스택, 로드맵
- **산출물**: `docs/planning/*.md` (9개 문서)

**Phase 2: Design (설계)** - 5단계
- 화면 설계, 데이터 모델, 작업 흐름, API 설계, 아키텍처
- **산출물**: `docs/design/*.md` (5개 문서)

**Phase 3: Development (개발)** - 6단계
- 프로젝트 설정, 데이터 계층, 비즈니스 로직, UI 구현, 테스팅, 배포 준비
- **산출물**: 작동하는 코드 프로젝트

**Phase 4: Testing (테스트)** - 검증 및 QA
- 자동화된 테스팅, 검증, 품질 보증

### 3. 리뷰 게이트 시스템

각 Phase 완료 후, 10단계 리뷰 프로세스가 품질을 보장합니다:

1. **에이전트가 완료 신호**: `=== PHASE N COMPLETE ===`
2. **플랫폼이 에이전트 일시중지** (Agent Manager가 SIGTSTP 전송)
3. **검증 에이전트 실행** (별도 Claude Code 인스턴스가 산출물 검사)
4. **검증 보고서 생성** (완성도, 품질, 플레이스홀더 부재 확인)
5. **검증 실패 시**: 자동 재작업 (피드백과 함께 최대 3회 시도)
6. **검증 통과 시**: 웹 UI를 통한 사용자 리뷰 생성
7. **사용자 리뷰** 산출물 (문서, 코드 파일)
8. **사용자 승인 또는 수정 요청** (피드백 코멘트와 함께)
9. **승인 시**: 에이전트가 다음 Phase로 진행
10. **수정 요청 시**: 에이전트가 피드백을 반영하여 재검증 제출

상세한 검증 기준은 `/docs/WORKFLOWS.md`를 참조하세요.

### 4. 플랫폼-에이전트 통신 프로토콜

**의존성 요청**
```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file | permission
name: OPENAI_API_KEY
description: OpenAI API 호출에 필요
required: true
[/DEPENDENCY_REQUEST]
```

**사용자 질문**
```
[USER_QUESTION]
category: business | clarification | choice | confirmation
question: 어떤 수익 모델을 선호하시나요?
options:
  - 구독형
  - 프리미엄
  - 광고 기반
[/USER_QUESTION]
```

**Phase 완료 신호**
```
=== PHASE 1 COMPLETE ===
완료: Phase 1 (Planning)
생성된 문서:
- docs/planning/01_idea.md
- docs/planning/02_market.md
...
```

**에러 보고**
```
[ERROR]
type: recoverable | fatal
message: Rate limit 초과
details: API rate limit 도달, 쿨다운 후 재시도
recovery: pause_and_retry | checkpoint_and_fail
[/ERROR]
```

### 5. 검증 시스템

- **자동 검증**: 각 Phase 후 자동 실행
- **별도 검증 에이전트**: 산출물 확인
- **통과** → 리뷰 게이트로 진행
- **실패** → 자동 재작업 (최대 3회 시도)

### 6. 실시간 기능

- **SSE 로그 스트리밍**: 실시간 에이전트 출력
- **에이전트 상태 추적**: 현재 작업, Phase, 단계, 진행률
- **토큰 사용량 추적**: 입력/출력 토큰, 비용
- **Rate Limit 처리**: 자동 일시중지 및 재개

## 프로젝트 구조

```
claude-code-server/
├── apps/
│   └── web/                      # Next.js 웹 애플리케이션
│
├── packages/
│   ├── claude-code-server/       # 🌐 웹 서버 패키지
│   │   └── CLAUDE.md             # 웹 서버 개발 가이드
│   ├── agent-manager/            # 🤖 에이전트 오케스트레이션 계층
│   │   └── CLAUDE.md             # 에이전트 관리자 운영 가이드
│   ├── sub-agent/                # ⚙️ 작업 실행 계층
│   │   └── CLAUDE.md             # 서브 에이전트 실행 가이드
│   ├── core/                     # 공유 도메인 로직
│   └── shared/                   # 공통 유틸리티
│
├── guide/                        # 📚 에이전트 가이드 문서 (24개 파일)
│   ├── planning/                 # (9개 가이드)
│   ├── design/                   # (5개 가이드)
│   ├── development/              # (6개 가이드)
│   ├── review/                   # (1개 가이드)
│   └── verification/             # (3개 가이드)
│
├── docs/                         # 📖 프로젝트 문서
│   ├── ARCHITECTURE.md           # 시스템 아키텍처
│   ├── FEATURES.md               # 포괄적인 명세
│   ├── API.md                    # API 문서
│   ├── WORKFLOWS.md              # 워크플로우 문서
│   └── DEVELOPMENT.md            # 개발 가이드
│
└── README.md                     # 이 파일
```

## 빠른 시작

### 사전 준비

- Node.js 18+
- Claude Code CLI 설치 및 인증
- Git

**Claude Code CLI 설치**:
```bash
# Claude Code CLI 설치
npm install -g @anthropic-ai/claude-code

# 인증
claude login
```

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/claude-code-server.git
cd claude-code-server

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 편집 (Claude Code CLI 인증은 별도, API 키 불필요)

# 개발 서버 실행
npm run dev
```

### 사용법

1. **웹 앱 열기**: `http://localhost:3000` 접속
2. **작업 생성**: "New Task" 클릭 후 폼 작성
3. **작업 유형 선택**: create_app, modify_app, workflow, custom 중 선택
4. **제출**: 에이전트가 자동으로 실행 시작
5. **진행 상황 모니터링**: 실시간 로그 및 Phase 진행 상황 확인
6. **프롬프트 응답**: 요청 시 질문 답변 및 의존성 제공
7. **산출물 리뷰**: 리뷰 게이트에서 승인 또는 수정 요청

## 기술 스택

- **프론트엔드**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
- **상태 관리**: Zustand
- **데이터베이스**: SQLite (개발) / PostgreSQL (프로덕션)
- **ORM**: Prisma
- **스케줄링**: node-cron
- **에이전트 런타임**: child_process를 통한 Claude Code CLI
- **실시간 통신**: Server-Sent Events (SSE)

## 문서

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: 상세한 시스템 아키텍처 및 컴포넌트 상호작용
- **[FEATURES.md](docs/FEATURES.md)**: 포괄적인 기능 명세 (982줄)
- **[API.md](docs/API.md)**: 완전한 API 레퍼런스
- **[WORKFLOWS.md](docs/WORKFLOWS.md)**: Phase 기반 워크플로우 문서
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)**: 개발 환경 설정

## 주요 차별화 요소

1. **구조화된 3-Phase 워크플로우**: Planning → Design → Development, 명확한 산출물
2. **24개 가이드 문서**: 상세한 가이드로 일관된 품질 보장
3. **플랫폼-에이전트 프로토콜**: 자동화된 의존성 및 질문 처리
4. **리뷰 게이트 시스템**: Phase별 사용자 승인으로 품질 관리
5. **검증 시스템**: 자동 품질 검사 및 재작업

## 기여

기여를 환영합니다! 기여 가이드라인을 읽고 Pull Request를 제출해 주세요.

## 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

## 지원

이슈 및 질문:
- GitHub Issues: [Issues](https://github.com/yourusername/claude-code-server/issues)
- 문서: [docs/](docs/)

---

**Claude Code로 제작** - AI 기반 개발을 관리형 플랫폼 경험으로 전환합니다.
