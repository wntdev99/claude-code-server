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

## 참고 자료

- **기능 명세**: `FEATURES.md`
- **아키텍처**: `ARCHITECTURE.md`
- **개발 가이드**: `DEVELOPMENT.md`
