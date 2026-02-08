# Claude Code Server 개발 가이드

**역할**: 웹 서버 (Tier 1) - 사용자 인터페이스 및 API 제공

**목적**: 이 가이드는 웹 서버를 개발할 때 참조하는 전반적인 가이드입니다.

## 🎯 웹 서버의 책임

1. **사용자 인터페이스** - 웹 브라우저로 UI 제공
2. **API Gateway** - REST API 엔드포인트 제공
3. **실시간 통신** - SSE로 로그 스트리밍
4. **프로세스 관리** - 에이전트 프로세스 생성 및 관리
5. **보안** - 입력 검증, 암호화, Rate Limiting

## 📚 문서 구조

**중요**: 패키지별 상세 문서는 현재 개발 중입니다. 대신 **루트 `/docs/` 폴더**의 문서를 참조하세요:

```
/docs/  (루트)
├── ARCHITECTURE.md      # 3-tier 아키텍처
├── WORKFLOWS.md         # Phase-based 워크플로우
├── PROTOCOLS.md         # 플랫폼-에이전트 통신
├── FEATURES.md          # 전체 기능 명세
├── API.md              # REST API 참조
├── DEVELOPMENT.md      # 개발 환경 설정
├── SETTINGS_SYSTEM.md  # 설정 시스템
└── ... (기타 문서들)
```

**📖 시작하기**: 루트의 `/docs/QUICK_START.md`를 먼저 읽어보세요.

## 🚀 빠른 시작

### 1. 처음 시작할 때

```
1. /docs/DEVELOPMENT.md (루트)
   → 개발 환경 설정

2. /docs/ARCHITECTURE.md (루트)
   → 3-tier 시스템 구조 이해

3. /docs/QUICK_START.md (루트)
   → 빠른 시작 가이드
```

### 2. 기능 구현할 때

**필요한 기능의 문서를 찾아서 읽으세요** (루트 `/docs/` 참조):

| 구현할 기능 | 읽을 문서 |
|------------|----------|
| Task API 만들기 | `/docs/API.md` (Tasks API 섹션) |
| 로그 스트리밍 | `/docs/FEATURES.md` (SSE Streaming 섹션) |
| 에이전트 실행 | `/docs/ARCHITECTURE.md` (Process Management 섹션) |
| 프로토콜 파싱 | `/docs/PROTOCOLS.md` |
| 리뷰 시스템 | `/docs/WORKFLOWS.md` (Review Gate 섹션) |
| 경로 검증 | `/docs/ARCHITECTURE.md` (Security 섹션) |
| Settings 시스템 | `/docs/SETTINGS_SYSTEM.md` |

### 3. 문제 해결할 때

```
/docs/TROUBLESHOOTING.md (루트)
→ 문제 해결 가이드 및 일반적인 이슈
```

## 📋 주요 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **상태 관리**: Zustand
- **프로세스 관리**: Node.js `child_process`
- **실시간 통신**: Server-Sent Events (SSE)

## 🔍 일반적인 작업 흐름

### Task 실행 구현

```
1. Task 생성 API
   → /docs/API.md (Tasks API 섹션)
   → /docs/FEATURES.md (Task Management 섹션)

2. 에이전트 프로세스 시작
   → /docs/ARCHITECTURE.md (Tier 1: Web Server 섹션)

3. 로그 스트리밍
   → /docs/FEATURES.md (SSE Streaming 섹션)

4. 프로토콜 파싱
   → /docs/PROTOCOLS.md

5. 보안 적용
   → /docs/ARCHITECTURE.md (Security 섹션)
   → /docs/RATE_LIMITING.md
```

### Phase 완료 처리 구현

```
1. 완료 신호 감지
   → /docs/PROTOCOLS.md (PHASE_COMPLETE 섹션)

2. 프로세스 일시중지
   → /docs/ARCHITECTURE.md (Process Management)

3. 리뷰 생성
   → /docs/WORKFLOWS.md (Review Gate System)
```

### Settings 처리 구현

```
1. Settings 조회 API
   → /docs/SETTINGS_SYSTEM.md

2. Settings 암호화
   → /docs/ARCHITECTURE.md (Security 섹션)

3. Agent에 전달
   → /docs/SETTINGS_SYSTEM.md (Data Flow)

참고: DEPENDENCY_REQUEST 프로토콜은 deprecated입니다.
Settings 시스템을 사용하세요.
```

## 🏗️ 프로젝트 구조

```
packages/claude-code-server/
├── app/                # Next.js App Router
│   ├── (routes)/       # 페이지 라우트
│   └── api/            # API 라우트
├── components/         # UI 컴포넌트
├── lib/                # 비즈니스 로직
│   ├── agent/          # 에이전트 관리
│   ├── store/          # 상태 관리
│   └── utils/          # 유틸리티
└── CLAUDE.md           # 이 파일
```

**상세 구조**: 루트 `/docs/ARCHITECTURE.md` 참조

## 🔐 보안 체크리스트

모든 기능 구현 시 다음을 확인하세요:

- [ ] **입력 검증**: 모든 사용자 입력 검증
- [ ] **경로 검증**: 파일 경로 Path Traversal 방지
- [ ] **암호화**: API 키 및 민감 정보 암호화
- [ ] **Rate Limiting**: API 엔드포인트 Rate Limiting 적용
- [ ] **에러 처리**: 민감한 정보 노출 방지

**상세**: `/docs/ARCHITECTURE.md` (Security 섹션) 참조

## 🔗 다른 계층과의 통신

### Agent Manager와 통신

```
웹 서버 → Agent Manager
  - 작업 할당
  - 상태 조회
  - 제어 명령 (일시중지/재개/취소)

Agent Manager → 웹 서버
  - 상태 업데이트
  - 이벤트 알림
  - 프로토콜 메시지
```

**상세**: `/docs/ARCHITECTURE.md` (Tier 2: Agent Manager 섹션) 참조

## 📖 전체 문서 목록 (루트 `/docs/` 참조)

### 핵심 문서 (Core Documentation)
- `/docs/ARCHITECTURE.md` - 3-tier 시스템 아키텍처
- `/docs/WORKFLOWS.md` - Phase-based 워크플로우
- `/docs/FEATURES.md` - 전체 기능 명세
- `/docs/API.md` - REST API 참조
- `/docs/DEVELOPMENT.md` - 개발 환경 설정

### 참조 문서 (Reference Documentation)
- `/docs/QUICK_START.md` - 빠른 시작 가이드
- `/docs/README.md` - 문서 인덱스
- `/docs/GLOSSARY.md` - 용어 정의
- `/docs/PROTOCOLS.md` - 플랫폼-에이전트 통신
- `/docs/STATE_MACHINE.md` - 에이전트 상태 전이
- `/docs/DIAGRAMS.md` - 시스템 다이어그램

### 시스템별 문서 (System-Specific)
- `/docs/SETTINGS_SYSTEM.md` - 설정 시스템 (권장)
- `/docs/CHECKPOINT_SYSTEM.md` - 체크포인트 시스템
- `/docs/RATE_LIMITING.md` - Rate Limit 처리
- `/docs/TROUBLESHOOTING.md` - 문제 해결 가이드
- `/docs/DEPENDENCY_SYSTEM.md` - ⚠️ DEPRECATED (사용 금지)

### 패키지별 상세 문서 (계획 중)
패키지별 상세 구현 문서는 현재 개발 중입니다.
구현 시작 시 다음 구조로 작성될 예정:
- `packages/claude-code-server/docs/architecture/`
- `packages/claude-code-server/docs/features/`
- `packages/claude-code-server/docs/security/`
- `packages/claude-code-server/docs/api/`

## 💡 효율적인 문서 활용법

### ✅ 좋은 방법

```
1. 필요한 주제의 문서만 선택적으로 읽기
   예: SSE 구현 → docs/features/sse-streaming.md만 읽기

2. README 먼저 읽기
   각 폴더의 README.md로 전체 구조 파악

3. 관련 문서 따라가기
   문서 끝의 "관련 문서" 링크 활용
```

### ❌ 비효율적인 방법

```
1. 모든 문서를 순서대로 읽기
   → 필요한 것만 읽으세요!

2. 문서 없이 코드부터 작성
   → 구조를 먼저 이해하세요!

3. 오래된 정보 참조
   → 항상 docs/ 폴더의 최신 문서 참조
```

## 🎓 학습 경로

### 초급 (프로젝트 처음 시작)

```
1주차: 구조 이해
  - /docs/QUICK_START.md
  - /docs/ARCHITECTURE.md
  - /docs/DEVELOPMENT.md

2주차: 기본 기능
  - /docs/FEATURES.md (Task Management 섹션)
  - /docs/API.md (Tasks API)
  - /docs/ARCHITECTURE.md (Security 섹션)
```

### 중급 (핵심 기능 구현)

```
3주차: 실시간 통신
  - /docs/FEATURES.md (SSE Streaming)
  - /docs/ARCHITECTURE.md (Process Management)

4주차: 프로토콜
  - /docs/PROTOCOLS.md
  - /docs/WORKFLOWS.md (Review Gate System)
```

### 고급 (최적화 및 보안)

```
5주차: 보안 강화
  - /docs/ARCHITECTURE.md (Security 섹션)
  - /docs/RATE_LIMITING.md
  - /docs/SETTINGS_SYSTEM.md

6주차: 운영 및 문제 해결
  - /docs/CHECKPOINT_SYSTEM.md
  - /docs/TROUBLESHOOTING.md
```

## 🆘 문제 해결

### "어떤 문서를 읽어야 할지 모르겠어요"
→ `/docs/README.md`부터 시작하세요. 전체 구조를 설명합니다.

### "특정 기능을 어떻게 구현하나요?"
→ `/docs/FEATURES.md`에서 해당 기능 섹션을 찾으세요.

### "코드가 동작하지 않아요"
→ `/docs/TROUBLESHOOTING.md`를 참조하세요.

### "보안은 어떻게 적용하나요?"
→ `/docs/ARCHITECTURE.md`의 Security 섹션에서 시작하세요.

## 🔄 다음 단계

이 가이드를 읽었다면:

1. **`/docs/README.md`** (루트) 읽기 → 문서 구조 파악
2. **`/docs/DEVELOPMENT.md`** 읽기 → 환경 설정
3. **`/docs/ARCHITECTURE.md`** 읽기 → 3-tier 구조 이해
4. **필요한 기능 문서** 읽기 → 구현 시작

---

**기억하세요**: 이 CLAUDE.md는 Tier 1 (Web Server) 개요입니다. 상세한 내용은 루트 `/docs/` 폴더의 문서를 참조하세요!

**문서 위치**:
- 이 파일: `/packages/claude-code-server/CLAUDE.md`
- 상세 문서: 루트 `/docs/` (ARCHITECTURE.md, WORKFLOWS.md, PROTOCOLS.md 등)
