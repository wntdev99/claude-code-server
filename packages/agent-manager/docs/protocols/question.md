# 사용자 질문 프로토콜 처리

## 개요

서브 에이전트가 사용자에게 질문할 때 감지하고 처리하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 사용자 질문 처리를 다룹니다.
> **서브 에이전트의 질문 방법**은 `../../../sub-agent/docs/protocols/user-question.md` 참조

## 프로토콜 형식

### 사용자 질문

서브 에이전트가 다음 형식으로 출력합니다:

```
[USER_QUESTION]
category: business
question: 어떤 수익 모델을 선호하시나요?
options: [구독 (월/연간), 프리미엄 (무료 + 유료), 광고 기반]
default: 프리미엄
required: false
[/USER_QUESTION]
```

### 필드 정의

```typescript
// agent-manager/types/protocols.ts
export interface UserQuestion {
  category: QuestionCategory;
  question: string;
  options?: string[];
  default?: string;
  required: boolean;
}

export type QuestionCategory =
  | 'business'       // 비즈니스 결정
  | 'clarification'  // 요구사항 명확화
  | 'choice'         // 선택지 제공
  | 'confirmation';  // 확인
```

## 감지 및 파싱

### 출력 감지

```typescript
// agent-manager/lib/protocols/detector.ts
export function detectProtocol(output: string): Protocol | null {
  // 사용자 질문 감지
  if (output.includes('[USER_QUESTION]')) {
    return parseUserQuestion(output);
  }

  // 다른 프로토콜 감지
  // ...

  return null;
}
```

### 파싱 구현

```typescript
// agent-manager/lib/protocols/question.ts
export function parseUserQuestion(output: string): UserQuestion | null {
  const match = output.match(/\[USER_QUESTION\]([\s\S]*?)\[\/USER_QUESTION\]/);
  if (!match) {
    return null;
  }

  const content = match[1];

  try {
    const category = extractField(content, 'category');
    const question = extractField(content, 'question');
    const optionsStr = extractField(content, 'options');
    const defaultValue = extractField(content, 'default');
    const required = extractField(content, 'required') === 'true';

    // 검증
    if (!category || !question) {
      console.error('Invalid user question: missing required fields');
      return null;
    }

    const validCategories: QuestionCategory[] = [
      'business',
      'clarification',
      'choice',
      'confirmation',
    ];

    if (!validCategories.includes(category as QuestionCategory)) {
      console.error(`Invalid question category: ${category}`);
      return null;
    }

    // Options 파싱
    let options: string[] | undefined;
    if (optionsStr) {
      // [option1, option2, option3] 형식
      if (optionsStr.startsWith('[')) {
        options = optionsStr
          .slice(1, -1)
          .split(',')
          .map(o => o.trim());
      } else {
        // - option1 \n - option2 형식
        options = optionsStr
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-'))
          .map(line => line.substring(1).trim());
      }
    }

    return {
      category: category as QuestionCategory,
      question,
      options,
      default: defaultValue || undefined,
      required,
    };
  } catch (error) {
    console.error('Failed to parse user question:', error);
    return null;
  }
}

function extractField(content: string, fieldName: string): string {
  const regex = new RegExp(`${fieldName}:\\s*(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}
```

## 처리 흐름

### 핸들러

```typescript
// agent-manager/lib/protocols/question.ts
export async function handleUserQuestion(
  taskId: string,
  question: UserQuestion
): Promise<void> {
  console.log(`User question for ${taskId}:`, question);

  try {
    // 1. 에이전트 일시 중지
    pauseAgentExecution(taskId, `Waiting for user answer: ${question.question}`);

    // 2. Checkpoint 생성
    await createCheckpoint(taskId, 'user_question', {
      question,
      timestamp: new Date().toISOString(),
    });

    // 3. 데이터베이스에 저장
    const dbQuestion = await db.question.create({
      data: {
        taskId,
        category: question.category,
        question: question.question,
        options: question.options || [],
        default: question.default,
        required: question.required,
        status: 'pending',
        askedAt: new Date(),
      },
    });

    // 4. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'waiting_question',
      blockedBy: 'question',
      blockedReason: question.question,
    });

    // 5. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'user_question',
      data: {
        questionId: dbQuestion.id,
        category: question.category,
        question: question.question,
        options: question.options,
        default: question.default,
        required: question.required,
      },
    });

    console.log(`User question created: ${dbQuestion.id}`);
  } catch (error) {
    console.error(`Failed to handle user question for ${taskId}:`, error);
    await handleProtocolError(taskId, 'user_question', error);
  }
}
```

## 답변 제공

### 웹 서버로부터 답변 수신

```typescript
// agent-manager/lib/protocols/question.ts
export interface ProvideAnswerRequest {
  taskId: string;
  questionId: string;
  answer: string;
}

export async function provideAnswer(
  request: ProvideAnswerRequest
): Promise<boolean> {
  const { taskId, questionId, answer } = request;

  try {
    // 1. Question 조회
    const question = await db.question.findUnique({
      where: { id: questionId },
    });

    if (!question || question.taskId !== taskId) {
      console.error(`Question not found: ${questionId}`);
      return false;
    }

    if (question.status !== 'pending') {
      console.error(`Question ${questionId} is not pending`);
      return false;
    }

    // 2. 답변 검증
    const validation = validateAnswer(question, answer);
    if (!validation.valid) {
      console.error(`Invalid answer: ${validation.error}`);
      return false;
    }

    // 3. 데이터베이스 업데이트
    await db.question.update({
      where: { id: questionId },
      data: {
        answer,
        status: 'answered',
        answeredAt: new Date(),
      },
    });

    // 4. 에이전트에 전달
    await sendAnswerToAgent(taskId, answer);

    // 5. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'running',
      blockedBy: null,
      blockedReason: null,
    });

    // 6. 에이전트 재개
    resumeAgentExecution({ taskId });

    console.log(`Answer provided for question: ${questionId}`);
    return true;
  } catch (error) {
    console.error(`Failed to provide answer for ${questionId}:`, error);
    return false;
  }
}
```

### 답변 검증

```typescript
// agent-manager/lib/protocols/question.ts
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateAnswer(
  question: { options?: string[]; required: boolean },
  answer: string
): ValidationResult {
  // 필수 질문인데 답변 없음
  if (question.required && (!answer || answer.trim().length === 0)) {
    return { valid: false, error: 'Answer is required' };
  }

  // 선택지가 있는 경우
  if (question.options && question.options.length > 0) {
    if (!question.options.includes(answer)) {
      return {
        valid: false,
        error: `Answer must be one of: ${question.options.join(', ')}`,
      };
    }
  }

  return { valid: true };
}
```

### 답변 전달

```typescript
// agent-manager/lib/protocols/question.ts
async function sendAnswerToAgent(taskId: string, answer: string): Promise<void> {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    throw new Error(`Agent not found: ${taskId}`);
  }

  // stdin으로 답변 전달
  state.process.stdin?.write(answer + '\n');

  // 로그 저장
  saveLog(taskId, `[USER_ANSWER] ${answer}`);

  console.log(`Answer sent to agent ${taskId}: ${answer}`);
}
```

## 질문 건너뛰기 (선택적 질문)

### 기본값 사용

```typescript
// agent-manager/lib/protocols/question.ts
export async function skipQuestion(questionId: string): Promise<boolean> {
  try {
    // 1. Question 조회
    const question = await db.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      console.error(`Question not found: ${questionId}`);
      return false;
    }

    // 2. 필수 질문은 건너뛸 수 없음
    if (question.required) {
      console.error(`Cannot skip required question: ${questionId}`);
      return false;
    }

    // 3. 기본값 사용
    const answer = question.default || '';

    // 4. 답변 제공
    return await provideAnswer({
      taskId: question.taskId,
      questionId,
      answer,
    });
  } catch (error) {
    console.error(`Failed to skip question ${questionId}:`, error);
    return false;
  }
}
```

## 타임아웃 처리

### 자동 타임아웃

```typescript
// agent-manager/lib/protocols/question.ts
const QUESTION_TIMEOUT = 3600000; // 1시간

export function setupQuestionTimeout(taskId: string, questionId: string) {
  setTimeout(async () => {
    // 1. Question 상태 확인
    const question = await db.question.findUnique({
      where: { id: questionId },
    });

    if (!question || question.status !== 'pending') {
      return; // 이미 답변됨
    }

    console.warn(`Question timeout: ${questionId}`);

    // 2. 필수 질문인 경우 Task 일시 중지 유지
    if (question.required) {
      await db.question.update({
        where: { id: questionId },
        data: { status: 'timeout' },
      });

      notifyWebServer(taskId, {
        type: 'question_timeout',
        data: {
          questionId,
          question: question.question,
        },
      });
    } else {
      // 3. 선택적 질문인 경우 기본값으로 진행
      await skipQuestion(questionId);
    }
  }, QUESTION_TIMEOUT);
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/protocols/question.test.ts
import { parseUserQuestion, validateAnswer } from '@/lib/protocols/question';

describe('User Question Protocol', () => {
  describe('parseUserQuestion', () => {
    it('should parse question with options', () => {
      const output = `
[USER_QUESTION]
category: business
question: What pricing model?
options: [Subscription, Freemium, Ad-based]
default: Freemium
required: false
[/USER_QUESTION]
      `;

      const result = parseUserQuestion(output);

      expect(result).toEqual({
        category: 'business',
        question: 'What pricing model?',
        options: ['Subscription', 'Freemium', 'Ad-based'],
        default: 'Freemium',
        required: false,
      });
    });

    it('should parse question without options', () => {
      const output = `
[USER_QUESTION]
category: clarification
question: What is the target user age range?
required: true
[/USER_QUESTION]
      `;

      const result = parseUserQuestion(output);

      expect(result).toEqual({
        category: 'clarification',
        question: 'What is the target user age range?',
        options: undefined,
        default: undefined,
        required: true,
      });
    });
  });

  describe('validateAnswer', () => {
    it('should validate answer from options', () => {
      const question = {
        options: ['Subscription', 'Freemium', 'Ad-based'],
        required: true,
      };

      const result = validateAnswer(question, 'Freemium');
      expect(result.valid).toBe(true);
    });

    it('should reject answer not in options', () => {
      const question = {
        options: ['Subscription', 'Freemium'],
        required: true,
      };

      const result = validateAnswer(question, 'Other');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('should reject empty answer for required question', () => {
      const question = {
        required: true,
      };

      const result = validateAnswer(question, '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../lifecycle/execution.md`** - 답변 제공 후 재개
2. **`../../../sub-agent/docs/protocols/user-question.md`** - 질문 형식 (양방향 동기화)
3. **`../../../claude-code-server/docs/features/protocol-parsing.md`** - 웹 서버의 파싱 로직
4. **`../../../claude-code-server/docs/api/questions-api.md`** - Questions API 명세

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`../lifecycle/execution.md`** - 실행 및 제어
4. **`../checkpoint/creation.md`** - Checkpoint 생성 시점

## 다음 단계

- **Execution**: `../lifecycle/execution.md` - 에이전트 제어
- **Questions API**: `../../../claude-code-server/docs/api/questions-api.md` - 웹 API
- **Sub-Agent Question**: `../../../sub-agent/docs/protocols/user-question.md` - 질문 방법

## 관련 문서

- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Sub-Agent - User Question**: `../../../sub-agent/docs/protocols/user-question.md`
- **Web Server - Protocol Parsing**: `../../../claude-code-server/docs/features/protocol-parsing.md`
- **Web Server - Questions API**: `../../../claude-code-server/docs/api/questions-api.md`
