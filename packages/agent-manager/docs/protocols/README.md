# 프로토콜 처리

에이전트 출력에서 프로토콜 메시지를 감지하고 처리하는 방법을 설명합니다.

## 📄 문서 목록

### `dependency.md`
**언제 읽나요?** 의존성 요청을 처리할 때

**내용**:
- `[DEPENDENCY_REQUEST]` 패턴 감지
- 파싱 로직
- 에이전트 일시 중지
- 웹 서버 알림
- 제공 후 재개

**프로토콜 형식**:
```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file
name: OPENAI_API_KEY
description: Required for AI features
required: true
[/DEPENDENCY_REQUEST]
```

### `question.md`
**언제 읽나요?** 사용자 질문을 처리할 때

**내용**:
- `[USER_QUESTION]` 패턴 감지
- 파싱 로직
- 에이전트 일시 중지
- 사용자 응답 대기
- 답변 전달 및 재개

**프로토콜 형식**:
```
[USER_QUESTION]
category: business | clarification | choice
question: What revenue model?
options: [...]
[/USER_QUESTION]
```

### `phase-completion.md`
**언제 읽나요?** Phase 완료를 처리할 때

**내용**:
- `=== PHASE N COMPLETE ===` 패턴 감지
- 산출물 수집
- 에이전트 일시 중지
- 리뷰 생성
- 승인 후 다음 Phase 시작

**프로토콜 형식**:
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- ...
```

### `error.md`
**언제 읽나요?** 에러를 처리할 때

**내용**:
- `[ERROR]` 패턴 감지
- 에러 타입 분류
- Checkpoint 생성
- 복구 시도 또는 사용자 알림

**프로토콜 형식**:
```
[ERROR]
type: execution_failed | validation_error
message: Error description
details: Details
[/ERROR]
```

## 🎯 프로토콜 처리 흐름

```
1. 에이전트 출력 수신
   ↓
2. 프로토콜 패턴 매칭
   ↓
3. 프로토콜 감지됨
   ├─ Dependency → dependency.md 참조
   ├─ Question → question.md 참조
   ├─ Phase Complete → phase-completion.md 참조
   └─ Error → error.md 참조
   ↓
4. 해당 처리 로직 실행
   ↓
5. 에이전트 제어 (일시중지/재개)
```

## 🔍 빠른 참조

### 의존성 요청 감지
→ `dependency.md` → "패턴 매칭" 섹션

### 질문 감지
→ `question.md` → "파싱 로직" 섹션

### Phase 완료 감지
→ `phase-completion.md` → "산출물 수집" 섹션

### 에러 감지
→ `error.md` → "에러 분류" 섹션

## 💡 구현 패턴

### 프로토콜 파서 구조

```typescript
// 모든 프로토콜에 공통 패턴
function parseProtocol(output: string): Protocol | null {
  // 1. 패턴 매칭
  const match = output.match(/\[PROTOCOL\]([\s\S]*?)\[\/PROTOCOL\]/);
  if (!match) return null;

  // 2. 내용 파싱
  const content = match[1];
  const fields = extractFields(content);

  // 3. 검증
  if (!validate(fields)) return null;

  // 4. 반환
  return { type: 'protocol', data: fields };
}

// 각 프로토콜별로 구체적인 파서 구현
```

### 프로토콜 핸들러 구조

```typescript
function handleProtocol(taskId: string, protocol: Protocol) {
  // 1. 에이전트 일시 중지
  pauseAgent(taskId);

  // 2. 상태 업데이트
  updateAgentStatus(taskId, {
    status: 'waiting_*',
    blockedBy: '...'
  });

  // 3. 웹 서버 알림
  notifyWebServer(taskId, protocol);

  // 4. 응답 대기
  // (비동기적으로 처리)
}

function provideResponse(taskId: string, response: any) {
  // 1. 응답 처리
  processResponse(taskId, response);

  // 2. 에이전트 재개
  resumeAgent(taskId);

  // 3. 상태 업데이트
  updateAgentStatus(taskId, { status: 'running' });
}
```

## 📊 프로토콜 우선순위

여러 프로토콜이 동시에 감지될 경우 처리 순서:

```
1. ERROR (가장 높음)
   → 즉시 처리

2. PHASE_COMPLETE
   → 현재 Phase 완료 처리

3. DEPENDENCY_REQUEST
   → 실행 차단

4. USER_QUESTION
   → 실행 차단

5. 일반 로그 (가장 낮음)
   → 단순 기록
```

## 🔗 관련 문서

- **생명주기**: `../lifecycle/` - 에이전트 제어
- **모니터링**: `../monitoring/` - 상태 추적
- **Checkpoint**: `../checkpoint/` - 에러 시 상태 저장
- **웹 서버**: `../../../claude-code-server/docs/features/protocol-parsing.md`
