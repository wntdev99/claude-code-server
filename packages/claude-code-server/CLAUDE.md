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

모든 상세 문서는 `docs/` 폴더에 주제별로 정리되어 있습니다:

```
docs/
├── architecture/    # 아키텍처 및 구조
├── development/     # 개발 환경 및 도구
├── features/        # 주요 기능 구현
├── security/        # 보안
└── api/            # API 설계
```

**📖 시작하기**: `docs/README.md`를 먼저 읽어보세요.

## 🚀 빠른 시작

### 1. 처음 시작할 때

```
1. docs/development/setup.md
   → 개발 환경 설정

2. docs/architecture/nextjs-structure.md
   → 프로젝트 구조 이해

3. docs/development/conventions.md
   → 코딩 컨벤션 학습
```

### 2. 기능 구현할 때

**필요한 기능의 문서를 찾아서 읽으세요**:

| 구현할 기능 | 읽을 문서 |
|------------|----------|
| Task API 만들기 | `docs/api/tasks-api.md` |
| 로그 스트리밍 | `docs/features/sse-streaming.md` |
| 에이전트 실행 | `docs/features/process-management.md` |
| 프로토콜 파싱 | `docs/features/protocol-parsing.md` |
| 리뷰 시스템 | `docs/features/review-system.md` |
| 경로 검증 | `docs/security/path-validation.md` |
| 암호화 | `docs/security/encryption.md` |

### 3. 문제 해결할 때

```
docs/development/debugging.md
→ 디버깅 방법과 일반적인 문제 해결
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
   → docs/api/tasks-api.md
   → docs/features/task-management.md

2. 에이전트 프로세스 시작
   → docs/features/process-management.md

3. 로그 스트리밍
   → docs/features/sse-streaming.md

4. 프로토콜 파싱
   → docs/features/protocol-parsing.md

5. 보안 적용
   → docs/security/path-validation.md
   → docs/security/rate-limiting.md
```

### Phase 완료 처리 구현

```
1. 완료 신호 감지
   → docs/features/protocol-parsing.md

2. 프로세스 일시중지
   → docs/features/process-management.md

3. 리뷰 생성
   → docs/features/review-system.md
```

### 의존성 요청 처리 구현

```
1. 의존성 요청 감지
   → docs/features/protocol-parsing.md

2. 프로세스 일시중지
   → docs/features/process-management.md

3. 값 암호화
   → docs/security/encryption.md

4. 프로세스 재개
   → docs/features/process-management.md
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
└── docs/               # 📚 상세 문서 (여기!)
```

**상세 구조**: `docs/architecture/nextjs-structure.md` 참조

## 🔐 보안 체크리스트

모든 기능 구현 시 다음을 확인하세요:

- [ ] **입력 검증**: 모든 사용자 입력 검증
- [ ] **경로 검증**: 파일 경로 Path Traversal 방지
- [ ] **암호화**: API 키 및 민감 정보 암호화
- [ ] **Rate Limiting**: API 엔드포인트 Rate Limiting 적용
- [ ] **에러 처리**: 민감한 정보 노출 방지

**상세**: `docs/security/` 폴더 참조

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

**상세**: `../agent-manager/docs/` 참조

## 📖 전체 문서 목록

### Architecture (구조)
- `docs/architecture/README.md` - 아키텍처 문서 개요
- `docs/architecture/nextjs-structure.md` - Next.js 프로젝트 구조
- `docs/architecture/api-routes.md` - API Routes 설계
- `docs/architecture/state-management.md` - 상태 관리
- `docs/architecture/ui-components.md` - UI 컴포넌트

### Development (개발)
- `docs/development/README.md` - 개발 문서 개요
- `docs/development/setup.md` - 환경 설정
- `docs/development/testing.md` - 테스팅
- `docs/development/debugging.md` - 디버깅
- `docs/development/conventions.md` - 코딩 컨벤션

### Features (기능)
- `docs/features/README.md` - 기능 문서 개요
- `docs/features/sse-streaming.md` - SSE 스트리밍
- `docs/features/process-management.md` - 프로세스 관리
- `docs/features/protocol-parsing.md` - 프로토콜 파싱
- `docs/features/task-management.md` - Task 관리
- `docs/features/review-system.md` - 리뷰 시스템

### Security (보안)
- `docs/security/README.md` - 보안 문서 개요
- `docs/security/path-validation.md` - 경로 검증
- `docs/security/encryption.md` - 암호화
- `docs/security/rate-limiting.md` - Rate Limiting
- `docs/security/input-sanitization.md` - 입력 검증

### API (API 설계)
- `docs/api/README.md` - API 문서 개요
- `docs/api/tasks-api.md` - Tasks API
- `docs/api/reviews-api.md` - Reviews API
- `docs/api/dependencies-api.md` - Dependencies API
- `docs/api/questions-api.md` - Questions API

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
  - docs/architecture/nextjs-structure.md
  - docs/development/setup.md
  - docs/development/conventions.md

2주차: 기본 기능
  - docs/features/task-management.md
  - docs/api/tasks-api.md
  - docs/security/path-validation.md
```

### 중급 (핵심 기능 구현)

```
3주차: 실시간 통신
  - docs/features/sse-streaming.md
  - docs/features/process-management.md

4주차: 프로토콜
  - docs/features/protocol-parsing.md
  - docs/features/review-system.md
```

### 고급 (최적화 및 보안)

```
5주차: 보안 강화
  - docs/security/encryption.md
  - docs/security/rate-limiting.md
  - docs/security/input-sanitization.md

6주차: 성능 최적화
  - docs/development/testing.md
  - docs/development/debugging.md
```

## 🆘 문제 해결

### "어떤 문서를 읽어야 할지 모르겠어요"
→ `docs/README.md`부터 시작하세요. 전체 구조를 설명합니다.

### "특정 기능을 어떻게 구현하나요?"
→ `docs/features/README.md`에서 해당 기능 문서를 찾으세요.

### "코드가 동작하지 않아요"
→ `docs/development/debugging.md`를 참조하세요.

### "보안은 어떻게 적용하나요?"
→ `docs/security/README.md`에서 시작하세요.

## 🔄 다음 단계

이 가이드를 읽었다면:

1. **`docs/README.md`** 읽기 → 문서 구조 파악
2. **`docs/development/setup.md`** 읽기 → 환경 설정
3. **`docs/architecture/nextjs-structure.md`** 읽기 → 프로젝트 구조 이해
4. **필요한 기능 문서** 읽기 → 구현 시작

---

**기억하세요**: 이 CLAUDE.md는 전체 개요입니다. 상세한 내용은 `docs/` 폴더의 해당 문서를 참조하세요!

**문서 위치**: `/packages/claude-code-server/docs/`
