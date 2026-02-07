# API Documentation

## Overview

The Claude Code Server exposes RESTful APIs for task management, reviews, dependencies, questions, and settings. All APIs are accessible via the web server.

**Base URL**: `http://localhost:3000/api` (development)

**Response Format**: JSON

**Authentication**: API Key (optional, configured in settings)

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
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

**Description**: Create a new task

**Request Body**:
```json
{
  "title": "Build Todo App",
  "type": "create_app",
  "description": "Create a full-stack todo application with React and Node.js",
  "outputDirectory": "/path/to/output"
}
```

**Parameters**:
- `title` (string, required): Task title
- `type` (string, required): Task type - `create_app`, `modify_app`, `workflow`, `custom`
- `description` (string, required): Detailed task description
- `outputDirectory` (string, optional): Output directory path

**Response** (201 Created):
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

**Description**: List all tasks with optional filtering

**Query Parameters**:
- `status` (string, optional): Filter by status - `draft`, `pending`, `in_progress`, `review`, `completed`, `failed`
- `type` (string, optional): Filter by type
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Response** (200 OK):
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

**Description**: Get task details

**Response** (200 OK):
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

**Description**: Update task properties

**Request Body**:
```json
{
  "title": "Updated title",
  "description": "Updated description"
}
```

**Response** (200 OK):
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

**Description**: Delete a task (only if not in progress)

**Response** (200 OK):
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

**Description**: Start executing a task

**Response** (200 OK):
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

**Description**: Pause task execution

**Response** (200 OK):
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

**Description**: Resume paused task

**Response** (200 OK):
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

**Description**: Cancel task execution

**Response** (200 OK):
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

**Description**: Stream real-time task logs via Server-Sent Events

**Response** (200 OK):
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

**Event Types**:
- `log`: General log message
- `phase_update`: Phase status changed
- `step_update`: Step progress updated
- `dependency_request`: Agent requests dependency
- `user_question`: Agent asks question
- `review_required`: Phase review needed
- `complete`: Task completed
- `error`: Error occurred

### Get Agent Status

**Endpoint**: `GET /api/tasks/{id}/status`

**Description**: Get current agent status

**Response** (200 OK):
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

**Description**: Get list of phases for task

**Response** (200 OK):
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

**Description**: List all reviews for a task

**Response** (200 OK):
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

**Description**: Create a review for a phase (usually automatic)

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

**Response** (201 Created):
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

**Description**: Approve a phase review

**Request Body** (optional):
```json
{
  "comment": "Looks good! Proceeding to design phase."
}
```

**Response** (200 OK):
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

**Description**: Request changes to deliverables

**Request Body**:
```json
{
  "feedback": "Please add more detail to the market analysis section."
}
```

**Response** (200 OK):
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

**Description**: Add file-specific feedback

**Request Body**:
```json
{
  "file": "docs/planning/02_market.md",
  "lineNumber": 15,
  "comment": "Need competitor pricing analysis here",
  "type": "suggestion"
}
```

**Response** (200 OK):
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

## Dependencies API

### List Dependencies

**Endpoint**: `GET /api/tasks/{id}/dependencies`

**Description**: List all dependencies for a task

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "dependencies": [
      {
        "id": "dep_123",
        "taskId": "task_123",
        "type": "api_key",
        "name": "OPENAI_API_KEY",
        "description": "Required for AI features",
        "required": true,
        "status": "pending",
        "requestedAt": "2025-01-15T10:15:00Z"
      }
    ]
  }
}
```

### Provide Dependency

**Endpoint**: `POST /api/dependencies/{id}/provide`

**Description**: Provide value for a dependency

**Request Body**:
```json
{
  "value": "sk-..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "dep_123",
    "status": "provided",
    "providedAt": "2025-01-15T10:20:00Z"
  }
}
```

## Questions API

### List Questions

**Endpoint**: `GET /api/tasks/{id}/questions`

**Description**: List all questions for a task

**Response** (200 OK):
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

**Description**: Answer an agent question

**Request Body**:
```json
{
  "answer": "Freemium"
}
```

**Response** (200 OK):
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

**Description**: Get verification reports for task phases

**Response** (200 OK):
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

**Description**: Get platform settings

**Response** (200 OK):
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

**Note**: Claude Code CLI authentication is managed separately via `claude login`. No API key is stored in settings.

### Update Settings

**Endpoint**: `PATCH /api/settings`

**Description**: Update platform settings

**Request Body**:
```json
{
  "claude_model": "claude-opus-4-6",
  "output_directory": "/new/path"
}
```

**Response** (200 OK):
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

## Workflows API (Phase 3 Feature)

### List Workflows

**Endpoint**: `GET /api/workflows`

### Create Workflow

**Endpoint**: `POST /api/workflows`

### Execute Workflow

**Endpoint**: `POST /api/workflows/{id}/execute`

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource state conflict |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per API key
- **SSE Connections**: Max 10 concurrent per user

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315200
```

## Authentication

### API Key Authentication

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.example.com/api/tasks
```

### Bearer Token (Future)

```bash
curl -H "Authorization: Bearer your-token" \
  https://api.example.com/api/tasks
```

## Webhooks (Phase 3 Feature)

Configure webhooks to receive events:

**Events**:
- `task.created`
- `task.started`
- `task.completed`
- `task.failed`
- `phase.completed`
- `review.created`
- `dependency.requested`
- `question.asked`

**Webhook Payload**:
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

## Reference

- **Feature Specification**: `FEATURES.md`
- **Architecture**: `ARCHITECTURE.md`
- **Development Guide**: `DEVELOPMENT.md`
