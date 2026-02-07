# 사용자 질문하기

## 개요

서브 에이전트가 작업 중 명확하지 않은 부분이나 사용자의 의사결정이 필요한 경우 질문하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **서브 에이전트 관점**에서 질문 방법을 다룹니다.
> **에이전트 관리자의 처리**는 `../../../agent-manager/docs/protocols/question.md` 참조

## 언제 질문하는가?

### 질문이 필요한 경우

1. **요구사항이 명확하지 않을 때**
   - Phase 1: 타겟 사용자, 핵심 기능, 비즈니스 모델 등이 불명확
   - Phase 2: 데이터 모델, API 설계에서 선택지가 여러 개
   - Phase 3: 기술 스택, 라이브러리 선택이 필요

2. **사용자의 선호도가 필요할 때**
   - 디자인 선택 (색상, 레이아웃, 스타일)
   - 기능 우선순위 결정
   - 성능 vs 개발 속도 트레이드오프

3. **확인이 필요할 때**
   - 중요한 결정 전 확인
   - 예상치 못한 문제 발생 시

### 질문하지 말아야 할 경우

1. **가이드 문서에 답이 있는 경우**
   - `guide/planning/*.md`를 먼저 확인
   - `guide/design/*.md`를 먼저 확인
   - `guide/development/*.md`를 먼저 확인

2. **일반적인 Best Practice가 있는 경우**
   - 예: Next.js 프로젝트에서 App Router 사용
   - 예: TypeScript에서 `any` 대신 적절한 타입 사용

3. **사소한 결정**
   - 변수명, 파일명 등
   - 임시로 진행 후 Review 때 피드백 받을 수 있는 내용

## 질문 프로토콜

### 프로토콜 형식

```
[USER_QUESTION]
category: <category>
question: <question>
options: [option1, option2, option3]
default: <default_value>
required: <true|false>
[/USER_QUESTION]
```

### 필드 정의

- **category**: 질문 카테고리 (아래 참조)
- **question**: 질문 내용 (명확하고 구체적으로)
- **options**: 선택지 (선택 질문인 경우, 없으면 생략)
- **default**: 기본값 (선택적 질문인 경우)
- **required**: 필수 여부 (`true` 또는 `false`)

### 카테고리

```typescript
type QuestionCategory =
  | 'business'       // 비즈니스 결정
  | 'clarification'  // 요구사항 명확화
  | 'choice'         // 선택지 제공
  | 'confirmation';  // 확인
```

## 질문 예시

### 1. 비즈니스 결정 (business)

```
[USER_QUESTION]
category: business
question: 어떤 수익 모델을 선호하시나요?
options: [구독 (월/연간), 프리미엄 (무료 + 유료), 광고 기반]
default: 프리미엄
required: false
[/USER_QUESTION]
```

### 2. 요구사항 명확화 (clarification)

```
[USER_QUESTION]
category: clarification
question: 타겟 사용자의 연령대는 어떻게 되나요?
required: true
[/USER_QUESTION]
```

### 3. 기술 선택 (choice)

```
[USER_QUESTION]
category: choice
question: 어떤 데이터베이스를 사용하시겠습니까?
options: [PostgreSQL, MySQL, SQLite, MongoDB]
default: PostgreSQL
required: false
[/USER_QUESTION]
```

### 4. 확인 (confirmation)

```
[USER_QUESTION]
category: confirmation
question: 인증 시스템으로 NextAuth.js를 사용하는 것이 맞나요?
options: [예, 아니오]
default: 예
required: false
[/USER_QUESTION]
```

## Phase별 질문 가이드

### Phase 1: Planning

**질문하기 좋은 시점**:
- `01_idea.md` 작성 전: 핵심 아이디어 명확화
- `02_market.md` 작성 전: 시장 범위 확인
- `03_persona.md` 작성 전: 타겟 사용자 확정
- `05_business_model.md` 작성 전: 수익 모델 결정

**예시**:
```
[USER_QUESTION]
category: clarification
question: 이 앱의 주요 타겟 사용자는 누구인가요? (예: 학생, 직장인, 프리랜서)
required: true
[/USER_QUESTION]
```

### Phase 2: Design

**질문하기 좋은 시점**:
- `01_data_model.md` 작성 시: 데이터 구조 결정
- `02_api.md` 작성 시: API 설계 선택
- `05_architecture.md` 작성 시: 아키텍처 패턴 선택

**예시**:
```
[USER_QUESTION]
category: choice
question: 사용자 인증 방식은 어떻게 하시겠습니까?
options: [이메일/비밀번호, 소셜 로그인 (Google/GitHub), 둘 다 지원]
default: 둘 다 지원
required: false
[/USER_QUESTION]
```

### Phase 3: Development

**질문하기 좋은 시점**:
- 패키지 설치 전: 버전 확인
- UI 라이브러리 선택 시
- 에러 처리 방식 결정 시

**예시**:
```
[USER_QUESTION]
category: choice
question: UI 컴포넌트 라이브러리는 무엇을 사용하시겠습니까?
options: [shadcn/ui, Radix UI, Headless UI, MUI, 없음 (직접 구현)]
default: shadcn/ui
required: false
[/USER_QUESTION]
```

## 질문 작성 Best Practices

### 좋은 질문

1. **명확하고 구체적**
   ```
   ✅ 타겟 사용자의 연령대는 어떻게 되나요? (예: 10대, 20대, 30대 이상)
   ❌ 사용자에 대해 알려주세요.
   ```

2. **선택지가 명확**
   ```
   ✅ options: [PostgreSQL, MySQL, SQLite]
   ❌ options: [SQL, NoSQL, 기타]
   ```

3. **컨텍스트 제공**
   ```
   ✅ question: 이 앱은 실시간 업데이트가 필요한가요? (예: 채팅, 알림)
   ❌ question: 실시간이 필요한가요?
   ```

### 나쁜 질문

1. **너무 포괄적**
   ```
   ❌ 이 프로젝트에 대해 뭐든 말씀해주세요.
   ```

2. **Yes/No로만 답할 수 있는 질문 (구체적이지 않음)**
   ```
   ❌ 데이터베이스가 필요한가요?
   ✅ 어떤 데이터베이스를 사용하시겠습니까? [PostgreSQL, MySQL, SQLite, 없음]
   ```

3. **이미 가이드에 답이 있는 질문**
   ```
   ❌ 기획 단계에서 무엇을 해야 하나요?
   (→ guide/planning/README.md 참조)
   ```

## 답변 수신

### 답변 대기

질문을 출력하면:
1. 에이전트가 자동으로 **일시 중지**됩니다
2. Task 상태가 `waiting_question`으로 변경됩니다
3. 웹 UI에 질문이 표시됩니다

### 답변 수신

사용자가 답변하면:
1. 답변이 stdin으로 전달됩니다
2. 에이전트가 **재개**됩니다
3. 답변을 읽고 작업을 계속합니다

**예시**:
```typescript
// 답변 읽기 (의사 코드)
const answer = readUserAnswer(); // stdin에서 읽음

if (answer === "PostgreSQL") {
  // PostgreSQL 기준으로 진행
  generateDataModel("PostgreSQL");
}
```

### 타임아웃

- **선택적 질문 (required: false)**: 1시간 후 기본값으로 자동 진행
- **필수 질문 (required: true)**: 답변이 올 때까지 대기

## 질문 플로우

```
서브 에이전트          에이전트 관리자          웹 서버          사용자
    |                        |                    |               |
    |--- [USER_QUESTION] --->|                    |               |
    |                        |--- 감지 & 파싱 --->|               |
    |                        |                    |--- 알림 ----->|
    |                        |                    |               |
    |<--- 일시 중지 ---------|                    |               |
    |                        |                    |               |
    |                        |                    |<--- 답변 -----|
    |                        |<--- 답변 전달 -----|               |
    |<--- 답변 (stdin) ------|                    |               |
    |                        |                    |               |
    |--- 작업 재개 --------->|                    |               |
```

## 테스트

### 수동 테스트

Phase 1 진행 중 다음과 같이 질문 출력:

```
Phase 1: Planning

guide/planning/03_persona.md를 참조하여 사용자 페르소나를 정의합니다.

[USER_QUESTION]
category: clarification
question: 주요 타겟 사용자는 누구인가요?
required: true
[/USER_QUESTION]

(답변 대기 중...)
```

에이전트 관리자가 감지하여 일시 중지하고, 사용자 답변 후 재개됩니다.

## 주의사항

### 질문 남용 방지

- **Phase당 3개 이하**의 질문 권장
- 가능한 한 가이드 문서와 Best Practice로 자율 진행
- 정말 중요한 결정만 질문

### 질문 타이밍

- **Phase 초반**에 질문하여 전체 방향 결정
- Phase 중간이나 후반에 질문하면 재작업 발생 가능

### 필수 vs 선택적

- **필수 (required: true)**: 답변 없이는 진행 불가능한 경우만
- **선택적 (required: false)**: 기본값으로 진행 가능한 경우

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../../../agent-manager/docs/protocols/question.md`** - 질문 처리 (양방향 동기화)
2. **`../../../claude-code-server/docs/api/questions-api.md`** - Questions API
3. **`../../CLAUDE.md`** - 서브 에이전트 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우

## 다음 단계

- **Agent Manager - Question Protocol**: `../../../agent-manager/docs/protocols/question.md`
- **Questions API**: `../../../claude-code-server/docs/api/questions-api.md`
- **Phase Completion**: `phase-completion.md`

## 관련 문서

- **Agent Manager - Question Protocol**: `../../../agent-manager/docs/protocols/question.md`
- **Questions API**: `../../../claude-code-server/docs/api/questions-api.md`
- **Dependency Request**: `dependency-request.md`
- **Phase Completion**: `phase-completion.md`
