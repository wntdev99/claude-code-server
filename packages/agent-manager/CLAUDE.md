# Agent Manager 운영 가이드

**역할**: 에이전트 관리자 (Tier 2) - 서브 에이전트 관리 및 오케스트레이션

**목적**: 이 가이드는 에이전트 관리자가 서브 에이전트를 관리할 때 참조하는 전반적인 가이드입니다.

## 🎯 에이전트 관리자의 책임

1. **생명주기 관리** - 에이전트 생성, 시작, 일시중지, 재개, 종료
2. **작업 할당** - Task를 서브 에이전트에게 분배
3. **프로토콜 처리** - 에이전트 출력 파싱 및 프로토콜 감지
4. **상태 추적** - 에이전트 상태, 진행률, 토큰 사용량 모니터링
5. **Checkpoint 관리** - 에이전트 상태 저장 및 복구
6. **대기열 관리** - Task 우선순위 및 스케줄링

## 📚 문서 구조

모든 상세 문서는 `docs/` 폴더에 주제별로 정리되어 있습니다:

```
docs/
├── lifecycle/       # 에이전트 생명주기
├── protocols/       # 프로토콜 처리
├── queue/          # 대기열 관리
├── checkpoint/     # Checkpoint 시스템
└── monitoring/     # 모니터링
```

**📖 시작하기**: `docs/README.md`를 먼저 읽어보세요.

## 🚀 빠른 시작

### 1. 처음 시작할 때

```
1. docs/lifecycle/README.md
   → 에이전트 생명주기 이해

2. docs/protocols/README.md
   → 프로토콜 처리 방법

3. docs/monitoring/status-tracking.md
   → 상태 추적 방법
```

### 2. 특정 기능 구현할 때

| 구현할 기능 | 읽을 문서 |
|------------|----------|
| 에이전트 생성 | `docs/lifecycle/creation.md` |
| 에이전트 제어 | `docs/lifecycle/execution.md` |
| 질문 처리 | `docs/protocols/question.md` |
| Phase 완료 처리 | `docs/protocols/phase-completion.md` |
| 토큰 추적 | `docs/monitoring/token-management.md` |
| Checkpoint | `docs/checkpoint/creation.md` |
| 대기열 관리 | `docs/queue/priority.md` |

## 🔍 일반적인 작업 흐름

### Task 할당 및 실행

```
1. 웹 서버로부터 Task 수신
   → docs/lifecycle/creation.md

2. 서브 에이전트 생성
   → spawn Claude Code process

3. 초기 프롬프트 전달
   → Task 타입에 맞는 워크플로우 프롬프트

4. 출력 모니터링
   → docs/protocols/README.md

5. 프로토콜 감지 및 처리
   → docs/protocols/[해당프로토콜].md
```

### Phase 완료 처리

```
1. Phase 완료 신호 감지
   → docs/protocols/phase-completion.md

2. 에이전트 일시 중지
   → docs/lifecycle/execution.md

3. 산출물 수집
   → 작업 디렉토리 (/projects/{task-id}/) 스캔
   → Phase별 대상 디렉토리 (docs/planning, docs/design, src 등)
   → 생성된 파일 목록 및 메타데이터 수집

4. 리뷰 생성 요청
   → 수집된 산출물 정보를 웹 서버에 전달
   → 웹 서버가 리뷰 생성

5. 승인 대기
   → waiting_review 상태

6. 승인 시 다음 Phase 시작
   → 다음 Phase 프롬프트 전달
```

### Rate Limit 처리

```
1. Rate Limit 감지
   → docs/monitoring/rate-limit.md

2. Checkpoint 생성
   → docs/checkpoint/creation.md

3. 에이전트 일시 중지
   → docs/lifecycle/execution.md

4. 대기열로 이동
   → docs/queue/priority.md

5. Reset 시간 대기
   → 자동 스케줄링

6. 자동 재개
   → docs/checkpoint/restoration.md
```

## 🏗️ 에이전트 상태 관리

### AgentStatus 인터페이스

```typescript
interface AgentStatus {
  taskId: string;
  status: AgentStatus;           // 현재 상태
  currentPhase: number | null;   // 현재 Phase
  currentStep: string | null;    // 현재 Step
  progress: number;              // 0-100
  tokensUsed: number;            // 사용 토큰
  blockedBy: string | null;      // 차단 사유
  lastUpdate: string;            // 마지막 업데이트
}
```

### 상태 전이

```
idle → running → waiting_review → running → completed
         ↓            ↓
    waiting_*      paused
         ↓
     running
```

**상세**: `docs/monitoring/status-tracking.md` 참조

## 📊 프로토콜 처리 우선순위

```
1. ERROR (최우선)
   → 즉시 처리 및 복구 시도

2. PHASE_COMPLETE
   → Phase 종료 처리

3. USER_QUESTION
   → 실행 차단

4. 일반 로그
   → 기록만
```

## 🔐 Checkpoint 생성 시점

- **자동** (10분마다)
- **Rate Limit** 감지 시
- **수동** 일시중지 시
- **에러** 발생 시
- **Phase 완료** 시

**상세**: `docs/checkpoint/creation.md` 참조

## 🔗 다른 계층과의 통신

### 웹 서버 → 에이전트 관리자

- Task 생성 알림
- 실행/일시중지/재개/취소 명령
- 질문 응답
- 리뷰 승인/거부

### 에이전트 관리자 → 웹 서버

- 상태 업데이트
- 프로토콜 이벤트 (질문 등)
- Phase 완료 알림
- 에러 알림

### 에이전트 관리자 → 서브 에이전트

- 초기 프롬프트
- 제어 신호 (SIGTSTP, SIGCONT, SIGTERM)
- 환경변수 주입
- stdin 입력

### 서브 에이전트 → 에이전트 관리자

- stdout 출력 (로그, 프로토콜)
- stderr 출력 (에러)
- 종료 코드

## 📖 전체 문서 목록

### Lifecycle (생명주기)
- `docs/lifecycle/README.md` - 생명주기 개요
- `docs/lifecycle/creation.md` - 에이전트 생성
- `docs/lifecycle/execution.md` - 실행 및 제어
- `docs/lifecycle/termination.md` - 종료 및 정리

### Protocols (프로토콜)
- `docs/protocols/README.md` - 프로토콜 개요
- `docs/protocols/question.md` - 사용자 질문
- `docs/protocols/phase-completion.md` - Phase 완료
- `docs/protocols/error.md` - 에러 처리

### Queue (대기열)
- `docs/queue/README.md` - 대기열 개요
- `docs/queue/priority.md` - 우선순위 관리

### Checkpoint (체크포인트)
- `docs/checkpoint/README.md` - Checkpoint 개요
- `docs/checkpoint/creation.md` - 생성
- `docs/checkpoint/restoration.md` - 복구

### Monitoring (모니터링)
- `docs/monitoring/README.md` - 모니터링 개요
- `docs/monitoring/status-tracking.md` - 상태 추적
- `docs/monitoring/token-management.md` - 토큰 관리
- `docs/monitoring/rate-limit.md` - Rate Limit 처리

## 💡 Best Practices

1. **항상 Checkpoint 생성** - 일시중지 전, 종료 전
2. **토큰 사용량 모니터링** - Rate Limit 예방
3. **프로토콜 엄격 파싱** - 검증 후 처리
4. **에러 우아하게 처리** - 복구 시도 → 사용자 알림
5. **로그 상세히 기록** - 디버깅 용이
6. **상태 자주 업데이트** - UI 반응성
7. **리소스 정리** - 프로세스 종료 시 핸들 정리

## 🆘 문제 해결

### "어떤 문서를 읽어야 할지 모르겠어요"
→ `docs/README.md`부터 시작하세요.

### "프로토콜을 어떻게 파싱하나요?"
→ `docs/protocols/README.md` 참조

### "에이전트가 응답하지 않아요"
→ `docs/monitoring/status-tracking.md` → 상태 확인

### "Rate Limit이 자주 발생해요"
→ `docs/monitoring/rate-limit.md` → 대응 전략

## 🔄 다음 단계

1. **`docs/README.md`** 읽기
2. **`docs/lifecycle/README.md`** 읽기
3. **`docs/protocols/README.md`** 읽기
4. **필요한 기능 문서** 읽기

---

**기억하세요**: 이 CLAUDE.md는 전체 개요입니다. 상세한 내용은 `docs/` 폴더의 해당 문서를 참조하세요!

**문서 위치**: `/packages/agent-manager/docs/`
