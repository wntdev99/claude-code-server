# 프로토콜 파싱

## 개요

에이전트 출력에서 구조화된 프로토콜 메시지를 감지하고 파싱하는 방법을 설명합니다.

> **중요**: 이 문서는 **웹 서버에서의 파싱 로직**을 다룹니다.
> **에이전트 관리자의 프로토콜 처리**는 `../../agent-manager/docs/protocols/` 참조

## 프로토콜 타입

### 지원되는 프로토콜

```typescript
// types/protocols.ts
export type Protocol =
  | DependencyRequest
  | UserQuestion
  | PhaseCompletion
  | ErrorReport
  | StepUpdate;

export interface DependencyRequest {
  type: 'api_key' | 'env_variable' | 'service' | 'file' | 'permission' | 'package';
  name: string;
  description: string;
  required: boolean;
}

export interface UserQuestion {
  category: 'business' | 'clarification' | 'choice' | 'confirmation';
  question: string;
  options?: string[];
  default?: string;
  required: boolean;
}

export interface PhaseCompletion {
  phase: number;
  name: string;
  deliverables: string[];
}

export interface ErrorReport {
  type: 'missing_file' | 'execution_failed' | 'validation_error' | 'dependency_missing';
  message: string;
  details?: string;
}

export interface StepUpdate {
  step: string;
  progress: number;
  total: number;
}
```

## 파싱 구현

### 메인 파서

```typescript
// lib/agent/parser.ts
import { emitLogEvent } from './stream';

export function parseAgentOutput(taskId: string, output: string) {
  // 1. 의존성 요청 감지
  const dependencyRequest = parseDependencyRequest(output);
  if (dependencyRequest) {
    handleDependencyRequest(taskId, dependencyRequest);
    return;
  }

  // 2. 사용자 질문 감지
  const userQuestion = parseUserQuestion(output);
  if (userQuestion) {
    handleUserQuestion(taskId, userQuestion);
    return;
  }

  // 3. Phase 완료 감지
  const phaseCompletion = parsePhaseCompletion(output);
  if (phaseCompletion) {
    handlePhaseCompletion(taskId, phaseCompletion);
    return;
  }

  // 4. 에러 감지
  const errorReport = parseErrorReport(output);
  if (errorReport) {
    handleErrorReport(taskId, errorReport);
    return;
  }

  // 5. Step 업데이트 감지
  const stepUpdate = parseStepUpdate(output);
  if (stepUpdate) {
    handleStepUpdate(taskId, stepUpdate);
    return;
  }

  // 6. 일반 로그 (프로토콜 아님)
  emitLogEvent(taskId, {
    type: 'log',
    data: {
      timestamp: new Date().toISOString(),
      message: output,
      level: 'info',
    },
  });
}
```

### 의존성 요청 파싱

```typescript
// lib/agent/parser.ts
function parseDependencyRequest(output: string): DependencyRequest | null {
  // 패턴: [DEPENDENCY_REQUEST]...[/DEPENDENCY_REQUEST]
  const match = output.match(/\[DEPENDENCY_REQUEST\]([\s\S]*?)\[\/DEPENDENCY_REQUEST\]/);
  if (!match) return null;

  const content = match[1];

  try {
    const type = extractField(content, 'type');
    const name = extractField(content, 'name');
    const description = extractField(content, 'description');
    const required = extractField(content, 'required') === 'true';

    // 검증
    if (!type || !name || !description) {
      console.error('Invalid dependency request: missing required fields');
      return null;
    }

    const validTypes = ['api_key', 'env_variable', 'service', 'file', 'permission', 'package'];
    if (!validTypes.includes(type)) {
      console.error(`Invalid dependency type: ${type}`);
      return null;
    }

    return { type, name, description, required } as DependencyRequest;
  } catch (error) {
    console.error('Failed to parse dependency request:', error);
    return null;
  }
}

function extractField(content: string, fieldName: string): string {
  const regex = new RegExp(`${fieldName}:\\s*(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}
```

### 사용자 질문 파싱

```typescript
// lib/agent/parser.ts
function parseUserQuestion(output: string): UserQuestion | null {
  const match = output.match(/\[USER_QUESTION\]([\s\S]*?)\[\/USER_QUESTION\]/);
  if (!match) return null;

  const content = match[1];

  try {
    const category = extractField(content, 'category');
    const question = extractField(content, 'question');
    const optionsStr = extractField(content, 'options');
    const defaultValue = extractField(content, 'default');
    const required = extractField(content, 'required') === 'true';

    if (!category || !question) {
      return null;
    }

    // options 파싱 (옵션이 있는 경우)
    let options: string[] | undefined;
    if (optionsStr) {
      // 형식: [option1, option2, option3] 또는 - option1 \n - option2
      if (optionsStr.startsWith('[')) {
        options = optionsStr
          .slice(1, -1)
          .split(',')
          .map(o => o.trim());
      } else {
        options = optionsStr
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-'))
          .map(line => line.substring(1).trim());
      }
    }

    return {
      category,
      question,
      options,
      default: defaultValue || undefined,
      required,
    } as UserQuestion;
  } catch (error) {
    console.error('Failed to parse user question:', error);
    return null;
  }
}
```

### Phase 완료 파싱

```typescript
// lib/agent/parser.ts
function parsePhaseCompletion(output: string): PhaseCompletion | null {
  const match = output.match(/=== PHASE (\d+) COMPLETE ===/);
  if (!match) return null;

  const phase = parseInt(match[1]);

  // Phase 이름 추출
  const nameMatch = output.match(/Completed:\s*Phase\s*\d+\s*\((.+)\)/i);
  const name = nameMatch ? nameMatch[1].trim() : `Phase ${phase}`;

  // 산출물 목록 추출
  const deliverables: string[] = [];
  const lines = output.split('\n');
  let inDeliverables = false;

  for (const line of lines) {
    if (line.includes('Documents created:') || line.includes('Files created:')) {
      inDeliverables = true;
      continue;
    }

    if (inDeliverables) {
      const fileMatch = line.match(/^[\s-]*(.+\.(?:md|ts|tsx|js|jsx|json|yaml|yml))$/);
      if (fileMatch) {
        deliverables.push(fileMatch[1].trim());
      } else if (line.trim() === '' || line.includes('===')) {
        break;
      }
    }
  }

  return { phase, name, deliverables };
}
```

### 에러 파싱

```typescript
// lib/agent/parser.ts
function parseErrorReport(output: string): ErrorReport | null {
  const match = output.match(/\[ERROR\]([\s\S]*?)\[\/ERROR\]/);
  if (!match) return null;

  const content = match[1];

  try {
    const type = extractField(content, 'type');
    const message = extractField(content, 'message');
    const details = extractField(content, 'details');

    if (!type || !message) {
      return null;
    }

    return {
      type,
      message,
      details: details || undefined,
    } as ErrorReport;
  } catch (error) {
    console.error('Failed to parse error report:', error);
    return null;
  }
}
```

### Step 업데이트 파싱

```typescript
// lib/agent/parser.ts
function parseStepUpdate(output: string): StepUpdate | null {
  // 패턴: "Step 3/9: Feature Specification" 또는 "현재 Step: 3/9"
  const patterns = [
    /Step\s+(\d+)\/(\d+):\s*(.+)/i,
    /현재\s*Step:\s*(\d+)\/(\d+):\s*(.+)/i,
    /Step\s+(\d+)\s*of\s*(\d+):\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return {
        step: match[3].trim(),
        progress: parseInt(match[1]),
        total: parseInt(match[2]),
      };
    }
  }

  return null;
}
```

## 프로토콜 핸들러

### 의존성 요청 처리

```typescript
// lib/agent/handlers.ts
import { pauseAgent } from './executor';

async function handleDependencyRequest(taskId: string, request: DependencyRequest) {
  console.log(`Dependency request for ${taskId}:`, request);

  // 1. 에이전트 일시 중지
  pauseAgent(taskId);

  // 2. 데이터베이스에 저장
  await db.dependency.create({
    data: {
      taskId,
      type: request.type,
      name: request.name,
      description: request.description,
      required: request.required,
      status: 'pending',
    },
  });

  // 3. 에이전트 상태 업데이트
  await updateAgentStatus(taskId, {
    status: 'waiting_dependency',
    blockedBy: 'dependency',
    blockedReason: `Waiting for: ${request.name}`,
  });

  // 4. SSE 이벤트 전송
  emitLogEvent(taskId, {
    type: 'dependency_request',
    data: request,
  });
}
```

### 사용자 질문 처리

```typescript
// lib/agent/handlers.ts
async function handleUserQuestion(taskId: string, question: UserQuestion) {
  console.log(`User question for ${taskId}:`, question);

  // 1. 에이전트 일시 중지
  pauseAgent(taskId);

  // 2. 데이터베이스에 저장
  await db.question.create({
    data: {
      taskId,
      category: question.category,
      question: question.question,
      options: question.options || [],
      default: question.default,
      required: question.required,
      status: 'pending',
    },
  });

  // 3. 에이전트 상태 업데이트
  await updateAgentStatus(taskId, {
    status: 'waiting_question',
    blockedBy: 'question',
    blockedReason: question.question,
  });

  // 4. SSE 이벤트 전송
  emitLogEvent(taskId, {
    type: 'user_question',
    data: question,
  });
}
```

### Phase 완료 처리

```typescript
// lib/agent/handlers.ts
async function handlePhaseCompletion(taskId: string, completion: PhaseCompletion) {
  console.log(`Phase ${completion.phase} completed for ${taskId}`);

  // 1. 에이전트 일시 중지
  pauseAgent(taskId);

  // 2. Phase 상태 업데이트
  await db.phase.update({
    where: {
      taskId_phase: {
        taskId,
        phase: completion.phase,
      },
    },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // 3. 리뷰 생성
  const review = await db.review.create({
    data: {
      taskId,
      phase: completion.phase,
      deliverables: completion.deliverables,
      status: 'pending',
    },
  });

  // 4. 에이전트 상태 업데이트
  await updateAgentStatus(taskId, {
    status: 'waiting_review',
    blockedBy: 'review',
    blockedReason: `Phase ${completion.phase} awaiting review`,
    currentPhase: completion.phase,
  });

  // 5. SSE 이벤트 전송
  emitLogEvent(taskId, {
    type: 'review_required',
    data: {
      reviewId: review.id,
      phase: completion.phase,
      deliverables: completion.deliverables,
    },
  });
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/agent/parser.test.ts
import { parseDependencyRequest, parseUserQuestion } from '@/lib/agent/parser';

describe('Protocol Parser', () => {
  describe('parseDependencyRequest', () => {
    it('should parse valid dependency request', () => {
      const output = `
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for AI features
required: true
[/DEPENDENCY_REQUEST]
      `;

      const result = parseDependencyRequest(output);

      expect(result).toEqual({
        type: 'api_key',
        name: 'OPENAI_API_KEY',
        description: 'Required for AI features',
        required: true,
      });
    });

    it('should return null for invalid format', () => {
      const output = 'Just some regular text';
      const result = parseDependencyRequest(output);
      expect(result).toBeNull();
    });
  });

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
  });
});
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`process-management.md`** - 프로세스 출력 처리
2. **`../../agent-manager/docs/protocols/`** - 프로토콜 핸들링 (중복 로직 동기화)
3. **`../../sub-agent/docs/protocols/`** - 프로토콜 형식 (양방향 동기화)
4. **`../api/dependencies-api.md`** - Dependency API 명세
5. **`../api/questions-api.md`** - Question API 명세

### 이 문서를 참조하는 문서

1. **`../README.md`** - Features 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개발 가이드
3. **`process-management.md`** - 프로세스 출력 수신
4. **`task-management.md`** - Task 상태 관리

## 다음 단계

- **프로세스 관리**: `process-management.md` - 에이전트 프로세스 제어
- **Task 관리**: `task-management.md` - Task 생명주기
- **에이전트 관리자 프로토콜**: `../../agent-manager/docs/protocols/` - 상세 프로토콜 처리

## 관련 문서

- **Process Management**: `process-management.md`
- **Agent Manager - Protocols**: `../../agent-manager/docs/protocols/README.md`
- **Sub-Agent - Protocols**: `../../sub-agent/docs/protocols/README.md`
- **API - Dependencies**: `../api/dependencies-api.md`
- **API - Questions**: `../api/questions-api.md`
