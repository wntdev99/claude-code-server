# State Machine (상태 기계)

이 문서는 Claude Code Server의 Task 및 Agent 상태 전이를 정의합니다.

---

## Task State Machine (작업 상태 기계)

### 상태 목록

| 상태 | 설명 | UI 표시 |
|------|------|---------|
| `draft` | 초안 작성 중 (아직 제출되지 않음) | 초안 |
| `pending` | 실행 대기 중 (Queue에 있음) | 대기 중 |
| `in_progress` | 실행 중 (Agent 작업 중) | 진행 중 |
| `review` | 리뷰 대기 중 (Phase 완료 후) | 리뷰 대기 |
| `completed` | 완료 (모든 Phase 완료) | 완료 |
| `failed` | 실패 (복구 불가능한 에러) | 실패 |

### 상태 전이 다이어그램

```
┌─────────┐
│  draft  │  사용자가 Task 작성 중
└────┬────┘
     │ 사용자가 제출
     ▼
┌─────────┐
│ pending │  실행 대기 중 (Queue)
└────┬────┘
     │ Agent Manager가 Sub-Agent 생성
     ▼
┌──────────────┐
│ in_progress  │ ◄─────┐ Phase N 실행 중
└──────┬───────┘       │
       │               │
       │ Phase 완료    │
       ▼               │
┌──────────────┐       │
│    review    │       │ 리뷰 승인
└──────┬───────┘       │ (다음 Phase로)
       │               │
       ├───────────────┘
       │
       │ 모든 Phase 완료
       ▼
┌──────────────┐
│  completed   │  최종 완료
└──────────────┘

       ┌──────────────┐
       │   in_progress│
       └──────┬───────┘
              │ 치명적 에러
              ▼
       ┌──────────────┐
       │    failed    │  실패
       └──────────────┘
```

### 상태 전이 규칙

#### `draft` → `pending`
- **트리거**: 사용자가 "작업 제출" 버튼 클릭
- **조건**:
  - Task title이 비어있지 않음
  - Task type이 선택됨
  - Task description이 있음
- **액션**:
  - Task를 DB에 저장
  - Queue에 추가

#### `pending` → `in_progress`
- **트리거**: Agent Manager가 작업 할당
- **조건**:
  - 사용 가능한 Agent 슬롯 존재
  - 의존성이 있는 다른 Task 없음
- **액션**:
  - Workspace 디렉토리 생성
  - Sub-Agent 프로세스 생성
  - 초기 프롬프트 전달

#### `in_progress` → `review`
- **트리거**: Phase 완료 신호 (`=== PHASE N COMPLETE ===`)
- **조건**:
  - Phase 산출물 생성 완료
  - 검증 통과 또는 3회 재작업 후 통과
- **액션**:
  - Agent 일시중지 (SIGTSTP)
  - Checkpoint 생성
  - Review 생성 (산출물 첨부)
  - 사용자에게 알림

#### `review` → `in_progress`
- **트리거**: 사용자가 "승인" 클릭
- **조건**:
  - Review가 승인됨
  - 다음 Phase가 존재
- **액션**:
  - Agent 재개 (SIGCONT)
  - 다음 Phase 프롬프트 전달

#### `review` → `in_progress` (재작업)
- **트리거**: 사용자가 "변경 요청" 클릭
- **조건**:
  - 사용자 피드백이 제공됨
- **액션**:
  - Agent 재개 (SIGCONT)
  - 피드백을 stdin으로 전달
  - 재작업 지시

#### `in_progress` → `completed`
- **트리거**: 마지막 Phase 완료 및 최종 승인
- **조건**:
  - 모든 Phase 완료
  - 최종 Review 승인
- **액션**:
  - Agent 정리 (프로세스 종료)
  - 최종 Checkpoint 생성
  - 산출물 압축 (ZIP)
  - 사용자에게 완료 알림

#### `in_progress` → `failed`
- **트리거**: 치명적 에러 발생
- **조건**:
  - `[ERROR] type: fatal` 수신
  - 또는 3회 재작업 후에도 검증 실패
- **액션**:
  - Agent 종료
  - 최종 Checkpoint 생성
  - 에러 로그 저장
  - 사용자에게 실패 알림

### 상태별 허용 액션

| 상태 | 허용 액션 | 설명 |
|------|----------|------|
| `draft` | Submit, Delete | 제출 또는 삭제 |
| `pending` | Cancel | 취소 (Queue에서 제거) |
| `in_progress` | Pause, Cancel | 일시중지 또는 취소 |
| `review` | Approve, Request Changes | 승인 또는 변경 요청 |
| `completed` | Archive, Delete | 보관 또는 삭제 |
| `failed` | Retry, Delete | 재시도 또는 삭제 |

---

## Agent State Machine (에이전트 상태 기계)

### 상태 목록

| 상태 | 설명 | Signal |
|------|------|--------|
| `idle` | 유휴 (작업 할당 전) | - |
| `running` | 실행 중 | - |
| `paused` | 수동 일시중지 | SIGTSTP |
| `waiting_dependency` | 의존성 대기 중 | SIGTSTP |
| `waiting_question` | 사용자 질문 응답 대기 | SIGTSTP |
| `waiting_review` | 리뷰 대기 중 | SIGTSTP |
| `completed` | 완료 | SIGTERM |
| `failed` | 실패 | SIGTERM |

### 상태 전이 다이어그램

```
┌──────┐
│ idle │  Agent 생성 대기
└──┬───┘
   │ 작업 할당
   ▼
┌─────────┐
│ running │ ◄────────────┐
└────┬────┘              │
     │                   │
     ├─── DEPENDENCY ────┤
     │    REQUEST        │
     ▼                   │
┌──────────────────┐    │
│waiting_dependency│    │ 의존성 제공
└──────────────────┘    │
                        │
     ┌─────────┐        │
     │ running │        │
     └────┬────┘        │
          │             │
          ├─── USER ────┤
          │   QUESTION  │
          ▼             │
┌──────────────────┐   │
│waiting_question  │   │ 응답 제공
└──────────────────┘   │
                       │
     ┌─────────┐       │
     │ running │       │
     └────┬────┘       │
          │            │
          │ PHASE      │
          │ COMPLETE   │
          ▼            │
┌──────────────────┐  │
│ waiting_review   │  │ 승인
└──────────────────┘  │
          │            │
          └────────────┘

     ┌─────────┐
     │ running │
     └────┬────┘
          │ 사용자가 일시중지
          ▼
     ┌────────┐
     │ paused │
     └────┬───┘
          │ 재개 (SIGCONT)
          ▼
     ┌─────────┐
     │ running │
     └────┬────┘
          │
          │ 완료 또는 실패
          ▼
┌──────────────────┐
│ completed/failed │
└──────────────────┘
```

### 상태 전이 규칙

#### `idle` → `running`
- **트리거**: Agent Manager가 작업 할당
- **조건**: Task가 pending 상태
- **액션**:
  - Sub-Agent 프로세스 생성
  - 초기 프롬프트 전달
  - 상태 추적 시작

#### `running` → `waiting_dependency`
- **트리거**: `[DEPENDENCY_REQUEST]` 파싱
- **조건**: 의존성이 아직 제공되지 않음
- **액션**:
  - SIGTSTP (일시중지 신호) 전송
  - Checkpoint 생성
  - Web UI에 의존성 요청 표시

#### `waiting_dependency` → `running`
- **트리거**: 사용자가 의존성 제공
- **조건**: 의존성 값이 유효함
- **액션**:
  - 환경 변수 주입
  - SIGCONT (재개 신호) 전송
  - Agent 재개

#### `running` → `waiting_question`
- **트리거**: `[USER_QUESTION]` 파싱
- **조건**: 질문이 아직 응답되지 않음
- **액션**:
  - SIGTSTP (일시중지 신호) 전송
  - Checkpoint 생성
  - Web UI에 질문 표시

#### `waiting_question` → `running`
- **트리거**: 사용자가 질문에 응답
- **조건**: 응답이 제공됨
- **액션**:
  - 응답을 stdin으로 전달
  - SIGCONT (재개 신호) 전송
  - Agent 재개

#### `running` → `waiting_review`
- **트리거**: `=== PHASE N COMPLETE ===` 파싱
- **조건**: Phase 산출물 생성 완료
- **액션**:
  - SIGTSTP (일시중지 신호) 전송
  - Checkpoint 생성
  - 검증 Agent 실행
  - 검증 통과 시 Review 생성

#### `waiting_review` → `running`
- **트리거**: 사용자가 Review 승인
- **조건**:
  - Review 승인됨
  - 다음 Phase 존재
- **액션**:
  - SIGCONT (재개 신호) 전송
  - 다음 Phase 프롬프트 전달

#### `running` → `paused`
- **트리거**: 사용자가 "일시중지" 클릭
- **조건**: Agent가 실행 중
- **액션**:
  - SIGTSTP (일시중지 신호) 전송
  - Checkpoint 생성

#### `paused` → `running`
- **트리거**: 사용자가 "재개" 클릭
- **조건**: Agent가 paused 상태
- **액션**:
  - SIGCONT (재개 신호) 전송

#### `running` → `completed`
- **트리거**: 모든 Phase 완료 및 승인
- **조건**: 최종 Review 승인됨
- **액션**:
  - SIGTERM (종료 신호) 전송
  - Agent 프로세스 종료
  - 리소스 정리

#### `running` → `failed`
- **트리거**: 치명적 에러 또는 취소
- **조건**: `[ERROR] type: fatal` 또는 사용자 취소
- **액션**:
  - SIGTERM (종료 신호) 전송
  - Checkpoint 생성
  - 에러 로그 저장
  - Agent 프로세스 종료

---

## 특수 상태 전이

### Rate Limit 처리

```
running
   │
   │ Rate Limit 감지
   ▼
paused (자동)
   │
   │ Checkpoint 생성
   │ Rate Limit reset 시간 대기
   ▼
running (자동 재개)
```

**처리**:
1. `[ERROR] type: recoverable, recovery: pause_and_retry` 파싱
2. SIGTSTP 전송
3. Checkpoint 생성
4. Rate Limit reset 시간 계산 (예: 60초 후)
5. 스케줄러에 재개 작업 등록
6. 60초 후 SIGCONT 전송 및 자동 재개

### Checkpoint 복구

```
시스템 재시작
   │
   │ Workspace 스캔
   ▼
Task 발견 (in_progress)
   │
   │ 최신 Checkpoint 로드
   ▼
Agent 생성 및 상태 복구
   │
   │ 대화 히스토리 복원
   │ 환경 변수 재주입
   ▼
running (자동 재개)
```

---

## 상태별 메타데이터

### Task 메타데이터

```typescript
interface TaskMetadata {
  status: TaskStatus;
  currentPhase: number | null;      // 1-4
  totalPhases: number;               // 작업 타입별 (create_app: 4)
  progress: number;                  // 0-100
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}
```

### Agent 메타데이터

```typescript
interface AgentMetadata {
  status: AgentStatus;
  currentPhase: number | null;
  currentStep: string | null;
  progress: number;                  // 0-100
  tokensUsed: number;
  blockedBy: string | null;          // 'dependency' | 'question' | 'review'
  lastUpdate: string;
  checkpoint: {
    lastSaved: string;
    autoSaveInterval: number;        // 10분 (600000ms)
  };
}
```

---

## 상태 전이 로그

모든 상태 전이는 로그로 기록됩니다:

```json
{
  "timestamp": "2024-02-15T10:30:00Z",
  "taskId": "task_abc123",
  "type": "state_transition",
  "from": "in_progress",
  "to": "waiting_review",
  "trigger": "PHASE_COMPLETE",
  "metadata": {
    "phase": 1,
    "deliverables": 9
  }
}
```

---

## 에러 처리 및 복구

### 복구 가능한 상태

| 상태 | 복구 방법 |
|------|----------|
| `waiting_dependency` | 의존성 제공 |
| `waiting_question` | 질문 응답 |
| `waiting_review` | Review 승인 또는 재작업 |
| `paused` | 재개 |
| `failed` | 재시도 (새 Task 생성) |

### 복구 불가능한 상태

| 상태 | 이유 |
|------|------|
| `completed` | 이미 완료됨 |

---

## 상태 쿼리

### API 예시

```bash
# Task 상태 조회
GET /api/tasks/{id}

# Response
{
  "id": "task_abc123",
  "status": "in_progress",
  "currentPhase": 1,
  "progress": 35
}

# Agent 상태 조회
GET /api/tasks/{id}/agent

# Response
{
  "status": "running",
  "currentPhase": 1,
  "currentStep": "03_users",
  "tokensUsed": 12500,
  "blockedBy": null
}
```

---

## 관련 문서

- **API 참조**: `/docs/API.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **용어집**: `/docs/GLOSSARY.md`
- **프로토콜**: `/docs/PROTOCOLS.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
