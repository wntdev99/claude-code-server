# Platform-Agent Communication Protocols

이 문서는 Sub-Agent와 Platform 간의 모든 통신 프로토콜을 정의합니다.

---

## ⚠️ IMPORTANT: Deprecated Protocol Notice

> **🚫 WARNING: The DEPENDENCY_REQUEST protocol (Section 1) is DEPRECATED.**
>
> **Use the Settings System instead**: See [SETTINGS_SYSTEM.md](SETTINGS_SYSTEM.md) for the recommended approach.
>
> **Why deprecated**:
> - Settings System provides better UX with upfront configuration
> - Avoids agent pause/resume cycles during execution
> - Simpler architecture with centralized settings management
>
> **Section 1 (DEPENDENCY_REQUEST)** is kept for historical reference only. **DO NOT implement this protocol in new code**.

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

## 1. DEPENDENCY_REQUEST (의존성 요청) - ⚠️ DEPRECATED

> **🚫 This protocol is DEPRECATED. Use Settings System instead.**
>
> See [SETTINGS_SYSTEM.md](SETTINGS_SYSTEM.md) for the recommended approach.
>
> This section is kept for historical reference and backward compatibility only.

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

### Answer Validation

#### 문제 상황

사용자가 제공된 옵션 목록에 없는 답변을 제출하는 경우:

```
Agent 질문:
options:
  - PostgreSQL (recommended for production)
  - MySQL
  - SQLite (for simplicity)

사용자 답변: "MongoDB"  ❌ (옵션에 없음)
```

**문제점**:
- Agent가 예상하지 못한 답변을 받아 에러 발생 가능
- 부정확한 의사결정으로 이어질 수 있음
- 사용자 타이핑 실수 (예: "Postgre" 대신 "PostgreSQL")

#### 해결 방안

서버 측에서 사용자 답변을 Agent에 전달하기 전에 검증:

```typescript
// packages/agent-manager/src/protocols/AnswerValidator.ts

/**
 * USER_QUESTION 답변 검증
 */
export class AnswerValidator {
  /**
   * 답변이 유효한 옵션인지 확인
   */
  validateAnswer(
    answer: string,
    question: UserQuestion
  ): ValidationResult {
    // 1. 옵션이 없는 질문 (자유 형식)
    if (!question.options || question.options.length === 0) {
      return {
        valid: true,
        normalizedAnswer: answer.trim(),
      };
    }

    // 2. 정확히 일치하는 옵션 찾기
    const exactMatch = question.options.find(
      (opt) => opt === answer
    );

    if (exactMatch) {
      return {
        valid: true,
        normalizedAnswer: exactMatch,
      };
    }

    // 3. 대소문자 무시 매칭
    const caseInsensitiveMatch = question.options.find(
      (opt) => opt.toLowerCase() === answer.toLowerCase()
    );

    if (caseInsensitiveMatch) {
      return {
        valid: true,
        normalizedAnswer: caseInsensitiveMatch,
        warning: 'Answer matched with different casing',
      };
    }

    // 4. 퍼지 매칭 (타이핑 실수 감지)
    const fuzzyMatch = this.findFuzzyMatch(answer, question.options);

    if (fuzzyMatch) {
      return {
        valid: false,
        error: `Invalid answer. Did you mean "${fuzzyMatch.suggestion}"?`,
        suggestion: fuzzyMatch.suggestion,
        similarity: fuzzyMatch.similarity,
      };
    }

    // 5. 매칭 실패
    return {
      valid: false,
      error: `Invalid answer. Please choose from: ${question.options.join(', ')}`,
    };
  }

  /**
   * 퍼지 매칭 (Levenshtein distance 기반)
   */
  private findFuzzyMatch(
    input: string,
    options: string[],
    threshold: number = 0.7
  ): FuzzyMatch | null {
    let bestMatch: FuzzyMatch | null = null;

    for (const option of options) {
      const similarity = this.calculateSimilarity(
        input.toLowerCase(),
        option.toLowerCase()
      );

      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            suggestion: option,
            similarity,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * 문자열 유사도 계산 (0.0 ~ 1.0)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    return 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

interface ValidationResult {
  valid: boolean;
  normalizedAnswer?: string;
  error?: string;
  warning?: string;
  suggestion?: string;
  similarity?: number;
}

interface FuzzyMatch {
  suggestion: string;
  similarity: number;
}
```

#### API 엔드포인트 구현

```typescript
// app/api/questions/[id]/answer/route.ts

import { AnswerValidator } from '@/lib/AnswerValidator';

/**
 * 질문 응답 API
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { answer } = await req.json();

  // 1. 질문 조회
  const question = await db.question.findUnique({
    where: { id: params.id },
  });

  if (!question) {
    return Response.json(
      { success: false, error: 'Question not found' },
      { status: 404 }
    );
  }

  // 2. 답변 검증
  const validator = new AnswerValidator();
  const validation = validator.validateAnswer(answer, question);

  if (!validation.valid) {
    // 검증 실패: 사용자에게 에러 반환
    return Response.json(
      {
        success: false,
        error: validation.error,
        suggestion: validation.suggestion,
        similarity: validation.similarity,
      },
      { status: 400 }
    );
  }

  // 3. 경고가 있으면 로깅
  if (validation.warning) {
    console.warn(`⚠️  Answer validation warning: ${validation.warning}`, {
      questionId: params.id,
      originalAnswer: answer,
      normalizedAnswer: validation.normalizedAnswer,
    });
  }

  // 4. 정규화된 답변으로 저장
  await db.question.update({
    where: { id: params.id },
    data: {
      answer: validation.normalizedAnswer,
      answeredAt: new Date(),
      status: 'answered',
    },
  });

  // 5. Agent에 답변 전달
  await questionQueue.answer(params.id, validation.normalizedAnswer!);

  return Response.json({
    success: true,
    message: 'Answer submitted successfully',
    normalizedAnswer: validation.normalizedAnswer,
  });
}
```

#### Re-prompt Logic (답변 재요청)

```typescript
// packages/agent-manager/src/protocols/QuestionHandler.ts

/**
 * 질문 처리기 (재시도 로직 포함)
 */
export class QuestionHandler {
  private readonly MAX_RETRIES = 3;

  /**
   * 사용자에게 질문하고 유효한 답변 받기
   */
  async askUserWithRetry(
    taskId: string,
    question: UserQuestion
  ): Promise<string> {
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      attempts++;

      // 사용자에게 질문 표시
      const answer = await this.promptUser(taskId, question);

      // 답변 검증
      const validator = new AnswerValidator();
      const validation = validator.validateAnswer(answer, question);

      if (validation.valid) {
        // 유효한 답변
        return validation.normalizedAnswer!;
      }

      // 검증 실패: 사용자에게 에러 메시지 표시
      console.warn(`❌ Invalid answer (attempt ${attempts}/${this.MAX_RETRIES})`);

      if (attempts < this.MAX_RETRIES) {
        // 재시도 요청
        await this.sendErrorToUser(taskId, {
          type: 'invalid_answer',
          message: validation.error!,
          suggestion: validation.suggestion,
          retriesLeft: this.MAX_RETRIES - attempts,
        });
      }
    }

    // 최대 재시도 초과
    throw new MaxRetriesExceededError(
      `User failed to provide valid answer after ${this.MAX_RETRIES} attempts`
    );
  }

  /**
   * 사용자에게 에러 메시지 전송 (SSE)
   */
  private async sendErrorToUser(
    taskId: string,
    error: InvalidAnswerError
  ): Promise<void> {
    eventBus.emit('user_question_error', {
      taskId,
      type: error.type,
      message: error.message,
      suggestion: error.suggestion,
      retriesLeft: error.retriesLeft,
    });
  }
}

interface InvalidAnswerError {
  type: 'invalid_answer';
  message: string;
  suggestion?: string;
  retriesLeft: number;
}

class MaxRetriesExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxRetriesExceededError';
  }
}
```

#### UI 예시 (React)

```tsx
// app/tasks/[id]/components/QuestionAnswer.tsx
'use client';

import { useState } from 'react';

export function QuestionAnswer({ question }: { question: UserQuestion }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuggestion(null);

    const response = await fetch(`/api/questions/${question.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });

    const data = await response.json();

    if (!data.success) {
      // 검증 실패
      setError(data.error);
      setSuggestion(data.suggestion);
      return;
    }

    // 성공
    console.log('Answer submitted:', data.normalizedAnswer);
  };

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.question}</p>

      {question.options ? (
        // 선택지가 있는 경우: 드롭다운
        <select
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">-- Select an option --</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        // 자유 형식 입력
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Type your answer..."
        />
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-800">{error}</p>
          {suggestion && (
            <p className="text-red-600 mt-2">
              Did you mean: <strong>{suggestion}</strong>?
              <button
                onClick={() => setAnswer(suggestion)}
                className="ml-2 text-blue-600 underline"
              >
                Use this
              </button>
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit Answer
      </button>
    </div>
  );
}
```

#### 예시 시나리오

**시나리오 1: 타이핑 실수**

```
Agent 질문: "Which database would you prefer?"
Options: ["PostgreSQL", "MySQL", "SQLite"]

사용자 입력: "Postgre" (실수)

서버 검증:
- Exact match: ❌
- Fuzzy match: ✅ "PostgreSQL" (similarity: 0.87)

응답:
{
  "success": false,
  "error": "Invalid answer. Did you mean 'PostgreSQL'?",
  "suggestion": "PostgreSQL",
  "similarity": 0.87
}

사용자: "Use this" 버튼 클릭 → "PostgreSQL"로 자동 수정
```

**시나리오 2: 대소문자 차이**

```
Options: ["Yes", "No"]
사용자 입력: "yes"

서버 검증:
- Exact match: ❌
- Case-insensitive match: ✅ "Yes"

응답:
{
  "success": true,
  "normalizedAnswer": "Yes",
  "warning": "Answer matched with different casing"
}

→ Agent에 "Yes" 전달
```

**시나리오 3: 완전히 잘못된 답변**

```
Options: ["Subscription", "Freemium", "Ad-based"]
사용자 입력: "Free forever"

서버 검증:
- Exact match: ❌
- Fuzzy match: ❌ (similarity < 0.7)

응답:
{
  "success": false,
  "error": "Invalid answer. Please choose from: Subscription, Freemium, Ad-based"
}

→ 사용자에게 다시 선택 요청 (최대 3회)
```

#### 모니터링 및 메트릭

```typescript
/**
 * 답변 검증 메트릭
 */
class AnswerValidationMetrics {
  /**
   * 검증 실패 추적
   */
  trackValidationFailure(question: UserQuestion, answer: string): void {
    metrics.increment('answer.validation.failed', {
      category: question.category,
      hasOptions: question.options ? 'yes' : 'no',
    });

    // 상세 로그
    logger.warn('Answer validation failed', {
      questionId: question.id,
      taskId: question.taskId,
      providedAnswer: answer,
      validOptions: question.options,
    });
  }

  /**
   * 퍼지 매칭 성공 추적
   */
  trackFuzzyMatch(similarity: number): void {
    metrics.histogram('answer.fuzzy_match.similarity', similarity);
  }

  /**
   * 재시도 횟수 추적
   */
  trackRetries(attempts: number): void {
    metrics.histogram('answer.validation.retries', attempts);
  }
}
```

#### 테스트 케이스

```typescript
// packages/agent-manager/tests/AnswerValidator.test.ts

describe('AnswerValidator', () => {
  const validator = new AnswerValidator();

  test('accepts exact match', () => {
    const result = validator.validateAnswer('PostgreSQL', {
      options: ['PostgreSQL', 'MySQL', 'SQLite'],
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedAnswer).toBe('PostgreSQL');
  });

  test('accepts case-insensitive match', () => {
    const result = validator.validateAnswer('postgresql', {
      options: ['PostgreSQL', 'MySQL', 'SQLite'],
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedAnswer).toBe('PostgreSQL');
    expect(result.warning).toBeTruthy();
  });

  test('suggests fuzzy match', () => {
    const result = validator.validateAnswer('Postgre', {
      options: ['PostgreSQL', 'MySQL', 'SQLite'],
    });

    expect(result.valid).toBe(false);
    expect(result.suggestion).toBe('PostgreSQL');
    expect(result.similarity).toBeGreaterThan(0.7);
  });

  test('rejects invalid answer', () => {
    const result = validator.validateAnswer('MongoDB', {
      options: ['PostgreSQL', 'MySQL', 'SQLite'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid answer');
  });

  test('allows free-form answer without options', () => {
    const result = validator.validateAnswer('Any answer', {
      options: undefined,
    });

    expect(result.valid).toBe(true);
  });
});
```

#### 권장 설정

- **퍼지 매칭 임계값**: 0.7 (70% 유사도)
- **최대 재시도 횟수**: 3회
- **타임아웃**: 없음 (사용자가 올바른 답변을 제공할 때까지 대기)

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

## 5. CUSTOM_TASK_COMPLETE (Type-D 작업 완료)

### 목적

Type-D (custom) 작업이 완료되었음을 알립니다. Type-D 작업은 구조화된 페이즈가 없는 자유 형식 대화 작업입니다.

### 형식

```
=== CUSTOM TASK COMPLETE ===
```

또는 상세 버전:

```
=== CUSTOM TASK COMPLETE ===
Task: [간단한 작업 설명]
Summary: [수행한 작업 요약]
```

### Type-D vs Phase-A/B/C 완료 신호 차이

| 워크플로우 | 완료 신호 | 페이즈 구조 |
|-----------|---------|----------|
| **Phase-A/B/C** | `=== PHASE N COMPLETE ===` | 구조화된 4단계 페이즈 |
| **Type-D** | `=== CUSTOM TASK COMPLETE ===` | 페이즈 없음 (단일 실행) |

### 처리 흐름

```
1. Sub-Agent가 CUSTOM_TASK_COMPLETE 출력
2. Agent Manager가 감지
3. Agent 프로세스 정상 종료
4. Task 상태를 'completed'로 변경
5. 사용자에게 완료 알림
6. 후속 대화 가능 (선택사항)
```

### 예시

#### 예시 1: 설명 요청
```javascript
// 사용자: "JWT 인증이 어떻게 작동하는지 설명해주세요"
// Agent가 설명 제공 후:

console.log('=== CUSTOM TASK COMPLETE ===');
console.log('Task: JWT authentication explanation');
console.log('Summary: Explained JWT structure, signing, and verification process');
```

#### 예시 2: 코드 생성
```javascript
// 사용자: "이메일 검증 함수 작성"
// Agent가 함수 생성 후:

console.log('=== CUSTOM TASK COMPLETE ===');
console.log('Task: Email validation function');
console.log('Summary: Created regex-based email validation with test cases');
```

#### 예시 3: 디버깅 도움
```javascript
// 사용자: "이 오류가 왜 발생하나요?"
// Agent가 원인 및 해결책 제공 후:

console.log('=== CUSTOM TASK COMPLETE ===');
console.log('Task: Debug TypeError');
console.log('Summary: Identified null reference issue and provided fix');
```

### 선택사항: 후속 대화

Type-D 작업은 완료 후에도 대화를 계속할 수 있습니다:

```
User: "JWT 인증 설명해주세요"
Agent: [설명 제공]
Agent: "=== CUSTOM TASK COMPLETE ==="

User: "그럼 refresh token은 어떻게 작동하나요?"
Agent: [추가 설명 제공]
Agent: "=== CUSTOM TASK COMPLETE ==="
```

### 검증 없음

Type-D 작업은 공식 검증 또는 리뷰 게이트가 없습니다:
- ❌ Verification Agent 실행 안 됨
- ❌ 리뷰 생성 안 됨
- ❌ 재작업 프로세스 없음
- ✅ 사용자 만족도가 유일한 품질 기준

---

## 프로토콜 우선순위

Agent Manager는 다음 우선순위로 프로토콜을 처리합니다:

```
1. ERROR (최우선)
   → 즉시 처리 및 복구 시도

2. PHASE_COMPLETE / CUSTOM_TASK_COMPLETE
   → Phase 종료 처리 또는 Type-D 작업 완료

3. DEPENDENCY_REQUEST (⚠️ Deprecated - use Settings instead)
   → 실행 차단

4. USER_QUESTION
   → 실행 차단

5. 일반 로그
   → 기록만
```

**참고**: `PHASE_COMPLETE`는 Phase-A/B/C 워크플로우에서 사용되며, `CUSTOM_TASK_COMPLETE`는 Type-D 워크플로우에서 사용됩니다.

### 동시 프로토콜 메시지 처리

여러 프로토콜 메시지가 동시에 또는 연속적으로 출력될 때 처리 규칙:

#### 시나리오 1: ERROR + 다른 프로토콜

```
Agent 출력:
[ERROR]
type: recoverable
message: File write failed
[/ERROR]
=== PHASE 1 COMPLETE ===
```

**처리**: ERROR를 먼저 처리하고, 복구 가능하면 PHASE_COMPLETE도 처리. 복구 불가능하면 PHASE_COMPLETE 무시.

#### 시나리오 2: PHASE_COMPLETE + USER_QUESTION

```
Agent 출력:
=== PHASE 1 COMPLETE ===
[USER_QUESTION]
category: clarification
question: Should I proceed?
[/USER_QUESTION]
```

**처리**:
1. PHASE_COMPLETE 신호 인식 → Agent 일시중지
2. USER_QUESTION은 처리되지 않음 (Agent가 이미 일시중지됨)
3. **권장**: Agent는 Phase 완료 전에 모든 질문을 먼저 해야 함

#### 시나리오 3: 여러 USER_QUESTION 연속 출력

```
Agent 출력:
[USER_QUESTION]
category: business
question: Revenue model?
[/USER_QUESTION]
[USER_QUESTION]
category: technical
question: Database choice?
[/USER_QUESTION]
```

**처리**:
1. 첫 번째 질문에서 Agent 일시중지
2. 사용자 응답 후 Agent 재개
3. 두 번째 질문 감지 → 다시 일시중지
4. **최적화**: Agent Manager는 버퍼에 있는 모든 질문을 한 번에 수집하여 일괄 처리 가능

#### 시나리오 4: ERROR + USER_QUESTION

```
Agent 출력:
[ERROR]
type: fatal
message: API key expired
[/ERROR]
[USER_QUESTION]
category: confirmation
question: Retry?
[/USER_QUESTION]
```

**처리**:
1. ERROR (fatal) → Agent 중단
2. USER_QUESTION은 무시 (Agent가 이미 중단됨)
3. 사용자에게 에러 알림만 전송

#### 동시성 보장

**Agent Manager 구현 지침**:

```typescript
// 프로토콜 메시지 파싱 큐
interface ProtocolMessage {
  type: 'ERROR' | 'PHASE_COMPLETE' | 'USER_QUESTION' | 'LOG';
  priority: number;
  content: any;
  timestamp: number;
}

function processProtocolBuffer(buffer: string[]): void {
  const messages = parseProtocols(buffer);

  // 1. 우선순위로 정렬
  messages.sort((a, b) => a.priority - b.priority);

  // 2. ERROR 먼저 처리
  const error = messages.find(m => m.type === 'ERROR');
  if (error && error.content.type === 'fatal') {
    handleFatalError(error);
    return; // 다른 프로토콜 무시
  }

  // 3. 복구 가능한 ERROR 처리
  if (error && error.content.type === 'recoverable') {
    handleRecoverableError(error);
  }

  // 4. 나머지 프로토콜 순서대로 처리
  for (const message of messages) {
    if (message.type !== 'ERROR') {
      processMessage(message);
    }
  }
}
```

**버퍼링 타임윈도우**: Agent 출력을 100ms 동안 버퍼링하여 동시 메시지를 한 번에 처리

---

## Multiline Protocol Message Handling

### 문제 상황

프로토콜 메시지의 필드 값(질문 텍스트, 에러 상세 정보 등)에 개행 문자가 포함될 경우 파싱이 실패하거나 부정확할 수 있습니다.

#### 예시: 개행이 포함된 질문

```
[USER_QUESTION]
category: clarification
question: Should the user profile include:
1. Full name
2. Email address
3. Phone number
options:
  - Yes, all fields
  - Only name and email
[/USER_QUESTION]
```

**문제**: `question` 필드가 여러 줄에 걸쳐 있어 단순 키-값 파서가 이를 올바르게 처리하지 못함

### 해결 방안

#### 1. 이스케이프 처리 방식

개행 문자를 `\n`으로 이스케이프:

```
[USER_QUESTION]
category: clarification
question: Should the user profile include:\n1. Full name\n2. Email address\n3. Phone number
options:
  - Yes, all fields
  - Only name and email
[/USER_QUESTION]
```

#### 2. JSON 내장 방식 (권장)

복잡한 데이터는 JSON으로 인코딩:

```
[USER_QUESTION_JSON]
{
  "category": "clarification",
  "question": "Should the user profile include:\n1. Full name\n2. Email address\n3. Phone number",
  "options": [
    "Yes, all fields",
    "Only name and email"
  ],
  "required": true
}
[/USER_QUESTION_JSON]
```

### TypeScript 구현

#### Protocol Parser with Multiline Support

```typescript
// packages/agent-manager/src/protocols/ProtocolParser.ts

/**
 * Protocol 메시지 파서 (멀티라인 지원)
 *
 * 지원 형식:
 * 1. 표준 키-값 (key: value)
 * 2. 이스케이프된 개행 (\n)
 * 3. JSON 블록
 */
export class ProtocolParser {
  /**
   * 개행이 이스케이프된 프로토콜 메시지 파싱
   */
  parseWithEscapedNewlines(protocolText: string): Record<string, any> {
    const lines = protocolText.split('\n');
    const result: Record<string, any> = {};

    let currentKey: string | null = null;
    let currentValue: string[] = [];

    for (const line of lines) {
      // 프로토콜 태그 건너뛰기
      if (line.startsWith('[') && line.endsWith(']')) {
        continue;
      }

      // 키-값 감지
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1 && line.substring(0, colonIndex).indexOf(' ') === -1) {
        // 이전 키 저장
        if (currentKey !== null) {
          result[currentKey] = this.unescapeNewlines(currentValue.join(' '));
        }

        // 새 키-값 시작
        currentKey = line.substring(0, colonIndex).trim();
        currentValue = [line.substring(colonIndex + 1).trim()];
      } else if (currentKey !== null) {
        // 멀티라인 값 계속
        currentValue.push(line.trim());
      }
    }

    // 마지막 키 저장
    if (currentKey !== null) {
      result[currentKey] = this.unescapeNewlines(currentValue.join(' '));
    }

    return result;
  }

  /**
   * 이스케이프된 개행 문자 복원
   */
  private unescapeNewlines(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  /**
   * JSON 블록 프로토콜 파싱
   */
  parseJsonProtocol(protocolText: string): any {
    // 프로토콜 태그 제거
    const jsonMatch = protocolText.match(/\[(\w+)_JSON\]\s*([\s\S]*?)\s*\[\/\1_JSON\]/);

    if (!jsonMatch) {
      throw new ProtocolParseError('Invalid JSON protocol format');
    }

    const jsonContent = jsonMatch[2];

    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      throw new ProtocolParseError(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * 프로토콜 메시지 검증
   */
  validateMultilineMessage(message: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필드별 길이 검증
    const MAX_FIELD_LENGTH = 10000; // 10KB

    for (const [key, value] of Object.entries(message)) {
      if (typeof value === 'string') {
        // 길이 검증
        if (value.length > MAX_FIELD_LENGTH) {
          errors.push(`Field '${key}' exceeds maximum length (${MAX_FIELD_LENGTH} chars)`);
        }

        // Unicode 제어 문자 검증
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
          warnings.push(`Field '${key}' contains control characters`);
        }

        // CRLF vs LF 혼용 감지
        if (value.includes('\r\n') && value.includes('\n') && !value.includes('\r\n')) {
          warnings.push(`Field '${key}' mixes CRLF and LF line endings`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class ProtocolParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolParseError';
  }
}
```

#### Error Handling for Malformed Multiline Messages

```typescript
// packages/agent-manager/src/protocols/ProtocolHandler.ts

/**
 * 멀티라인 프로토콜 메시지 처리
 */
export class ProtocolHandler {
  private parser = new ProtocolParser();

  /**
   * Agent 출력에서 프로토콜 추출 및 파싱
   */
  async handleAgentOutput(output: string): Promise<void> {
    const protocols = this.extractProtocols(output);

    for (const protocol of protocols) {
      try {
        // JSON 프로토콜 우선 처리
        if (protocol.text.includes('_JSON]')) {
          const parsed = this.parser.parseJsonProtocol(protocol.text);
          await this.processProtocol(protocol.type, parsed);
        } else {
          // 표준 프로토콜 파싱
          const parsed = this.parser.parseWithEscapedNewlines(protocol.text);

          // 검증
          const validation = this.parser.validateMultilineMessage(parsed);

          if (!validation.valid) {
            this.handleMalformedProtocol(protocol, validation.errors);
            continue;
          }

          // 경고 로깅
          if (validation.warnings.length > 0) {
            console.warn(`⚠️  Protocol warnings:`, validation.warnings);
          }

          await this.processProtocol(protocol.type, parsed);
        }
      } catch (error) {
        this.handleProtocolError(protocol, error);
      }
    }
  }

  /**
   * 형식이 잘못된 프로토콜 처리
   */
  private handleMalformedProtocol(
    protocol: ProtocolMessage,
    errors: string[]
  ): void {
    console.error(`❌ Malformed protocol message:`, {
      type: protocol.type,
      errors,
      rawText: protocol.text.substring(0, 200), // 처음 200자만 로깅
    });

    // Agent에 에러 피드백 전송
    this.sendErrorToAgent({
      type: 'fatal',
      message: 'Malformed protocol message',
      details: errors.join('; '),
      recovery: 'checkpoint_and_fail',
    });
  }

  /**
   * 프로토콜 파싱 에러 처리
   */
  private handleProtocolError(
    protocol: ProtocolMessage,
    error: Error
  ): void {
    console.error(`❌ Protocol parsing error:`, {
      type: protocol.type,
      error: error.message,
      stack: error.stack,
    });

    // 에러 메트릭 기록
    metrics.increment('protocol.parse.error', {
      type: protocol.type,
      error: error.name,
    });
  }
}

interface ProtocolMessage {
  type: string;
  text: string;
  timestamp: Date;
}
```

### Edge Cases

#### 1. 매우 긴 메시지 (10KB+)

```typescript
/**
 * 대용량 메시지 처리 전략
 */
const MAX_PROTOCOL_SIZE = 100 * 1024; // 100KB

function validateProtocolSize(text: string): boolean {
  const sizeInBytes = Buffer.byteLength(text, 'utf-8');

  if (sizeInBytes > MAX_PROTOCOL_SIZE) {
    console.error(`Protocol message too large: ${sizeInBytes} bytes`);
    return false;
  }

  return true;
}
```

#### 2. Unicode 문자 (이모지, 특수 문자)

```typescript
/**
 * Unicode 정규화
 */
import { normalize } from 'node:util';

function normalizeUnicode(text: string): string {
  // NFC 정규화 (Canonical Decomposition followed by Canonical Composition)
  return text.normalize('NFC');
}

// 예시
const question = "사용자 프로필에 이모지 😀를 허용할까요?";
const normalized = normalizeUnicode(question);
```

#### 3. CRLF vs LF 혼용

```typescript
/**
 * 줄바꿈 문자 정규화
 */
function normalizeLineEndings(text: string): string {
  // 모두 LF로 통일
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
```

### 모니터링 및 로깅

```typescript
/**
 * 프로토콜 파싱 메트릭
 */
class ProtocolMetrics {
  /**
   * 멀티라인 메시지 통계
   */
  trackMultilineMessage(protocol: any): void {
    const lineCount = protocol.question?.split('\n').length || 0;

    if (lineCount > 1) {
      metrics.increment('protocol.multiline', {
        type: protocol.category,
        lines: lineCount,
      });
    }
  }

  /**
   * 파싱 에러 추적
   */
  trackParseError(error: Error, protocolType: string): void {
    metrics.increment('protocol.parse.error', {
      type: protocolType,
      error: error.name,
    });

    // 상세 로그
    logger.error('Protocol parse error', {
      type: protocolType,
      error: error.message,
      stack: error.stack,
    });
  }
}
```

### 테스트 케이스

```typescript
// packages/agent-manager/tests/ProtocolParser.test.ts

describe('ProtocolParser - Multiline Support', () => {
  const parser = new ProtocolParser();

  test('parses escaped newlines', () => {
    const input = `
[USER_QUESTION]
category: clarification
question: Line 1\\nLine 2\\nLine 3
options:
  - Option A
[/USER_QUESTION]
    `.trim();

    const result = parser.parseWithEscapedNewlines(input);

    expect(result.question).toBe('Line 1\nLine 2\nLine 3');
  });

  test('parses JSON protocol', () => {
    const input = `
[USER_QUESTION_JSON]
{
  "category": "clarification",
  "question": "Multiline\nQuestion\nHere",
  "options": ["A", "B"]
}
[/USER_QUESTION_JSON]
    `.trim();

    const result = parser.parseJsonProtocol(input);

    expect(result.question).toContain('\n');
    expect(result.options).toHaveLength(2);
  });

  test('validates field length', () => {
    const message = {
      question: 'x'.repeat(15000), // 15KB
    };

    const validation = parser.validateMultilineMessage(message);

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('exceeds maximum length');
  });

  test('detects control characters', () => {
    const message = {
      question: 'Normal text\x00with null char',
    };

    const validation = parser.validateMultilineMessage(message);

    expect(validation.warnings.length).toBeGreaterThan(0);
  });
});
```

### 권장 사항

1. **Sub-Agent 가이드 업데이트**:
   - 멀티라인 질문 시 `\n`으로 이스케이프 권장
   - 복잡한 구조는 JSON 프로토콜 사용

2. **Agent Manager 구현**:
   - 두 가지 파싱 방식 모두 지원
   - 검증 실패 시 명확한 에러 메시지 제공

3. **모니터링**:
   - 멀티라인 메시지 빈도 추적
   - 파싱 에러율 모니터링

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

---

## 동시 사용자 질문 큐 관리

여러 Agent가 동시에 USER_QUESTION을 출력하거나, 하나의 Agent가 여러 질문을 연속으로 출력할 때 처리 방법입니다.

### 문제 상황

#### 시나리오 1: 여러 Agent의 동시 질문

```
Task A Agent: [USER_QUESTION] Revenue model?
Task B Agent: [USER_QUESTION] Database choice?
Task C Agent: [USER_QUESTION] Deployment platform?

→ 사용자가 어떤 순서로 답변해야 하는가?
```

#### 시나리오 2: 하나의 Agent가 연속 질문

```
Agent: [USER_QUESTION] Revenue model?
Agent: [USER_QUESTION] Target users?
Agent: [USER_QUESTION] Payment method?

→ 모든 질문을 한 번에 보여줄 것인가, 순차적으로 보여줄 것인가?
```

### 해결 전략

#### 1. 질문 큐 관리자

```typescript
// packages/agent-manager/src/QuestionQueue.ts

export interface QueuedQuestion {
  id: string;
  taskId: string;
  category: QuestionCategory;
  question: string;
  options?: string[];
  default?: string;
  required: boolean;
  priority: number;  // Task 우선순위 기반
  queuedAt: Date;
  status: 'pending' | 'presented' | 'answered' | 'expired';
}

export class QuestionQueueManager {
  private queue: QueuedQuestion[] = [];
  private readonly MAX_BATCH_SIZE = 3; // 한 번에 표시할 최대 질문 수

  /**
   * 질문 추가
   */
  async enqueue(
    taskId: string,
    question: UserQuestion,
    priority: number = 0
  ): Promise<string> {
    const questionId = generateId();

    const queuedQuestion: QueuedQuestion = {
      id: questionId,
      taskId,
      category: question.category,
      question: question.question,
      options: question.options,
      default: question.default,
      required: question.required,
      priority,
      queuedAt: new Date(),
      status: 'pending',
    };

    // DB에 저장
    await db.question.create({
      data: {
        id: questionId,
        taskId,
        category: question.category,
        question: question.question,
        options: question.options,
        required: question.required,
        status: 'pending',
      },
    });

    // 메모리 큐에 추가
    this.queue.push(queuedQuestion);

    // 우선순위로 정렬
    this.queue.sort((a, b) => b.priority - a.priority);

    console.log(`❓ Question enqueued: ${questionId} (Task: ${taskId})`);
    console.log(`   Queue size: ${this.queue.length}`);

    // 사용자에게 알림
    await this.notifyUser();

    return questionId;
  }

  /**
   * 대기 중인 질문 조회 (배치)
   */
  getPendingBatch(): QueuedQuestion[] {
    return this.queue
      .filter((q) => q.status === 'pending')
      .slice(0, this.MAX_BATCH_SIZE);
  }

  /**
   * 질문 응답 처리
   */
  async answer(questionId: string, answer: string): Promise<void> {
    const question = this.queue.find((q) => q.id === questionId);
    if (!question) {
      throw new QuestionNotFoundError(questionId);
    }

    if (question.status !== 'pending') {
      throw new QuestionAlreadyAnsweredError();
    }

    // 1. 상태 업데이트
    question.status = 'answered';

    // 2. DB 업데이트
    await db.question.update({
      where: { id: questionId },
      data: {
        answer,
        status: 'answered',
        answeredAt: new Date(),
      },
    });

    // 3. Agent에 답변 전달
    await this.deliverAnswerToAgent(question.taskId, answer);

    // 4. 큐에서 제거
    this.queue = this.queue.filter((q) => q.id !== questionId);

    console.log(`✅ Question answered: ${questionId}`);

    // 5. 다음 질문 표시
    if (this.queue.length > 0) {
      await this.notifyUser();
    }
  }

  /**
   * 사용자에게 질문 알림
   */
  private async notifyUser(): Promise<void> {
    const batch = this.getPendingBatch();

    if (batch.length === 0) return;

    // SSE로 질문 전송
    for (const question of batch) {
      eventBus.emit('user_question', {
        questionId: question.id,
        taskId: question.taskId,
        category: question.category,
        question: question.question,
        options: question.options,
        required: question.required,
      });

      // 상태 업데이트
      question.status = 'presented';
    }

    // 사용자에게 알림
    await notifyUser({
      type: 'questions_pending',
      count: batch.length,
      questions: batch,
    });
  }

  /**
   * Agent에 답변 전달
   */
  private async deliverAnswerToAgent(
    taskId: string,
    answer: string
  ): Promise<void> {
    const agent = agentManager.getAgent(taskId);
    if (!agent) {
      throw new Error(`Agent not found for task ${taskId}`);
    }

    // stdin으로 답변 전달
    const answerMessage = JSON.stringify({
      type: 'question_answer',
      answer,
    });

    agent.stdin.write(answerMessage + '\n');

    // Agent 재개
    agent.resume();
  }
}
```

#### 2. 배치 처리 전략

**모든 질문을 한 번에 표시**:

```typescript
export class BatchQuestionPresenter {
  /**
   * 같은 Task의 질문을 모아서 표시
   */
  async presentTaskQuestions(taskId: string): Promise<void> {
    // 100ms 동안 대기하여 연속 질문 수집
    await sleep(100);

    const questions = questionQueue.queue.filter(
      (q) => q.taskId === taskId && q.status === 'pending'
    );

    if (questions.length === 0) return;

    // 한 번에 모든 질문 표시
    await notifyUser({
      type: 'question_batch',
      taskId,
      questions,
      message: `${questions.length} questions need your input`,
    });

    // 상태 업데이트
    for (const question of questions) {
      question.status = 'presented';
    }
  }
}
```

**UI 예시** (여러 질문 한 번에):

```tsx
// app/tasks/[id]/components/QuestionBatch.tsx
'use client';

export function QuestionBatch({ questions }: { questions: QueuedQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    // 모든 답변 제출
    for (const question of questions) {
      await fetch(`/api/questions/${question.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: answers[question.id] }),
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold">
        {questions.length} Questions Need Your Input
      </h3>

      {questions.map((q) => (
        <div key={q.id} className="border p-4 rounded">
          <p className="font-medium">{q.question}</p>

          {q.options ? (
            <select
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
              defaultValue={q.default}
            >
              {q.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
            />
          )}
        </div>
      ))}

      <button onClick={handleSubmit}>Submit All Answers</button>
    </div>
  );
}
```

#### 3. 우선순위 기반 처리

```typescript
export class PriorityQuestionQueue extends QuestionQueueManager {
  /**
   * 우선순위 계산
   */
  private calculatePriority(
    taskId: string,
    category: QuestionCategory
  ): number {
    let priority = 0;

    // 1. Task 우선순위
    const task = getTask(taskId);
    switch (task.priority) {
      case 'critical':
        priority += 100;
        break;
      case 'high':
        priority += 50;
        break;
      case 'normal':
        priority += 0;
        break;
      case 'low':
        priority -= 50;
        break;
    }

    // 2. 질문 카테고리 우선순위
    switch (category) {
      case 'business':
        priority += 30; // 비즈니스 결정이 가장 중요
        break;
      case 'clarification':
        priority += 20;
        break;
      case 'choice':
        priority += 10;
        break;
      case 'confirmation':
        priority += 0;
        break;
    }

    // 3. 대기 시간 보너스 (공평성)
    const waitTime = Date.now() - task.createdAt.getTime();
    priority += Math.floor(waitTime / 60000); // 1분당 +1

    return priority;
  }

  async enqueue(
    taskId: string,
    question: UserQuestion
  ): Promise<string> {
    const priority = this.calculatePriority(taskId, question.category);
    return super.enqueue(taskId, question, priority);
  }
}
```

#### 4. 타임아웃 처리

```typescript
export class QuestionQueueWithTimeout extends QuestionQueueManager {
  private readonly QUESTION_TIMEOUT = 30 * 60 * 1000; // 30분

  async enqueue(
    taskId: string,
    question: UserQuestion,
    priority: number = 0
  ): Promise<string> {
    const questionId = await super.enqueue(taskId, question, priority);

    // 타임아웃 설정
    setTimeout(async () => {
      await this.handleTimeout(questionId);
    }, this.QUESTION_TIMEOUT);

    return questionId;
  }

  /**
   * 타임아웃 처리
   */
  private async handleTimeout(questionId: string): Promise<void> {
    const question = this.queue.find((q) => q.id === questionId);

    if (!question || question.status !== 'pending') {
      return; // 이미 답변됨
    }

    console.warn(`⏰ Question timeout: ${questionId}`);

    if (question.required) {
      // 필수 질문: Agent 일시중지 유지
      await notifyUser({
        type: 'question_timeout_required',
        questionId,
        message: 'This question requires your answer to continue',
      });
    } else {
      // 선택 질문: 기본값 사용
      const answer = question.default || 'skip';
      await this.answer(questionId, answer);
      console.log(`✅ Used default answer: ${answer}`);
    }
  }
}
```

### Agent Manager 통합

```typescript
// packages/agent-manager/src/AgentManager.ts

export class AgentManager {
  private questionQueue = new PriorityQuestionQueue();

  /**
   * Agent 출력에서 USER_QUESTION 파싱
   */
  private handleAgentOutput(taskId: string, output: string): void {
    const protocols = parseProtocols(output);

    for (const protocol of protocols) {
      if (protocol.type === 'USER_QUESTION') {
        this.handleUserQuestion(taskId, protocol.content);
      }
    }
  }

  /**
   * USER_QUESTION 처리
   */
  private async handleUserQuestion(
    taskId: string,
    question: UserQuestion
  ): Promise<void> {
    console.log(`❓ User question from Task ${taskId}`);

    // 1. Agent 일시중지
    await this.pauseAgent(taskId);

    // 2. 질문 큐에 추가
    const questionId = await this.questionQueue.enqueue(taskId, question);

    // 3. Checkpoint 생성
    await checkpointManager.save(taskId, 'user_question');

    console.log(`⏸️  Task ${taskId} paused for question ${questionId}`);
  }
}
```

### API 엔드포인트

```typescript
// app/api/questions/pending/route.ts

/**
 * 대기 중인 질문 조회
 */
export async function GET() {
  const pending = questionQueue.getPendingBatch();

  return Response.json({
    success: true,
    data: {
      count: pending.length,
      questions: pending,
    },
  });
}

// app/api/questions/[id]/answer/route.ts

/**
 * 질문 응답
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { answer } = await req.json();

  try {
    await questionQueue.answer(params.id, answer);

    return Response.json({
      success: true,
      message: 'Answer submitted',
    });
  } catch (error) {
    if (error instanceof QuestionAlreadyAnsweredError) {
      return Response.json(
        { success: false, error: 'Question already answered' },
        { status: 409 }
      );
    }
    throw error;
  }
}
```

### 모니터링

```typescript
// 큐 상태 모니터링
export async function GET() {
  const stats = {
    queueSize: questionQueue.queue.length,
    pending: questionQueue.queue.filter((q) => q.status === 'pending').length,
    presented: questionQueue.queue.filter((q) => q.status === 'presented').length,
    byTask: groupBy(questionQueue.queue, 'taskId'),
    byCategory: groupBy(questionQueue.queue, 'category'),
  };

  return Response.json(stats);
}
```

**응답 예시**:
```json
{
  "queueSize": 5,
  "pending": 3,
  "presented": 2,
  "byTask": {
    "task_abc": 2,
    "task_def": 3
  },
  "byCategory": {
    "business": 1,
    "clarification": 2,
    "choice": 2
  }
}
```

### 권장 설정

**프로덕션**:
- 배치 크기: 3 (한 번에 3개 질문)
- 타임아웃: 30분
- 우선순위: Task 우선순위 + 카테고리 + 대기 시간

**개발**:
- 배치 크기: 1 (순차 처리)
- 타임아웃: 5분
- 우선순위: FIFO

---

## 관련 문서

- **Sub-Agent 가이드**: `/packages/sub-agent/CLAUDE.md`
- **Agent Manager 가이드**: `/packages/agent-manager/CLAUDE.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
