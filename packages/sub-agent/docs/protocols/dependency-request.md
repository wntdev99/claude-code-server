# 의존성 요청 프로토콜

## 개요

작업 수행 중 필요한 의존성(API 키, 환경 변수, 파일 등)을 요청하는 방법을 설명합니다.

> **중요**: 의존성은 **실제로 필요한 시점**에만 요청하세요.
> Phase 1, 2에서는 일반적으로 불필요합니다.

## 언제 요청하나?

### ✅ 요청해야 할 때

**Phase 3 (개발) 중 실제 통합 시**:
```
✅ API 통합 시
   → OpenAI API, Stripe API 등 실제 사용

✅ 데이터베이스 연결 시
   → DATABASE_URL, DB 비밀번호 등

✅ 외부 서비스 연결 시
   → AWS 자격증명, GitHub 토큰 등

✅ 특정 파일이 필요할 때
   → 설정 파일, 데이터 파일 등
```

### ❌ 요청하지 말아야 할 때

```
❌ Phase 1 (기획) 중
   → 의존성 없이 문서만 작성

❌ Phase 2 (설계) 중
   → 의존성 없이 설계 문서만 작성

❌ 예제/데모 코드
   → .env.example로 충분

❌ 추후 필요할 것 같은 것
   → 미리 요청하지 말 것
```

## 프로토콜 형식

### 기본 구조

```
[DEPENDENCY_REQUEST]
type: [의존성 타입]
name: [의존성 이름]
description: [설명]
required: [true/false]
[/DEPENDENCY_REQUEST]
```

### 의존성 타입

```typescript
type DependencyType =
  | 'api_key'        // API 키
  | 'env_variable'   // 환경 변수
  | 'service'        // 외부 서비스 연결 정보
  | 'file'           // 파일 경로
  | 'permission'     // 권한
  | 'package';       // npm 패키지
```

## 사용 예시

### API 키 요청

```
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for OpenAI GPT-4 API integration in AI chat feature
required: true
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- Phase 3 (개발) 중 AI 기능 구현 시
- 실제 OpenAI API를 호출하는 코드 작성 시

### 환경 변수 요청

```
[DEPENDENCY_REQUEST]
type: env_variable
name: DATABASE_URL
description: PostgreSQL database connection string for production deployment
required: true
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- Phase 3 (개발) 중 데이터베이스 연결 설정 시
- Prisma 또는 다른 ORM 설정 시

### 서비스 URL 요청

```
[DEPENDENCY_REQUEST]
type: service
name: REDIS_URL
description: Redis connection URL for caching and session management
required: false
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- Phase 3 (개발) 중 캐싱 기능 구현 시
- 선택적 기능이므로 `required: false`

### 파일 경로 요청

```
[DEPENDENCY_REQUEST]
type: file
name: GOOGLE_CREDENTIALS_PATH
description: Path to Google Cloud service account credentials JSON file
required: true
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- Phase 3 (개발) 중 Google Cloud API 통합 시
- 서비스 계정 인증이 필요할 때

### 권한 요청

```
[DEPENDENCY_REQUEST]
type: permission
name: ENABLE_ANALYTICS
description: Permission to enable Google Analytics tracking
required: false
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- 사용자의 명시적 동의가 필요한 기능
- Analytics, 외부 서비스 연동 등

### npm 패키지 요청

```
[DEPENDENCY_REQUEST]
type: package
name: @stripe/stripe-js
description: Stripe JavaScript SDK for payment processing
required: true
[/DEPENDENCY_REQUEST]
```

**사용 시나리오**:
- 특정 npm 패키지가 반드시 필요할 때
- 일반적으로는 직접 package.json에 추가

## 작성 규칙

### 1. 명확한 이름

```
✅ 좋은 예:
name: OPENAI_API_KEY
name: DATABASE_URL
name: STRIPE_SECRET_KEY

❌ 나쁜 예:
name: key
name: api
name: config
```

### 2. 상세한 설명

```
✅ 좋은 예:
description: Required for OpenAI GPT-4 API integration in AI chat feature.
Get your API key from https://platform.openai.com/api-keys

❌ 나쁜 예:
description: OpenAI key
description: For API
```

### 3. Required 판단

```
✅ required: true
  - 앱의 핵심 기능에 필수
  - 없으면 앱이 동작하지 않음

✅ required: false
  - 선택적 기능
  - 없어도 앱의 기본 기능은 동작
```

## 워크플로우

### 1. 의존성 요청

```
서브 에이전트
    ↓
프로토콜 출력
    ↓
에이전트 관리자 감지
    ↓
에이전트 일시 중지
    ↓
웹 서버에 알림
    ↓
사용자에게 표시
```

### 2. 의존성 제공

```
사용자가 값 입력
    ↓
웹 서버에서 암호화
    ↓
에이전트 관리자로 전달
    ↓
서브 에이전트에 주입
    ↓
에이전트 재개
    ↓
작업 계속
```

### 3. 의존성 사용

```typescript
// .env 파일에서 사용
// Phase 3 (개발) 중 생성된 프로젝트 내

// .env.example (템플릿)
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

// .env (실제 값, .gitignore에 포함)
OPENAI_API_KEY=sk-...실제값...
DATABASE_URL=postgresql://...실제값...

// 코드에서 사용
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

## 타이밍 가이드

### create_app 워크플로우 예시

```
Phase 1: Planning (기획)
  → ❌ 의존성 요청 없음
  → 문서만 작성

Phase 2: Design (설계)
  → ❌ 의존성 요청 없음
  → 설계 문서만 작성

Phase 3: Development (개발)

  Step 1: 프로젝트 초기화
    → ❌ 의존성 요청 없음
    → npm init, 기본 구조 생성

  Step 2-3: 기본 컴포넌트
    → ❌ 의존성 요청 없음
    → UI 컴포넌트, 라우팅 구현

  Step 4: API 통합
    → ✅ 여기서 의존성 요청!
    → 실제 API 키가 필요한 시점

    [DEPENDENCY_REQUEST]
    type: api_key
    name: OPENAI_API_KEY
    description: Required for AI features
    required: true
    [/DEPENDENCY_REQUEST]

  Step 5-6: 완성 및 테스트
    → 추가 의존성 필요 시만 요청

Phase 4: Testing (테스트)
  → ❌ 일반적으로 의존성 요청 없음
  → 이미 제공된 의존성으로 테스트
```

## Best Practices

### ✅ 좋은 습관

```
1. 정확한 타이밍
   → 실제로 필요한 시점에만 요청

2. 명확한 설명
   → 왜 필요한지, 어디서 얻는지 설명

3. 적절한 required 판단
   → 핵심 기능이면 true, 선택이면 false

4. 하나씩 요청
   → 한 번에 하나의 의존성만 요청

5. .env.example 제공
   → 의존성 형식을 보여주는 예시 파일
```

### ❌ 피해야 할 실수

```
1. 미리 요청
   → Phase 1, 2에서 요청하지 말 것

2. 한 번에 여러 개
   → 하나씩 순차적으로 요청

3. 불명확한 설명
   → 구체적인 설명 필수

4. 잘못된 타입
   → 적절한 타입 선택

5. 하드코딩
   → 의존성 값을 코드에 직접 쓰지 말 것
```

## 예제: 실제 사용 시나리오

### 시나리오: Todo 앱에 OpenAI 기능 추가

```markdown
# Phase 3, Step 4: AI 기능 구현

## 작업 내용

사용자가 Todo를 입력하면 AI가 자동으로 카테고리를 분류하는 기능 구현.

## 의존성 요청

[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for OpenAI GPT-4 API to automatically categorize todo items. Get your API key from https://platform.openai.com/api-keys. The app will use gpt-4-turbo model for classification.
required: true
[/DEPENDENCY_REQUEST]

## 구현

일시 중지하고 API 키를 기다립니다...
```

**의존성 제공 후**:

```typescript
// lib/ai/categorize.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function categorizeTodo(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'Categorize the todo item into: Work, Personal, Shopping, Health, Other',
      },
      {
        role: 'user',
        content: text,
      },
    ],
  });

  return response.choices[0].message.content || 'Other';
}
```

## 에러 처리

### 의존성 거부

사용자가 의존성 제공을 거부하면:

```
- required: true → Task 실패
- required: false → 빈 값으로 계속
```

### 의존성 타임아웃

1시간 동안 응답 없으면:

```
- required: true → Task 실패
- required: false → 빈 값으로 계속
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../../../agent-manager/docs/protocols/dependency.md`** - 프로토콜 처리 (양방향 동기화)
2. **`../workflows/create-app.md`** - 의존성 요청 타이밍
3. **`../deliverables/code.md`** - 의존성 사용 규칙
4. **`../../CLAUDE.md`** - 프로토콜 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../workflows/modify-app.md`** - modify_app 워크플로우

## 다음 단계

- **사용자 질문**: `user-question.md` - 사용자에게 질문하는 방법
- **Phase 완료**: `phase-completion.md` - Phase 완료 신호 보내기
- **에러 보고**: `error-reporting.md` - 에러 보고 방법

## 관련 문서

- **Agent Manager - Dependency Protocol**: `../../../agent-manager/docs/protocols/dependency.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Deliverables - Code**: `../deliverables/code.md`
- **Web Server - Dependencies API**: `../../../claude-code-server/docs/api/dependencies-api.md`
