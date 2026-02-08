# API 문서

## 개요

Claude Code Server는 작업 관리, 리뷰, 의존성, 질문 및 설정을 위한 RESTful API를 제공합니다. 모든 API는 웹 서버를 통해 액세스할 수 있습니다.

**Base URL**: `http://localhost:3000/api` (개발 환경)

**응답 형식**: JSON

**인증**: API Key (선택 사항, 설정에서 구성)

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... }
}
```

### 오류 응답
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

## Tasks API

### Create Task

**Endpoint**: `POST /api/tasks`

**설명**: 새 작업 생성

**Request Body**:
```json
{
  "title": "Build Todo App",
  "type": "create_app",
  "description": "Create a full-stack todo application with React and Node.js",
  "outputDirectory": "/path/to/output"
}
```

**매개변수**:
- `title` (string, 필수): 작업 제목
- `type` (string, 필수): 작업 유형 - `create_app`, `modify_app`, `workflow`, `custom`
- `description` (string, 필수): 상세 작업 설명
- `outputDirectory` (string, 선택): 출력 디렉토리 경로

**Workflow Type Validation**:

API는 `type` 필드를 검증하여 유효한 workflow type만 허용합니다.

**유효한 Workflow Types**:
- `create_app` - 새 애플리케이션 생성
- `modify_app` - 기존 애플리케이션 수정
- `workflow` - 워크플로우 자동화 생성
- `custom` - 자유 형식 작업

**검증 로직**:

```typescript
// API Route Handler: POST /api/tasks
import { z } from 'zod';

const VALID_WORKFLOW_TYPES = ['create_app', 'modify_app', 'workflow', 'custom'] as const;
type WorkflowType = typeof VALID_WORKFLOW_TYPES[number];

// Zod schema for validation
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(VALID_WORKFLOW_TYPES, {
    errorMap: () => ({ message: 'Invalid workflow type' }),
  }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  outputDirectory: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate request body
    const result = CreateTaskSchema.safeParse(body);

    if (!result.success) {
      // Validation failed
      const errors = result.error.format();

      // Check if error is due to invalid workflow type
      if (errors.type) {
        // Attempt fuzzy matching for typos
        const suggestion = findClosestMatch(body.type, VALID_WORKFLOW_TYPES);

        return Response.json({
          success: false,
          error: {
            code: 'INVALID_WORKFLOW_TYPE',
            message: `Invalid workflow type: "${body.type}"`,
            suggestion: suggestion
              ? `Did you mean "${suggestion}"?`
              : 'Please use one of: create_app, modify_app, workflow, custom',
            validTypes: VALID_WORKFLOW_TYPES,
          },
        }, { status: 400 });
      }

      // Other validation errors
      return Response.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors,
        },
      }, { status: 400 });
    }

    // Validation passed - create task
    const task = await createTask(result.data);

    return Response.json({
      success: true,
      data: task,
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    }, { status: 500 });
  }
}

/**
 * 퍼지 매칭으로 가장 가까운 유효한 workflow type 찾기
 */
function findClosestMatch(
  input: string,
  validTypes: readonly string[]
): string | null {
  const normalized = input.toLowerCase().replace(/[-\s]/g, '_');

  // 정확히 일치 (대소문자 무시, 구분자 정규화)
  for (const validType of validTypes) {
    if (validType === normalized) {
      return validType;
    }
  }

  // Levenshtein distance 기반 유사도 매칭
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const validType of validTypes) {
    const distance = levenshteinDistance(normalized, validType);
    const similarity = 1 - distance / Math.max(normalized.length, validType.length);

    // 70% 이상 유사하면 제안
    if (similarity >= 0.7 && distance < bestDistance) {
      bestMatch = validType;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

/**
 * Levenshtein distance 계산
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}
```

**에러 응답 예시**:

```json
// Invalid workflow type with suggestion
{
  "success": false,
  "error": {
    "code": "INVALID_WORKFLOW_TYPE",
    "message": "Invalid workflow type: \"create-app\"",
    "suggestion": "Did you mean \"create_app\"?",
    "validTypes": ["create_app", "modify_app", "workflow", "custom"]
  }
}

// Invalid workflow type without close match
{
  "success": false,
  "error": {
    "code": "INVALID_WORKFLOW_TYPE",
    "message": "Invalid workflow type: \"unknown_type\"",
    "suggestion": "Please use one of: create_app, modify_app, workflow, custom",
    "validTypes": ["create_app", "modify_app", "workflow", "custom"]
  }
}
```

**프론트엔드 처리**:

```typescript
// React Component - Task Creation Form
import { useState } from 'react';

const WORKFLOW_TYPES = [
  { value: 'create_app', label: 'Create New App', icon: '🚀' },
  { value: 'modify_app', label: 'Modify Existing App', icon: '🔧' },
  { value: 'workflow', label: 'Workflow Automation', icon: '⚙️' },
  { value: 'custom', label: 'Custom Task', icon: '💬' },
];

export function CreateTaskForm() {
  const [workflowType, setWorkflowType] = useState<string>('create_app');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Task',
          type: workflowType,
          description: '...',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // 서버 검증 에러 처리
        if (result.error.code === 'INVALID_WORKFLOW_TYPE') {
          setError(`${result.error.message}\n${result.error.suggestion}`);
        } else {
          setError(result.error.message);
        }
        return;
      }

      // Success - redirect to task page
      window.location.href = `/tasks/${result.data.id}`;

    } catch (error) {
      setError('Failed to create task. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Workflow Type</label>

      {/* Dropdown으로 유효한 타입만 선택 가능 */}
      <select
        value={workflowType}
        onChange={(e) => setWorkflowType(e.target.value)}
        required
      >
        {WORKFLOW_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.icon} {type.label}
          </option>
        ))}
      </select>

      {error && <div className="error">{error}</div>}

      <button type="submit">Create Task</button>
    </form>
  );
}
```

**예시 시나리오**:

| 입력 | 결과 | 제안 |
|------|------|------|
| `create-app` | ❌ Invalid | `create_app` (정규화) |
| `createApp` | ❌ Invalid | `create_app` (정규화) |
| `new_app` | ❌ Invalid | `create_app` (유사도 70%) |
| `modify` | ❌ Invalid | `modify_app` (부분 일치) |
| `unknown_type` | ❌ Invalid | (제안 없음, 전체 목록 표시) |
| `create_app` | ✅ Valid | - |

**Best Practice**:

1. **프론트엔드에서 Dropdown 사용**
   - 사용자가 유효한 타입만 선택할 수 있도록 제한
   - 오타 발생 방지

2. **서버 측 검증 필수**
   - 프론트엔드 우회 가능성 대비
   - API를 직접 호출하는 클라이언트 지원

3. **명확한 에러 메시지**
   - 무엇이 잘못되었는지 명확히 전달
   - 유효한 옵션 제시
   - 가능하면 수정 제안 제공

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "title": "Build Todo App",
    "type": "create_app",
    "status": "draft",
    "description": "...",
    "currentPhase": null,
    "progress": 0,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### List Tasks

**Endpoint**: `GET /api/tasks`

**설명**: 선택적 필터링이 가능한 모든 작업 목록 조회

**Query 매개변수**:
- `status` (string, 선택): 상태별 필터링 - `draft`, `pending`, `in_progress`, `review`, `completed`, `failed`
- `type` (string, 선택): 유형별 필터링
- `page` (number, 선택): 페이지 번호 (기본값: 1)
- `pageSize` (number, 선택): 페이지당 항목 수 (기본값: 20)

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "title": "Build Todo App",
        "type": "create_app",
        "status": "in_progress",
        "currentPhase": 2,
        "progress": 45,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "pageSize": 20,
      "totalPages": 3
    }
  }
}
```

### Get Task

**Endpoint**: `GET /api/tasks/{id}`

**설명**: 작업 상세 정보 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "title": "Build Todo App",
    "type": "create_app",
    "status": "in_progress",
    "description": "...",
    "currentPhase": 2,
    "progress": 45,
    "createdAt": "2025-01-15T10:00:00Z",
    "startedAt": "2025-01-15T10:05:00Z",
    "phases": [
      {
        "phase": 1,
        "name": "Planning",
        "status": "completed",
        "completedAt": "2025-01-15T11:00:00Z"
      },
      {
        "phase": 2,
        "name": "Design",
        "status": "in_progress",
        "startedAt": "2025-01-15T11:05:00Z"
      }
    ]
  }
}
```

### Update Task

**Endpoint**: `PATCH /api/tasks/{id}`

**설명**: 작업 속성 업데이트

**Request Body**:
```json
{
  "title": "Updated title",
  "description": "Updated description"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "title": "Updated title",
    ...
  }
}
```

### Delete Task

**Endpoint**: `DELETE /api/tasks/{id}`

**설명**: 작업 삭제 (진행 중이 아닐 때만 가능)

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "deleted": true
  }
}
```

### Execute Task

**Endpoint**: `POST /api/tasks/{id}/execute`

**설명**: 작업 실행 시작

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "in_progress",
    "startedAt": "2025-01-15T10:05:00Z"
  }
}
```

### Pause Task

**Endpoint**: `POST /api/tasks/{id}/pause`

**설명**: 작업 실행 일시 중지

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "paused",
    "pausedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Resume Task

**Endpoint**: `POST /api/tasks/{id}/resume`

**설명**: 일시 중지된 작업 재개

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "in_progress",
    "resumedAt": "2025-01-15T10:35:00Z"
  }
}
```

### Cancel Task

**Endpoint**: `POST /api/tasks/{id}/cancel`

**설명**: 작업 실행 취소

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "failed",
    "cancelledAt": "2025-01-15T10:40:00Z"
  }
}
```

### Stream Task Logs (SSE)

**Endpoint**: `GET /api/tasks/{id}/stream`

**설명**: Server-Sent Events를 통한 실시간 작업 로그 스트리밍

**응답** (200 OK):
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"log","data":{"timestamp":"2025-01-15T10:05:00Z","message":"Starting Phase 1: Planning"}}

data: {"type":"phase_update","data":{"phase":1,"status":"in_progress"}}

data: {"type":"step_update","data":{"step":"Idea Definition","progress":10}}

data: {"type":"dependency_request","data":{"type":"api_key","name":"OPENAI_API_KEY"}}

data: {"type":"complete","data":{"success":true}}
```

**이벤트 유형**:
- `log`: 일반 로그 메시지
- `phase_update`: 페이즈 상태 변경
- `step_update`: 단계 진행률 업데이트
- `dependency_request`: 에이전트가 의존성 요청
- `user_question`: 에이전트가 질문
- `review_required`: 페이즈 리뷰 필요
- `complete`: 작업 완료
- `error`: 오류 발생

### Get Agent Status

**Endpoint**: `GET /api/tasks/{id}/status`

**설명**: 현재 에이전트 상태 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "running",
    "currentAction": "Writing docs/planning/01_idea.md",
    "currentPhase": 1,
    "currentStep": "Idea Definition",
    "progress": 10,
    "tokensUsed": 15420,
    "lastUpdate": "2025-01-15T10:10:00Z",
    "recentActions": [
      {
        "timestamp": "2025-01-15T10:10:00Z",
        "action": "Writing docs/planning/01_idea.md"
      },
      {
        "timestamp": "2025-01-15T10:09:00Z",
        "action": "Reading guide/planning/01_idea.md"
      }
    ]
  }
}
```

### Get Phase List

**Endpoint**: `GET /api/tasks/{id}/phases`

**설명**: 작업의 페이즈 목록 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "phases": [
      {
        "phase": 1,
        "name": "Planning",
        "status": "completed",
        "steps": 9,
        "completedSteps": 9,
        "startedAt": "2025-01-15T10:05:00Z",
        "completedAt": "2025-01-15T11:00:00Z"
      },
      {
        "phase": 2,
        "name": "Design",
        "status": "in_progress",
        "steps": 5,
        "completedSteps": 2,
        "startedAt": "2025-01-15T11:05:00Z"
      }
    ]
  }
}
```

## Reviews API

### List Reviews

**Endpoint**: `GET /api/tasks/{id}/reviews`

**설명**: 작업의 모든 리뷰 목록 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_123",
        "taskId": "task_123",
        "phase": 1,
        "status": "approved",
        "deliverables": [
          "docs/planning/01_idea.md",
          "docs/planning/02_market.md",
          ...
        ],
        "createdAt": "2025-01-15T11:00:00Z",
        "reviewedAt": "2025-01-15T11:10:00Z"
      }
    ]
  }
}
```

### Create Review

**Endpoint**: `POST /api/tasks/{id}/reviews`

**설명**: 페이즈에 대한 리뷰 생성 (일반적으로 자동)

**Request Body**:
```json
{
  "phase": 1,
  "deliverables": [
    "docs/planning/01_idea.md",
    "docs/planning/02_market.md"
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "review_123",
    "taskId": "task_123",
    "phase": 1,
    "status": "pending",
    "deliverables": [...],
    "createdAt": "2025-01-15T11:00:00Z"
  }
}
```

### Approve Review

**Endpoint**: `PATCH /api/reviews/{id}/approve`

**설명**: 페이즈 리뷰 승인

**Request Body** (선택):
```json
{
  "comment": "Looks good! Proceeding to design phase."
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "review_123",
    "status": "approved",
    "reviewedAt": "2025-01-15T11:10:00Z",
    "comment": "Looks good! Proceeding to design phase."
  }
}
```

### Request Changes

**Endpoint**: `PATCH /api/reviews/{id}/request-changes`

**설명**: 결과물에 대한 변경 요청

**Request Body**:
```json
{
  "feedback": "Please add more detail to the market analysis section."
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "review_123",
    "status": "changes_requested",
    "reviewedAt": "2025-01-15T11:10:00Z",
    "feedback": "Please add more detail to the market analysis section."
  }
}
```

### Add Feedback

**Endpoint**: `POST /api/reviews/{id}/feedback`

**설명**: 파일별 피드백 추가

**Request Body**:
```json
{
  "file": "docs/planning/02_market.md",
  "lineNumber": 15,
  "comment": "Need competitor pricing analysis here",
  "type": "suggestion"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "feedback_123",
    "reviewId": "review_123",
    "file": "docs/planning/02_market.md",
    "lineNumber": 15,
    "comment": "Need competitor pricing analysis here",
    "type": "suggestion",
    "status": "open",
    "createdAt": "2025-01-15T11:12:00Z"
  }
}
```

## Questions API

### List Questions

**Endpoint**: `GET /api/tasks/{id}/questions`

**설명**: 작업의 모든 질문 목록 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "question_123",
        "taskId": "task_123",
        "category": "business",
        "question": "What revenue model do you prefer?",
        "options": ["Subscription", "Freemium", "Ad-based"],
        "default": "Freemium",
        "required": false,
        "status": "pending",
        "askedAt": "2025-01-15T10:25:00Z"
      }
    ]
  }
}
```

### Answer Question

**Endpoint**: `POST /api/questions/{id}/answer`

**설명**: 에이전트 질문에 답변

**Request Body**:
```json
{
  "answer": "Freemium"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "question_123",
    "status": "answered",
    "answer": "Freemium",
    "answeredAt": "2025-01-15T10:30:00Z"
  }
}
```

## Verifications API

### Get Verification Reports

**Endpoint**: `GET /api/tasks/{id}/verifications`

**설명**: 작업 페이즈의 검증 리포트 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "id": "verify_123",
        "taskId": "task_123",
        "phase": 1,
        "status": "passed",
        "criteria": [
          {
            "name": "All documents exist",
            "status": "passed",
            "message": "All 9 planning documents found"
          },
          {
            "name": "Minimum length requirement",
            "status": "passed",
            "message": "All documents meet 500 character minimum"
          }
        ],
        "verifiedAt": "2025-01-15T10:58:00Z"
      }
    ]
  }
}
```

## Settings API

### Get Settings

**Endpoint**: `GET /api/settings`

**설명**: 플랫폼 설정 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "claude_model": "claude-sonnet-4-5",
    "claude_max_tokens": 8000,
    "claude_auto_accept": true,
    "output_directory": "/path/to/projects",
    "supabase_url": "https://...",
    "github_token": "ghp_***"
  }
}
```

**참고**: Claude Code CLI 인증은 `claude login`을 통해 별도로 관리됩니다. 설정에 API 키가 저장되지 않습니다.

### Update Settings

**Endpoint**: `PATCH /api/settings`

**설명**: 플랫폼 설정 업데이트

**Request Body**:
```json
{
  "claude_model": "claude-opus-4-6",
  "output_directory": "/new/path"
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "claude_model": "claude-opus-4-6",
    "output_directory": "/new/path",
    ...
  }
}
```

## Workflows API

> **참고**: Workflow 기능은 Phase-C (workflow) 작업 타입을 위한 것입니다.

### List Workflows

**Endpoint**: `GET /api/workflows`

**설명**: 모든 workflow 목록 조회

**쿼리 파라미터**:
- `status` (선택): `active` | `inactive` | `draft`
- `page` (선택): 페이지 번호 (기본값: 1)
- `limit` (선택): 페이지당 항목 수 (기본값: 20)

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "wf_abc123",
        "name": "GitHub PR Notification",
        "status": "active",
        "triggers": ["webhook"],
        "steps": 5,
        "createdAt": "2025-01-15T08:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45 }
  }
}
```

### Create Workflow

**Endpoint**: `POST /api/workflows`

**설명**: 새 workflow 생성

**Request Body**:
```json
{
  "name": "GitHub PR Notification",
  "description": "Send Slack notification on new PR",
  "triggers": [{ "type": "webhook", "config": { "url": "/webhooks/github" } }],
  "steps": [
    { "name": "Parse Event", "type": "transform", "config": {} },
    { "name": "Send Slack", "type": "action", "config": { "channel": "#dev" } }
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "wf_abc123",
    "name": "GitHub PR Notification",
    "status": "active",
    "createdAt": "2025-02-07T10:30:00Z"
  }
}
```

### Execute Workflow

**Endpoint**: `POST /api/workflows/{id}/execute`

**설명**: Workflow 즉시 실행 (수동 트리거)

**Request Body** (선택):
```json
{
  "input": { "pr": { "title": "Fix bug", "author": "john" } }
}
```

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "executionId": "exec_xyz789",
    "workflowId": "wf_abc123",
    "status": "running",
    "startedAt": "2025-02-07T11:15:00Z"
  }
}
```

### Get Workflow Execution

**Endpoint**: `GET /api/workflows/{workflowId}/executions/{executionId}`

**설명**: Workflow 실행 상태 조회

**응답** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "exec_xyz789",
    "status": "completed",
    "startedAt": "2025-02-07T11:15:00Z",
    "completedAt": "2025-02-07T11:15:23Z",
    "steps": [
      { "stepId": "step_1", "status": "completed", "duration": 120 },
      { "stepId": "step_2", "status": "completed", "duration": 850 }
    ]
  }
}
```

**참고**: Workflow 상세 구현은 `/docs/WORKFLOWS.md` Phase-C 섹션 참조

## 오류 코드

| Code | Description |
|------|-------------|
| 400 | Bad Request - 잘못된 입력 |
| 401 | Unauthorized - API 키 누락/잘못됨 |
| 403 | Forbidden - 권한 부족 |
| 404 | Not Found - 리소스가 존재하지 않음 |
| 409 | Conflict - 리소스 상태 충돌 |
| 429 | Too Many Requests - 속도 제한 초과 |
| 500 | Internal Server Error - 서버 오류 |

## 속도 제한

- **기본값**: IP당 분당 100 요청
- **인증됨**: API 키당 분당 1000 요청
- **SSE 연결**: 사용자당 최대 10개 동시 연결

**응답 헤더**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315200
```

## 인증

### API 키 인증

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.example.com/api/tasks
```

### Bearer Token (향후 제공)

```bash
curl -H "Authorization: Bearer your-token" \
  https://api.example.com/api/tasks
```

## Webhooks (Phase 3 기능)

이벤트를 수신하도록 웹훅 구성:

**이벤트**:
- `task.created`
- `task.started`
- `task.completed`
- `task.failed`
- `phase.completed`
- `review.created`
- `dependency.requested`
- `question.asked`

**Webhook 페이로드**:
```json
{
  "event": "task.completed",
  "timestamp": "2025-01-15T12:00:00Z",
  "data": {
    "taskId": "task_123",
    "title": "Build Todo App",
    "status": "completed"
  }
}
```

## Event Ordering and Delivery Guarantees

### 개요

SSE 스트리밍에서는 여러 이벤트가 동시에 발생할 수 있으며 (로그, 상태 변경, 질문 등), 네트워크 지연이나 버퍼링으로 인해 이벤트가 순서대로 도착하지 않을 수 있습니다. 이는 클라이언트에서 잘못된 상태 표시나 UI 깜빡임을 유발할 수 있습니다.

### 문제 상황

```
Server sends:
  Event 1: log (seq=100)
  Event 2: phase_update (seq=101)
  Event 3: log (seq=102)
  Event 4: user_question (seq=103)

Client receives (network reordering):
  Event 1: log (seq=100)
  Event 3: log (seq=102)  ← Out of order!
  Event 2: phase_update (seq=101)  ← Gap detected
  Event 4: user_question (seq=103)
```

### 해결 방안: Sequence Numbers + Client-side Reordering

모든 SSE 이벤트에 단조 증가하는 시퀀스 번호를 부여하고, 클라이언트에서 버퍼링 및 재정렬을 수행합니다.

### TypeScript 인터페이스

```typescript
// packages/shared/src/types/sse-events.ts

/**
 * SSE 이벤트 기본 구조
 */
export interface SSEEvent {
  id: string;              // 고유 이벤트 ID
  taskId: string;          // Task ID
  sequence: number;        // 시퀀스 번호 (단조 증가)
  timestamp: string;       // ISO 8601 timestamp
  type: SSEEventType;      // 이벤트 타입
  data: any;               // 이벤트 데이터
}

export type SSEEventType =
  | 'log'
  | 'state_change'
  | 'phase_update'
  | 'user_question'
  | 'dependency_request'
  | 'phase_complete'
  | 'task_complete'
  | 'error';

/**
 * 로그 이벤트
 */
export interface LogEvent extends SSEEvent {
  type: 'log';
  data: {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, any>;
  };
}

/**
 * 상태 변경 이벤트
 */
export interface StateChangeEvent extends SSEEvent {
  type: 'state_change';
  data: {
    from: AgentState;
    to: AgentState;
    reason?: string;
  };
}

/**
 * Phase 업데이트 이벤트
 */
export interface PhaseUpdateEvent extends SSEEvent {
  type: 'phase_update';
  data: {
    phase: number;
    status: 'started' | 'in_progress' | 'completed';
    progress?: number;
  };
}
```

### 서버측 구현: TaskEventSequencer

```typescript
// packages/agent-manager/src/events/TaskEventSequencer.ts

/**
 * Task별 시퀀스 번호 관리자
 */
export class TaskEventSequencer {
  private sequences = new Map<string, number>();

  /**
   * Task의 다음 시퀀스 번호 가져오기
   */
  getNextSequence(taskId: string): number {
    const current = this.sequences.get(taskId) || 0;
    const next = current + 1;
    this.sequences.set(taskId, next);
    return next;
  }

  /**
   * Task의 현재 시퀀스 번호 조회
   */
  getCurrentSequence(taskId: string): number {
    return this.sequences.get(taskId) || 0;
  }

  /**
   * 시퀀스 초기화 (Task 완료 시)
   */
  reset(taskId: string): void {
    this.sequences.delete(taskId);
  }

  /**
   * 모든 시퀀스 상태 조회
   */
  getAll(): Record<string, number> {
    return Object.fromEntries(this.sequences);
  }
}

/**
 * 이벤트 발행기 (시퀀스 번호 자동 부여)
 */
export class TaskEventEmitter {
  private sequencer = new TaskEventSequencer();

  /**
   * 이벤트 발행 (시퀀스 번호 자동 부여)
   */
  emit(taskId: string, type: SSEEventType, data: any): SSEEvent {
    const event: SSEEvent = {
      id: `${taskId}_${Date.now()}_${Math.random()}`,
      taskId,
      sequence: this.sequencer.getNextSequence(taskId),
      timestamp: new Date().toISOString(),
      type,
      data,
    };

    // 브로드캐스터로 전송
    this.broadcast(taskId, event);

    // 데이터베이스에 영구 저장
    this.persistEvent(event);

    return event;
  }

  /**
   * 이벤트 영구 저장 (재생 및 갭 복구용)
   */
  private async persistEvent(event: SSEEvent): Promise<void> {
    await db.taskEvent.create({
      data: {
        id: event.id,
        taskId: event.taskId,
        sequence: event.sequence,
        timestamp: new Date(event.timestamp),
        type: event.type,
        data: event.data,
      },
    });
  }

  /**
   * 브로드캐스트 (모든 구독자에게 전송)
   */
  private broadcast(taskId: string, event: SSEEvent): void {
    const broadcaster = StreamBroadcaster.getInstance();
    broadcaster.broadcast(taskId, event);
  }
}
```

### 클라이언트측 구현: EventOrderingBuffer

```typescript
// app/lib/sse/EventOrderingBuffer.ts

/**
 * 클라이언트 측 이벤트 재정렬 버퍼
 */
export class EventOrderingBuffer {
  private buffer = new Map<number, SSEEvent>();
  private lastProcessedSequence = 0;
  private expectedSequence = 1;
  private maxBufferSize = 100;
  private gapDetectionTimeout = 5000; // 5초
  private gapTimer: NodeJS.Timeout | null = null;

  /**
   * 이벤트 추가 (자동 정렬 및 처리)
   */
  async addEvent(
    event: SSEEvent,
    onProcess: (event: SSEEvent) => void
  ): Promise<void> {
    // 이미 처리된 이벤트 무시
    if (event.sequence <= this.lastProcessedSequence) {
      console.warn(`⚠️  Duplicate event received: seq=${event.sequence}`);
      return;
    }

    // 예상 순서대로 도착한 경우 즉시 처리
    if (event.sequence === this.expectedSequence) {
      this.processEvent(event, onProcess);
      this.expectedSequence++;

      // 버퍼에 있는 다음 이벤트들 처리
      this.processBufferedEvents(onProcess);
    } else if (event.sequence > this.expectedSequence) {
      // 순서가 맞지 않는 경우 버퍼에 저장
      console.warn(
        `⚠️  Out-of-order event: expected=${this.expectedSequence}, got=${event.sequence}`
      );
      this.buffer.set(event.sequence, event);

      // 갭 감지 타이머 시작
      this.startGapDetectionTimer(onProcess);

      // 버퍼 크기 제한 확인
      if (this.buffer.size > this.maxBufferSize) {
        console.error('❌ Buffer overflow! Processing buffered events...');
        this.forceProcessBuffer(onProcess);
      }
    }
  }

  /**
   * 이벤트 처리
   */
  private processEvent(
    event: SSEEvent,
    onProcess: (event: SSEEvent) => void
  ): void {
    onProcess(event);
    this.lastProcessedSequence = event.sequence;
  }

  /**
   * 버퍼에 있는 연속된 이벤트들 처리
   */
  private processBufferedEvents(onProcess: (event: SSEEvent) => void): void {
    while (this.buffer.has(this.expectedSequence)) {
      const event = this.buffer.get(this.expectedSequence)!;
      this.buffer.delete(this.expectedSequence);
      this.processEvent(event, onProcess);
      this.expectedSequence++;
    }

    // 모든 버퍼 처리 완료 시 타이머 취소
    if (this.buffer.size === 0 && this.gapTimer) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
  }

  /**
   * 갭 감지 타이머 시작
   */
  private startGapDetectionTimer(onProcess: (event: SSEEvent) => void): void {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer);
    }

    this.gapTimer = setTimeout(() => {
      console.warn('⚠️  Event gap detected, requesting missing events...');
      this.requestMissingEvents();
      this.forceProcessBuffer(onProcess);
    }, this.gapDetectionTimeout);
  }

  /**
   * 누락된 이벤트 요청
   */
  private async requestMissingEvents(): Promise<void> {
    const from = this.expectedSequence;
    const to = Math.min(...this.buffer.keys()) - 1;

    if (to < from) return;

    console.log(`📥 Requesting missing events: ${from}-${to}`);

    try {
      const response = await fetch(
        `/api/tasks/${this.taskId}/events?from=${from}&to=${to}`
      );
      const { events } = await response.json();

      for (const event of events) {
        this.buffer.set(event.sequence, event);
      }

      console.log(`✅ Retrieved ${events.length} missing events`);
    } catch (error) {
      console.error('❌ Failed to retrieve missing events:', error);
    }
  }

  /**
   * 강제 버퍼 처리 (갭 무시)
   */
  private forceProcessBuffer(onProcess: (event: SSEEvent) => void): void {
    const sortedEvents = Array.from(this.buffer.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, event]) => event);

    for (const event of sortedEvents) {
      this.processEvent(event, onProcess);
      this.buffer.delete(event.sequence);
    }

    this.expectedSequence = this.lastProcessedSequence + 1;
  }

  /**
   * 버퍼 통계
   */
  getStats(): {
    bufferSize: number;
    lastProcessed: number;
    expectedNext: number;
    hasGap: boolean;
  } {
    return {
      bufferSize: this.buffer.size,
      lastProcessed: this.lastProcessedSequence,
      expectedNext: this.expectedSequence,
      hasGap: this.buffer.size > 0,
    };
  }
}
```

### 누락 이벤트 조회 API

```typescript
// app/api/tasks/[id]/events/route.ts

/**
 * 누락된 이벤트 조회 엔드포인트
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const { searchParams } = new URL(req.url);
  const from = parseInt(searchParams.get('from') || '1');
  const to = parseInt(searchParams.get('to') || '999999');

  try {
    const events = await db.taskEvent.findMany({
      where: {
        taskId,
        sequence: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { sequence: 'asc' },
    });

    return Response.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
```

### React Hook 통합

```typescript
// app/lib/hooks/useOrderedSSE.ts

/**
 * 순서 보장 SSE 훅
 */
export function useOrderedSSE(taskId: string) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const bufferRef = useRef<EventOrderingBuffer | null>(null);

  useEffect(() => {
    if (!bufferRef.current) {
      bufferRef.current = new EventOrderingBuffer();
    }

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.addEventListener('message', (e) => {
      const event: SSEEvent = JSON.parse(e.data);

      bufferRef.current!.addEvent(event, (processedEvent) => {
        setEvents((prev) => [...prev, processedEvent]);
      });
    });

    eventSource.addEventListener('open', () => {
      setConnected(true);
    });

    eventSource.addEventListener('error', () => {
      setConnected(false);
    });

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  return { events, connected, buffer: bufferRef.current };
}
```

### At-Least-Once Delivery Guarantee

#### 개요

네트워크 장애나 클라이언트 재연결 시에도 이벤트가 손실되지 않도록 보장합니다.

#### 서버측 이벤트 영구 저장

```typescript
// Prisma Schema
model TaskEvent {
  id        String   @id
  taskId    String
  sequence  Int
  timestamp DateTime
  type      String
  data      Json
  createdAt DateTime @default(now())

  @@unique([taskId, sequence])
  @@index([taskId, sequence])
}
```

#### 클라이언트 재연결 시 이벤트 복구

```typescript
export function useOrderedSSE(taskId: string) {
  const [lastSequence, setLastSequence] = useLocalStorage(
    `sse_last_seq_${taskId}`,
    0
  );

  useEffect(() => {
    // 1. 재연결 시 마지막 시퀀스부터 재개
    const eventSource = new EventSource(
      `/api/tasks/${taskId}/stream?from=${lastSequence + 1}`
    );

    eventSource.addEventListener('message', (e) => {
      const event: SSEEvent = JSON.parse(e.data);

      // 2. 처리된 시퀀스 저장
      setLastSequence(event.sequence);

      bufferRef.current!.addEvent(event, (processedEvent) => {
        setEvents((prev) => [...prev, processedEvent]);
      });
    });

    return () => eventSource.close();
  }, [taskId, lastSequence]);
}
```

### 모니터링 및 메트릭

```typescript
/**
 * SSE 이벤트 순서 모니터링
 */
export class SSEMetricsCollector {
  private outOfOrderCount = 0;
  private gapDetectionCount = 0;
  private eventLatencies: number[] = [];

  /**
   * Out-of-order 이벤트 카운트
   */
  recordOutOfOrder(): void {
    this.outOfOrderCount++;

    if (this.outOfOrderCount > 10) {
      console.warn('⚠️  High out-of-order event rate detected');
      this.sendAlert({
        type: 'high_out_of_order_rate',
        count: this.outOfOrderCount,
      });
    }
  }

  /**
   * 갭 감지 카운트
   */
  recordGapDetection(from: number, to: number): void {
    this.gapDetectionCount++;
    console.log(`📊 Gap detected: ${from}-${to}`);
  }

  /**
   * 이벤트 지연 시간 추적
   */
  recordLatency(event: SSEEvent): void {
    const latency = Date.now() - new Date(event.timestamp).getTime();
    this.eventLatencies.push(latency);

    // P95 latency 계산
    const p95 = this.calculatePercentile(this.eventLatencies, 0.95);
    if (p95 > 5000) {
      console.warn(`⚠️  High event latency: P95=${p95}ms`);
    }
  }

  /**
   * 버퍼 오버플로우 추적
   */
  recordBufferOverflow(bufferSize: number): void {
    console.error(`❌ Buffer overflow: size=${bufferSize}`);
    this.sendAlert({
      type: 'buffer_overflow',
      bufferSize,
    });
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      outOfOrderCount: this.outOfOrderCount,
      gapDetectionCount: this.gapDetectionCount,
      averageLatency: this.average(this.eventLatencies),
      p95Latency: this.calculatePercentile(this.eventLatencies, 0.95),
      p99Latency: this.calculatePercentile(this.eventLatencies, 0.99),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length || 0;
  }

  private sendAlert(data: any): void {
    // 알림 전송 로직 (Slack, Email 등)
  }
}
```

## 다중 클라이언트 SSE 구독 처리

### 개요

여러 브라우저 탭이나 사용자가 동시에 같은 Task의 로그 스트림을 구독할 수 있습니다.

### 아키텍처

```
Task Agent (단일 프로세스)
    │
    │ stdout
    ↓
Agent Manager (EventEmitter)
    │
    │ broadcast
    ├─────┬─────┬─────┐
    ↓     ↓     ↓     ↓
Client 1  Client 2  Client 3  Client 4
(SSE)    (SSE)    (SSE)    (SSE)
```

### 구현 방법

#### 1. 브로드캐스트 메커니즘

```typescript
// packages/agent-manager/src/StreamBroadcaster.ts
import { EventEmitter } from 'events';

export class StreamBroadcaster extends EventEmitter {
  private subscribers: Map<string, Set<SSEClient>> = new Map();

  /**
   * Task 구독 추가
   */
  subscribe(taskId: string, client: SSEClient): void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }

    this.subscribers.get(taskId)!.add(client);
    console.log(`📡 Client subscribed to task ${taskId}. Total: ${this.subscribers.get(taskId)!.size}`);

    // 클라이언트 연결 해제 처리
    client.on('close', () => {
      this.unsubscribe(taskId, client);
    });
  }

  /**
   * 구독 해제
   */
  unsubscribe(taskId: string, client: SSEClient): void {
    const clients = this.subscribers.get(taskId);
    if (clients) {
      clients.delete(client);
      console.log(`📴 Client unsubscribed from task ${taskId}. Remaining: ${clients.size}`);

      if (clients.size === 0) {
        this.subscribers.delete(taskId);
      }
    }
  }

  /**
   * 모든 구독자에게 이벤트 브로드캐스트
   */
  broadcast(taskId: string, event: SSEEvent): void {
    const clients = this.subscribers.get(taskId);
    if (!clients || clients.size === 0) {
      return;
    }

    const message = formatSSEEvent(event);
    let successCount = 0;
    let failCount = 0;

    for (const client of clients) {
      try {
        client.write(message);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to send to client:`, error);
        failCount++;
        this.unsubscribe(taskId, client);
      }
    }

    console.log(`📤 Broadcast to ${successCount} clients (${failCount} failed)`);
  }

  /**
   * 구독자 수 조회
   */
  getSubscriberCount(taskId: string): number {
    return this.subscribers.get(taskId)?.size || 0;
  }

  /**
   * 전체 구독 현황
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [taskId, clients] of this.subscribers) {
      stats[taskId] = clients.size;
    }
    return stats;
  }
}
```

#### 2. SSE 엔드포인트 구현

```typescript
// app/api/tasks/[id]/stream/route.ts
import { NextRequest } from 'next/server';

const broadcaster = new StreamBroadcaster();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Task 존재 확인
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  // SSE 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = {
        write: (data: string) => {
          controller.enqueue(new TextEncoder().encode(data));
        },
        on: (event: string, handler: () => void) => {
          if (event === 'close') {
            req.signal.addEventListener('abort', handler);
          }
        },
      };

      // 1. 구독 등록
      broadcaster.subscribe(taskId, client);

      // 2. 연결 확인 메시지
      client.write(formatSSEEvent({
        type: 'connected',
        data: {
          taskId,
          timestamp: new Date().toISOString(),
          subscribers: broadcaster.getSubscriberCount(taskId),
        },
      }));

      // 3. 이전 로그 전송 (선택사항)
      sendHistoricalLogs(taskId, client);

      // 4. 연결 해제 처리
      req.signal.addEventListener('abort', () => {
        broadcaster.unsubscribe(taskId, client);
        controller.close();
      });

      // 5. Heartbeat (30초마다)
      const heartbeat = setInterval(() => {
        try {
          client.write(': heartbeat\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx buffering 비활성화
    },
  });
}

/**
 * 이전 로그 전송 (재연결 시 유용)
 */
async function sendHistoricalLogs(taskId: string, client: SSEClient): Promise<void> {
  const logs = await db.taskLog.findMany({
    where: { taskId },
    orderBy: { timestamp: 'asc' },
    take: 100, // 최근 100개
  });

  for (const log of logs) {
    client.write(formatSSEEvent({
      type: 'log',
      data: {
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        level: log.level,
      },
    }));
  }
}
```

#### 3. Agent Manager 통합

```typescript
// packages/agent-manager/src/AgentManager.ts
export class AgentManager {
  private broadcaster = new StreamBroadcaster();

  async spawnAgent(taskId: string): Promise<void> {
    const agentProcess = spawn('claude', ['chat'], { ... });

    // Agent 출력을 모든 구독자에게 브로드캐스트
    agentProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();

      // 1. 프로토콜 파싱
      const protocols = this.parseProtocols(output);

      // 2. 일반 로그 브로드캐스트
      this.broadcaster.broadcast(taskId, {
        type: 'log',
        data: {
          timestamp: new Date().toISOString(),
          message: output,
        },
      });

      // 3. 특수 이벤트 브로드캐스트
      for (const protocol of protocols) {
        if (protocol.type === 'USER_QUESTION') {
          this.broadcaster.broadcast(taskId, {
            type: 'user_question',
            data: protocol.content,
          });
        }
        // ... other protocols
      }
    });

    // Phase 업데이트 브로드캐스트
    this.on('phase_update', (event) => {
      if (event.taskId === taskId) {
        this.broadcaster.broadcast(taskId, {
          type: 'phase_update',
          data: event,
        });
      }
    });
  }
}
```

#### 4. 클라이언트 측 구현

```typescript
// app/tasks/[id]/components/LogStream.tsx
'use client';

import { useEffect, useState } from 'react';

export function LogStream({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [subscribers, setSubscribers] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data);
      setConnected(true);
      setSubscribers(data.subscribers);
      console.log(`✅ Connected to task ${taskId}. ${data.subscribers} subscribers`);
    });

    eventSource.addEventListener('log', (e) => {
      const log = JSON.parse(e.data);
      setLogs((prev) => [...prev, log]);
    });

    eventSource.addEventListener('phase_update', (e) => {
      const update = JSON.parse(e.data);
      console.log('Phase update:', update);
    });

    eventSource.onerror = () => {
      setConnected(false);
      console.error('❌ SSE connection lost. Reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {connected ? `Live (${subscribers} viewers)` : 'Disconnected'}
        </span>
      </div>

      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="font-mono text-sm">
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 연결 관리

#### Heartbeat (연결 유지)

```typescript
// 30초마다 heartbeat 전송
const heartbeat = setInterval(() => {
  client.write(': heartbeat\n\n');
}, 30000);
```

#### 재연결 처리

```typescript
// 클라이언트에서 자동 재연결
eventSource.onerror = () => {
  console.error('Connection lost. Reconnecting...');
  // EventSource는 자동으로 재연결 시도
};
```

#### 최대 연결 수 제한

```typescript
const MAX_SUBSCRIBERS_PER_TASK = 50;

subscribe(taskId: string, client: SSEClient): void {
  const current = this.subscribers.get(taskId)?.size || 0;

  if (current >= MAX_SUBSCRIBERS_PER_TASK) {
    throw new Error('Maximum subscribers reached');
  }

  // ... subscribe logic
}
```

### 성능 최적화

**1. 메시지 버퍼링**

```typescript
export class BufferedBroadcaster extends StreamBroadcaster {
  private buffer: Map<string, SSEEvent[]> = new Map();
  private flushInterval = 100; // 100ms

  constructor() {
    super();
    setInterval(() => this.flush(), this.flushInterval);
  }

  broadcast(taskId: string, event: SSEEvent): void {
    if (!this.buffer.has(taskId)) {
      this.buffer.set(taskId, []);
    }
    this.buffer.get(taskId)!.push(event);
  }

  private flush(): void {
    for (const [taskId, events] of this.buffer) {
      if (events.length === 0) continue;

      const clients = this.subscribers.get(taskId);
      if (!clients) continue;

      // 한 번에 모든 이벤트 전송
      const message = events.map(formatSSEEvent).join('');

      for (const client of clients) {
        try {
          client.write(message);
        } catch {
          this.unsubscribe(taskId, client);
        }
      }

      events.length = 0; // 버퍼 비우기
    }
  }
}
```

**2. 압축 (gzip)**

```typescript
// Next.js 자동 압축 활성화
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({ ... });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Content-Encoding': 'gzip', // 압축 활성화
      ...
    },
  });
}
```

### 모니터링

```typescript
// 구독 현황 모니터링 API
export async function GET() {
  const stats = broadcaster.getStats();
  const totalSubscribers = Object.values(stats).reduce((a, b) => a + b, 0);

  return Response.json({
    totalTasks: Object.keys(stats).length,
    totalSubscribers,
    byTask: stats,
  });
}
```

---

## 참고 자료

- **기능 명세**: `FEATURES.md`
- **아키텍처**: `ARCHITECTURE.md`
- **개발 가이드**: `DEVELOPMENT.md`
