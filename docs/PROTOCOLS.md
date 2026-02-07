# Platform-Agent Communication Protocols

이 문서는 Sub-Agent와 Platform 간의 모든 통신 프로토콜을 정의합니다.

---

## 개요

### 통신 방식

Sub-Agent는 **stdout에 구조화된 텍스트**를 출력하여 Platform과 통신합니다.

```
Sub-Agent (stdout) → Agent Manager (parser) → Web Server (UI)
```

### 프로토콜 형식

모든 프로토콜은 다음 구조를 따릅니다:

```
[PROTOCOL_NAME]
key: value
key: value
...
[/PROTOCOL_NAME]
```

### 파싱 규칙

1. **태그 감지**: `[PROTOCOL_NAME]`과 `[/PROTOCOL_NAME]` 사이의 내용 추출
2. **키-값 파싱**: 각 줄을 `key: value` 형식으로 파싱
3. **멀티라인 지원**: 값이 여러 줄인 경우, 들여쓰기로 구분
4. **검증**: 필수 필드 존재 여부 확인

---

## 1. DEPENDENCY_REQUEST (의존성 요청)

### 목적

Sub-Agent가 외부 리소스(API 키, 환경 변수, 서비스 등)를 요청할 때 사용합니다.

### 형식

```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file | permission | package
name: DEPENDENCY_NAME
description: Human-readable description
required: true | false
default: default_value (optional)
[/DEPENDENCY_REQUEST]
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | enum | ✅ | 의존성 타입 (아래 참조) |
| `name` | string | ✅ | 의존성 식별자 (환경 변수명, 패키지명 등) |
| `description` | string | ✅ | 사용자에게 보여질 설명 |
| `required` | boolean | ✅ | 필수 여부 (`true` / `false`) |
| `default` | string | ❌ | 기본값 (optional이면 제공) |

### 의존성 타입

#### `api_key` - API 키
```
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: OpenAI API key for GPT-4 integration
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
- 사용자에게 API 키 입력 요청
- 암호화하여 저장
- 환경 변수로 Agent에 주입

#### `env_variable` - 환경 변수
```
[DEPENDENCY_REQUEST]
type: env_variable
name: DATABASE_URL
description: PostgreSQL connection string
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
- 사용자에게 값 입력 요청
- 환경 변수로 Agent에 주입

#### `service` - 외부 서비스
```
[DEPENDENCY_REQUEST]
type: service
name: stripe
description: Payment processing via Stripe
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
- 서비스 연동 UI 표시
- 인증/설정 후 관련 환경 변수 주입

#### `file` - 파일
```
[DEPENDENCY_REQUEST]
type: file
name: logo.png
description: Company logo for the app
required: false
default: placeholder.png
[/DEPENDENCY_REQUEST]
```

**처리**:
- 파일 업로드 UI 표시
- Workspace에 저장
- 파일 경로를 Agent에 전달

#### `permission` - 권한
```
[DEPENDENCY_REQUEST]
type: permission
name: file_system_write
description: Permission to write files to disk
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
- 사용자에게 권한 승인 요청
- 승인 여부를 Agent에 전달

#### `package` - NPM 패키지 또는 라이브러리
```
[DEPENDENCY_REQUEST]
type: package
name: @supabase/supabase-js
description: Supabase client library
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
- 패키지 설치 확인 요청
- 설치 승인 시 `package.json`에 추가

### 처리 흐름

```
1. Sub-Agent가 DEPENDENCY_REQUEST 출력
2. Agent Manager가 파싱 및 검증
3. Agent 일시중지 (SIGTSTP)
4. Checkpoint 생성
5. Web Server에 알림 (SSE)
6. 사용자가 웹 UI에서 의존성 제공
7. 값 암호화 및 저장
8. 환경 변수로 Agent에 주입
9. Agent 재개 (SIGCONT)
10. Agent가 환경 변수 사용
```

### 예시 코드 (Sub-Agent)

```javascript
// Phase 3에서 Stripe 연동이 필요한 경우
console.log(`
[DEPENDENCY_REQUEST]
type: api_key
name: STRIPE_SECRET_KEY
description: Stripe API secret key for payment processing
required: true
[/DEPENDENCY_REQUEST]
`);

// 이후 재개되면 환경 변수로 사용 가능
const stripeKey = process.env.STRIPE_SECRET_KEY;
```

---

## 2. USER_QUESTION (사용자 질문)

### 목적

요구사항이 불명확하거나 선택지가 필요한 경우 사용자에게 질문합니다.

### 형식

```
[USER_QUESTION]
category: business | clarification | choice | confirmation
question: What is your question?
options:
  - Option 1
  - Option 2
  - Option 3
default: Option 1 (optional)
required: true | false
[/USER_QUESTION]
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `category` | enum | ✅ | 질문 카테고리 (아래 참조) |
| `question` | string | ✅ | 질문 내용 |
| `options` | array | ❌ | 선택지 (choice인 경우 필수) |
| `default` | string | ❌ | 기본 선택지 |
| `required` | boolean | ✅ | 필수 응답 여부 |

### 질문 카테고리

#### `business` - 비즈니스 결정
```
[USER_QUESTION]
category: business
question: What is your preferred revenue model?
options:
  - Subscription (monthly/yearly)
  - Freemium (free + paid tiers)
  - One-time purchase
  - Ad-supported
default: Subscription (monthly/yearly)
required: true
[/USER_QUESTION]
```

#### `clarification` - 요구사항 명확화
```
[USER_QUESTION]
category: clarification
question: Should users be able to edit their profiles?
options:
  - Yes, full editing
  - Yes, limited fields only
  - No, read-only
required: true
[/USER_QUESTION]
```

#### `choice` - 기술적 선택
```
[USER_QUESTION]
category: choice
question: Which database would you prefer?
options:
  - PostgreSQL (recommended for production)
  - MySQL
  - SQLite (for simplicity)
default: PostgreSQL (recommended for production)
required: true
[/USER_QUESTION]
```

#### `confirmation` - 확인
```
[USER_QUESTION]
category: confirmation
question: Proceed with generating authentication system using Supabase Auth?
options:
  - Yes
  - No, use a different auth system
default: Yes
required: true
[/USER_QUESTION]
```

### 처리 흐름

```
1. Sub-Agent가 USER_QUESTION 출력
2. Agent Manager가 파싱 및 검증
3. Agent 일시중지 (SIGTSTP)
4. Checkpoint 생성
5. Web Server에 알림 (SSE)
6. 사용자가 웹 UI에서 질문 응답
7. 응답 저장
8. 응답을 stdin으로 Agent에 전달
9. Agent 재개 (SIGCONT)
10. Agent가 응답 활용
```

### 응답 형식 (stdin)

```json
{
  "type": "question_answer",
  "questionId": "q_abc123",
  "answer": "Subscription (monthly/yearly)"
}
```

### 예시 코드 (Sub-Agent)

```javascript
// Phase 1에서 수익 모델이 불명확한 경우
console.log(`
[USER_QUESTION]
category: business
question: What is your preferred revenue model?
options:
  - Subscription (monthly/yearly)
  - Freemium (free + paid tiers)
  - One-time purchase
default: Subscription (monthly/yearly)
required: true
[/USER_QUESTION]
`);

// stdin에서 응답 읽기
const answer = await readStdinAnswer(); // "Subscription (monthly/yearly)"
```

### 제한 사항

- **Phase당 최대 3개 질문** 권장
- 너무 많은 질문은 사용자 경험 저하
- 가능한 한 기본값 제공

---

## 3. PHASE_COMPLETE (Phase 완료)

### 목적

현재 Phase의 작업이 완료되었음을 알립니다.

### 형식

```
=== PHASE N COMPLETE ===
```

또는 상세 버전:

```
=== PHASE 1 COMPLETE ===
Phase: Planning
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_users.md
- docs/planning/04_features.md
- docs/planning/05_flows.md
- docs/planning/06_screens.md
- docs/planning/07_backend.md
- docs/planning/08_tech.md
- docs/planning/09_roadmap.md
```

### 처리 흐름

```
1. Sub-Agent가 PHASE_COMPLETE 출력
2. Agent Manager가 감지
3. Agent 일시중지 (SIGTSTP)
4. Checkpoint 생성
5. 산출물 수집 (Workspace 스캔)
6. 검증 Agent 실행
7. 검증 리포트 생성
8. [합격] → 리뷰 생성 → 사용자 승인 대기
9. [불합격] → 재작업 (최대 3회)
10. [승인] → 다음 Phase 시작
```

### Phase 번호

| Phase | 이름 | 산출물 |
|-------|------|--------|
| 1 | Planning (기획) | `docs/planning/*.md` (9개) |
| 2 | Design (설계) | `docs/design/*.md` (5개) |
| 3 | Development (개발) | `src/**/*` (코드 프로젝트) |
| 4 | Testing (테스트) | 테스트 결과 |

### 예시 코드 (Sub-Agent)

```javascript
// Phase 1 완료 후
console.log('=== PHASE 1 COMPLETE ===');
console.log('Phase: Planning');
console.log('Documents created:');
console.log('- docs/planning/01_idea.md');
console.log('- docs/planning/02_market.md');
// ...
console.log('- docs/planning/09_roadmap.md');
```

---

## 4. ERROR (에러 보고)

### 목적

복구 가능하거나 치명적인 에러를 보고합니다.

### 형식

```
[ERROR]
type: recoverable | fatal
message: Brief error message
details: Detailed error information (optional)
recovery: pause_and_retry | checkpoint_and_fail | notify_user
[/ERROR]
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | enum | ✅ | `recoverable` (복구 가능) / `fatal` (치명적) |
| `message` | string | ✅ | 간단한 에러 메시지 |
| `details` | string | ❌ | 상세 에러 정보 |
| `recovery` | enum | ✅ | 복구 전략 |

### 에러 타입

#### `recoverable` - 복구 가능한 에러
```
[ERROR]
type: recoverable
message: Rate limit exceeded
details: API rate limit hit, will retry after cooldown
recovery: pause_and_retry
[/ERROR]
```

**처리**:
- Checkpoint 생성
- 일시중지
- Rate Limit reset 후 자동 재개

#### `fatal` - 치명적 에러
```
[ERROR]
type: fatal
message: Invalid guide document structure
details: guide/planning/01_idea.md is missing required sections
recovery: checkpoint_and_fail
[/ERROR]
```

**처리**:
- Checkpoint 생성
- Task 실패 처리
- 사용자에게 알림

### 복구 전략

| 전략 | 설명 |
|------|------|
| `pause_and_retry` | 일시중지 후 조건 충족 시 자동 재시도 |
| `checkpoint_and_fail` | Checkpoint 생성 후 Task 실패 처리 |
| `notify_user` | 사용자에게 알림 후 수동 개입 대기 |

### 처리 흐름

```
1. Sub-Agent가 ERROR 출력
2. Agent Manager가 파싱
3. 에러 타입에 따라 처리:
   - recoverable → Checkpoint → 재시도
   - fatal → Checkpoint → Task 실패
4. 사용자에게 알림
5. 로그 기록
```

### 예시 코드 (Sub-Agent)

```javascript
try {
  // 작업 수행
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    console.log(`
[ERROR]
type: recoverable
message: Rate limit exceeded
details: Claude API rate limit hit (${error.limit} tokens/min)
recovery: pause_and_retry
[/ERROR]
    `);
  } else {
    console.log(`
[ERROR]
type: fatal
message: ${error.message}
details: ${error.stack}
recovery: checkpoint_and_fail
[/ERROR]
    `);
  }
}
```

---

## 프로토콜 우선순위

Agent Manager는 다음 우선순위로 프로토콜을 처리합니다:

```
1. ERROR (최우선)
   → 즉시 처리 및 복구 시도

2. PHASE_COMPLETE
   → Phase 종료 처리

3. DEPENDENCY_REQUEST
   → 실행 차단

4. USER_QUESTION
   → 실행 차단

5. 일반 로그
   → 기록만
```

---

## 프로토콜 검증

### Agent Manager의 검증 규칙

1. **태그 완전성**: 열기/닫기 태그 쌍 확인
2. **필수 필드**: 각 프로토콜의 required 필드 존재 확인
3. **타입 검증**: enum 값이 허용된 값인지 확인
4. **포맷 검증**: 키-값 형식 준수 확인

### 검증 실패 시

```
[ERROR]
type: fatal
message: Invalid protocol format
details: DEPENDENCY_REQUEST missing required field 'type'
recovery: notify_user
[/ERROR]
```

---

## 프로토콜 확장

새로운 프로토콜 추가 시:

1. 이 문서에 명세 추가
2. Agent Manager에 파서 구현
3. Web Server에 UI 구현
4. Sub-Agent 가이드 업데이트
5. 테스트 케이스 작성

---

## 관련 문서

- **Sub-Agent 가이드**: `/packages/sub-agent/CLAUDE.md`
- **Agent Manager 가이드**: `/packages/agent-manager/CLAUDE.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
