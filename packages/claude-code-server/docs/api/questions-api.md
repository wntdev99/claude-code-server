# Questions API

## 개요

사용자 질문(User Questions)을 조회하고 답변하는 API 명세입니다.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### 1. List Questions

모든 질문 목록을 조회합니다.

**Endpoint**: `GET /api/questions`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | No | 특정 Task의 질문만 조회 |
| status | string | No | 상태 필터: `pending`, `answered`, `skipped`, `timeout` |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "question_abc123",
        "taskId": "task_xyz789",
        "category": "business",
        "question": "어떤 수익 모델을 선호하시나요?",
        "options": ["구독 (월/연간)", "프리미엄 (무료 + 유료)", "광고 기반"],
        "default": "프리미엄",
        "required": false,
        "status": "pending",
        "askedAt": "2024-01-10T13:00:00.000Z",
        "task": {
          "id": "task_xyz789",
          "title": "AI Todo App 개발"
        }
      }
    ]
  }
}
```

**구현 예시**:
```typescript
// app/api/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const taskId = searchParams.get('taskId');
    const status = searchParams.get('status');

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;

    const questions = await db.question.findMany({
      where,
      orderBy: { askedAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
```

---

### 2. Get Question

특정 질문의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/questions/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "question_abc123",
    "taskId": "task_xyz789",
    "category": "clarification",
    "question": "타겟 사용자의 연령대는 어떻게 되나요?",
    "options": null,
    "default": null,
    "required": true,
    "status": "pending",
    "askedAt": "2024-01-10T13:00:00.000Z",
    "task": {
      "id": "task_xyz789",
      "title": "AI Todo App 개발",
      "type": "create_app",
      "status": "waiting_question"
    }
  }
}
```

**Errors**:
- `404 Not Found`: Question이 존재하지 않음

**구현 예시**:
```typescript
// app/api/questions/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const question = await db.question.findUnique({
      where: { id: params.id },
      include: {
        task: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error('Failed to fetch question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}
```

---

### 3. Answer Question

질문에 답변하고 에이전트를 재개합니다.

**Endpoint**: `POST /api/questions/:id/answer`

**Request Body**:
```json
{
  "answer": "20대 중후반 (25-29세)"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| answer | string | Yes | 질문에 대한 답변 |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Answer provided successfully"
}
```

**Errors**:
- `404 Not Found`: Question이 존재하지 않음
- `400 Bad Request`: Question이 pending 상태가 아님 또는 답변이 유효하지 않음

**구현 예시**:
```typescript
// app/api/questions/[id]/answer/route.ts
import { provideAnswer } from '@/lib/questions/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { answer } = body;

    if (!answer) {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      );
    }

    const question = await db.question.findUnique({
      where: { id: params.id },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (question.status !== 'pending') {
      return NextResponse.json(
        { error: 'Question is not pending' },
        { status: 400 }
      );
    }

    // 답변 검증
    const validation = validateAnswer(question, answer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 답변 제공
    const success = await provideAnswer({
      taskId: question.taskId,
      questionId: params.id,
      answer,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to provide answer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Answer provided successfully',
    });
  } catch (error) {
    console.error('Failed to answer question:', error);
    return NextResponse.json(
      { error: 'Failed to answer question' },
      { status: 500 }
    );
  }
}
```

### 답변 검증

```typescript
// lib/questions/validator.ts
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

### 답변 제공

```typescript
// lib/questions/provider.ts
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
    // 데이터베이스 업데이트
    await db.question.update({
      where: { id: questionId },
      data: {
        answer,
        status: 'answered',
        answeredAt: new Date(),
      },
    });

    // 에이전트에 전달
    await sendAnswerToAgent(taskId, answer);

    // 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'running',
      blockedBy: null,
      blockedReason: null,
    });

    // 에이전트 재개
    resumeAgentExecution({ taskId });

    console.log(`Answer provided for question: ${questionId}`);
    return true;
  } catch (error) {
    console.error(`Failed to provide answer for ${questionId}:`, error);
    return false;
  }
}

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

---

### 4. Skip Question

선택적 질문을 건너뜁니다 (기본값 사용).

**Endpoint**: `POST /api/questions/:id/skip`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Question skipped successfully"
}
```

**Errors**:
- `404 Not Found`: Question이 존재하지 않음
- `400 Bad Request`: 필수 질문은 건너뛸 수 없음

**구현 예시**:
```typescript
// app/api/questions/[id]/skip/route.ts
import { skipQuestion } from '@/lib/questions/skipper';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const question = await db.question.findUnique({
      where: { id: params.id },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // 필수 질문은 건너뛸 수 없음
    if (question.required) {
      return NextResponse.json(
        { error: 'Cannot skip required question' },
        { status: 400 }
      );
    }

    const success = await skipQuestion(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to skip question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Question skipped successfully',
    });
  } catch (error) {
    console.error('Failed to skip question:', error);
    return NextResponse.json(
      { error: 'Failed to skip question' },
      { status: 500 }
    );
  }
}
```

### 건너뛰기 구현

```typescript
// lib/questions/skipper.ts
export async function skipQuestion(questionId: string): Promise<boolean> {
  try {
    const question = await db.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      console.error(`Question not found: ${questionId}`);
      return false;
    }

    if (question.required) {
      console.error(`Cannot skip required question: ${questionId}`);
      return false;
    }

    // 기본값 사용
    const answer = question.default || '';

    // 답변 제공
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

## 질문 카테고리

```typescript
type QuestionCategory =
  | 'business'       // 비즈니스 결정 (예: 수익 모델, 가격 전략)
  | 'clarification'  // 요구사항 명확화 (예: 타겟 사용자, 기능 범위)
  | 'choice'         // 기술 선택 (예: 프레임워크, 데이터베이스)
  | 'confirmation';  // 확인 (예: 이대로 진행할까요?)
```

## UI 컴포넌트 예시

### 질문 카드

```tsx
// components/QuestionCard.tsx
import { useState } from 'react';

interface QuestionCardProps {
  question: {
    id: string;
    category: string;
    question: string;
    options?: string[];
    default?: string;
    required: boolean;
  };
  onAnswer: (answer: string) => Promise<void>;
  onSkip?: () => Promise<void>;
}

export function QuestionCard({ question, onAnswer, onSkip }: QuestionCardProps) {
  const [answer, setAnswer] = useState<string>(question.default || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (question.required && !answer) {
      alert('이 질문은 필수입니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAnswer(answer);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('답변 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (question.required) return;

    setIsSubmitting(true);
    try {
      await onSkip?.();
    } catch (error) {
      console.error('Failed to skip question:', error);
      alert('질문 건너뛰기에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500 uppercase">
          {question.category}
        </span>
        {question.required && (
          <span className="ml-2 text-xs text-red-500">필수</span>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-4">{question.question}</h3>

      {question.options && question.options.length > 0 ? (
        <div className="space-y-2 mb-4">
          {question.options.map((option) => (
            <label
              key={option}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="radio"
                name="answer"
                value={option}
                checked={answer === option}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="답변을 입력하세요..."
          className="w-full border rounded p-2 mb-4"
          rows={4}
        />
      )}

      <div className="flex space-x-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (question.required && !answer)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? '제출 중...' : '답변 제출'}
        </button>

        {!question.required && (
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
```

### 질문 목록

```tsx
// components/QuestionsList.tsx
import { QuestionCard } from './QuestionCard';

export function QuestionsList({ taskId }: { taskId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['questions', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/questions?taskId=${taskId}&status=pending`);
      return res.json();
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const res = await fetch(`/api/questions/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) throw new Error('Failed to answer');
      return res.json();
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch(`/api/questions/${questionId}/skip`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to skip');
      return res.json();
    },
  });

  if (isLoading) return <div>로딩 중...</div>;

  const questions = data?.data?.questions || [];

  if (questions.length === 0) {
    return <div className="text-gray-500">대기 중인 질문이 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      {questions.map((question: any) => (
        <QuestionCard
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            answerMutation.mutateAsync({ questionId: question.id, answer })
          }
          onSkip={() => skipMutation.mutateAsync(question.id)}
        />
      ))}
    </div>
  );
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../../agent-manager/docs/protocols/question.md`** - 질문 처리 프로토콜
2. **`tasks-api.md`** - Task 상태와의 연동
3. **`../features/protocol-parsing.md`** - 프로토콜 파싱
4. **`../../CLAUDE.md`** - API 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - API 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`../features/protocol-parsing.md`** - 프로토콜 파싱
4. **Front-end**: UI 컴포넌트에서 API 호출

## 다음 단계

- **Protocol Parsing**: `../features/protocol-parsing.md` - 프로토콜 파싱
- **Tasks API**: `tasks-api.md` - Tasks API
- **Agent Manager - Question Protocol**: `../../agent-manager/docs/protocols/question.md`

## 관련 문서

- **Protocol Parsing**: `../features/protocol-parsing.md`
- **Tasks API**: `tasks-api.md`
- **Reviews API**: `reviews-api.md`
- **Dependencies API**: `dependencies-api.md`
- **Agent Manager - Question Protocol**: `../../agent-manager/docs/protocols/question.md`
- **Sub-Agent - User Question**: `../../sub-agent/docs/protocols/user-question.md`
