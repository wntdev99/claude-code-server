# 기능 구현 문서

웹 서버의 핵심 기능 구현 가이드 모음입니다.

## 📄 문서 목록

### `sse-streaming.md`
**언제 읽나요?** 실시간 로그 스트리밍 기능을 구현할 때

**내용**:
- Server-Sent Events (SSE) 구현
- 이벤트 타입 정의
- 클라이언트 연결 관리
- 재연결 로직
- 에러 처리

**관련 API**: `/api/tasks/[id]/stream`

### `process-management.md`
**언제 읽나요?** Claude Code 에이전트 프로세스를 관리할 때

**내용**:
- `child_process` 사용법
- 프로세스 생성 및 종료
- stdin/stdout/stderr 관리
- 프로세스 모니터링
- 리소스 정리

**관련 API**: `/api/tasks/[id]/execute`, `/api/tasks/[id]/pause`

### `protocol-parsing.md`
**언제 읽나요?** 에이전트 출력에서 프로토콜을 파싱할 때

**내용**:
- 프로토콜 패턴 정의
- 정규식 파싱
- 의존성 요청 감지
- 사용자 질문 감지
- Phase 완료 감지
- 에러 감지

**관련 기능**: Agent output monitoring

### `task-management.md`
**언제 읽나요?** Task CRUD 기능을 구현할 때

**내용**:
- Task 생성 로직
- Task 조회 및 필터링
- Task 업데이트
- Task 삭제 (상태 확인)
- Phase 진행 추적

**관련 API**: `/api/tasks/*`

### `review-system.md`
**언제 읽나요?** 리뷰 게이트 시스템을 구현할 때

**내용**:
- Review 생성 로직
- 산출물 수집
- 승인/거부 처리
- 피드백 관리
- 자동 Phase 전환

**관련 API**: `/api/tasks/[id]/reviews`, `/api/reviews/[id]/approve`

## 🎯 일반적인 구현 흐름

### 1. 새 Task 실행하기

```
읽을 문서 순서:
1. task-management.md (Task 생성)
   → POST /api/tasks

2. process-management.md (프로세스 시작)
   → spawn Claude Code agent

3. sse-streaming.md (로그 스트리밍)
   → GET /api/tasks/[id]/stream

4. protocol-parsing.md (프로토콜 감지)
   → Parse agent output
```

### 2. Phase 완료 처리하기

```
읽을 문서 순서:
1. protocol-parsing.md (완료 신호 감지)
   → Detect "=== PHASE N COMPLETE ==="

2. process-management.md (프로세스 일시중지)
   → Pause agent process

3. review-system.md (리뷰 생성)
   → Create review with deliverables
```

### 3. 의존성 처리하기

```
읽을 문서 순서:
1. protocol-parsing.md (의존성 요청 감지)
   → Detect [DEPENDENCY_REQUEST]

2. process-management.md (프로세스 일시중지)
   → Pause agent

3. ../../security/encryption.md (값 암호화)
   → Encrypt API key/secret

4. process-management.md (프로세스 재개)
   → Resume with dependency injected
```

## 📊 기능 간 의존성

```
task-management.md
    ├─→ process-management.md (실행)
    └─→ review-system.md (리뷰)

process-management.md
    ├─→ sse-streaming.md (로그)
    └─→ protocol-parsing.md (파싱)

protocol-parsing.md
    ├─→ review-system.md (Phase 완료)
    ├─→ process-management.md (일시중지/재개)
    └─→ ../../security/ (의존성 암호화)

review-system.md
    └─→ task-management.md (Phase 전환)
```

## 🔍 빠른 참조

### Task 생성
→ `task-management.md` → "Task 생성" 섹션

### 로그 스트리밍
→ `sse-streaming.md` → "SSE 구현" 섹션

### 프로세스 시작
→ `process-management.md` → "프로세스 생성" 섹션

### 프로토콜 파싱
→ `protocol-parsing.md` → "파싱 패턴" 섹션

### 리뷰 처리
→ `review-system.md` → "승인/거부" 섹션

## 🔗 관련 문서

- **API 설계**: `../api/` - API 엔드포인트 상세
- **보안**: `../security/` - 보안 구현
- **아키텍처**: `../architecture/` - 구조 이해
- **에이전트 관리자**: `../../agent-manager/docs/` - 에이전트 관리 상세
