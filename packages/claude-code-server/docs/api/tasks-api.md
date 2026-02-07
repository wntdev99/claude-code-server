# Tasks API

## 개요

Task 생성, 조회, 수정, 삭제 및 실행을 위한 REST API 명세입니다.

## Base URL

```
http://localhost:3000/api
```

## 인증

현재 버전에서는 인증을 생략하지만, 향후 JWT 또는 세션 기반 인증 추가 예정.

## Endpoints

### 1. Create Task

새로운 Task를 생성합니다.

**Endpoint**: `POST /api/tasks`

**Request Body**:
```json
{
  "title": "AI Todo App 개발",
  "type": "create_app",
  "description": "OpenAI API를 활용한 AI 기반 Todo 관리 앱 개발"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Task 제목 |
| type | string | Yes | Task 타입: `create_app`, `modify_app`, `workflow`, `custom` |
| description | string | Yes | Task 설명 (최소 100자) |

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "AI Todo App 개발",
    "type": "create_app",
    "description": "OpenAI API를 활용한 AI 기반 Todo 관리 앱 개발",
    "status": "pending",
    "progress": 0,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  }
}
```

**Errors**:
- `400 Bad Request`: 필수 필드 누락 또는 유효하지 않은 타입
- `500 Internal Server Error`: 서버 오류

**구현 예시**:
```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, description } = body;

    // 검증
    if (!title || !type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, description' },
        { status: 400 }
      );
    }

    const validTypes = ['create_app', 'modify_app', 'workflow', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (description.length < 100) {
      return NextResponse.json(
        { error: 'Description must be at least 100 characters' },
        { status: 400 }
      );
    }

    // Task 생성
    const task = await db.task.create({
      data: {
        title,
        type,
        description,
        status: 'pending',
        progress: 0,
      },
    });

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

---

### 2. List Tasks

모든 Task 목록을 조회합니다.

**Endpoint**: `GET /api/tasks`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | 상태 필터: `pending`, `in_progress`, `waiting_review`, `completed`, `failed` |
| type | string | No | 타입 필터 |
| limit | number | No | 최대 결과 수 (기본: 50) |
| offset | number | No | 시작 위치 (기본: 0) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_abc123",
        "title": "AI Todo App 개발",
        "type": "create_app",
        "status": "in_progress",
        "progress": 45,
        "currentPhase": 2,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T12:30:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

**구현 예시**:
```typescript
// app/api/tasks/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // 조회
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
```

---

### 3. Get Task

특정 Task의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/tasks/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "AI Todo App 개발",
    "type": "create_app",
    "description": "OpenAI API를 활용한 AI 기반 Todo 관리 앱 개발",
    "status": "in_progress",
    "progress": 45,
    "currentPhase": 2,
    "currentStep": "Design - Screen Layout",
    "tokensUsed": 12500,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T12:30:00.000Z",
    "startedAt": "2024-01-10T10:05:00.000Z",
    "phases": [
      {
        "phase": 1,
        "name": "Planning",
        "status": "completed",
        "completedAt": "2024-01-10T11:00:00.000Z"
      },
      {
        "phase": 2,
        "name": "Design",
        "status": "in_progress",
        "startedAt": "2024-01-10T11:05:00.000Z"
      }
    ]
  }
}
```

**Errors**:
- `404 Not Found`: Task가 존재하지 않음

**구현 예시**:
```typescript
// app/api/tasks/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: params.id },
      include: {
        phases: {
          orderBy: { phase: 'asc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
```

---

### 4. Update Task

Task 정보를 수정합니다.

**Endpoint**: `PUT /api/tasks/:id`

**Request Body**:
```json
{
  "title": "AI Todo App 개발 (수정)",
  "description": "업데이트된 설명"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "AI Todo App 개발 (수정)",
    "description": "업데이트된 설명",
    "updatedAt": "2024-01-10T13:00:00.000Z"
  }
}
```

**구현 예시**:
```typescript
// app/api/tasks/[id]/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description } = body;

    const task = await db.task.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
```

---

### 5. Delete Task

Task를 삭제합니다.

**Endpoint**: `DELETE /api/tasks/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**구현 예시**:
```typescript
// app/api/tasks/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 에이전트가 실행 중이면 먼저 종료
    const task = await db.task.findUnique({
      where: { id: params.id },
    });

    if (task?.status === 'in_progress') {
      // 에이전트 종료 로직
      await terminateAgent(params.id);
    }

    // Task 삭제
    await db.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
```

---

### 6. Execute Task

Task를 실행합니다 (에이전트 시작).

**Endpoint**: `POST /api/tasks/:id/execute`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task execution started",
  "data": {
    "taskId": "task_abc123",
    "status": "in_progress"
  }
}
```

**Errors**:
- `400 Bad Request`: Task가 이미 실행 중이거나 완료됨
- `404 Not Found`: Task가 존재하지 않음

**구현 예시**:
```typescript
// app/api/tasks/[id]/execute/route.ts
import { createAgent, startAgentExecution } from '@/lib/agent/executor';
import { buildTaskPrompt } from '@/lib/agent/prompts';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Task 조회
    const task = await db.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 2. 상태 확인
    if (task.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Task is already running' },
        { status: 400 }
      );
    }

    if (task.status === 'completed') {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 400 }
      );
    }

    // 3. 에이전트 생성
    const agent = await createAgent({
      taskId: task.id,
      taskType: task.type,
      workingDir: `/projects/${task.id}`,
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // 4. 초기 프롬프트 전달
    const prompt = buildTaskPrompt(task);
    startAgentExecution({ taskId: task.id, prompt });

    // 5. Task 상태 업데이트
    await db.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task execution started',
      data: {
        taskId: task.id,
        status: 'in_progress',
      },
    });
  } catch (error) {
    console.error('Failed to execute task:', error);
    return NextResponse.json(
      { error: 'Failed to execute task' },
      { status: 500 }
    );
  }
}
```

---

### 7. Pause Task

실행 중인 Task를 일시 중지합니다.

**Endpoint**: `POST /api/tasks/:id/pause`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task paused successfully"
}
```

**구현 예시**:
```typescript
// app/api/tasks/[id]/pause/route.ts
import { pauseAgent } from '@/lib/agent/executor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = pauseAgent(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to pause task' },
        { status: 500 }
      );
    }

    await db.task.update({
      where: { id: params.id },
      data: { status: 'paused' },
    });

    return NextResponse.json({
      success: true,
      message: 'Task paused successfully',
    });
  } catch (error) {
    console.error('Failed to pause task:', error);
    return NextResponse.json(
      { error: 'Failed to pause task' },
      { status: 500 }
    );
  }
}
```

---

### 8. Resume Task

일시 중지된 Task를 재개합니다.

**Endpoint**: `POST /api/tasks/:id/resume`

**구현 예시**:
```typescript
// app/api/tasks/[id]/resume/route.ts
import { resumeAgent } from '@/lib/agent/executor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = resumeAgent({ taskId: params.id });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to resume task' },
        { status: 500 }
      );
    }

    await db.task.update({
      where: { id: params.id },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({
      success: true,
      message: 'Task resumed successfully',
    });
  } catch (error) {
    console.error('Failed to resume task:', error);
    return NextResponse.json(
      { error: 'Failed to resume task' },
      { status: 500 }
    );
  }
}
```

---

### 9. Cancel Task

Task를 취소합니다 (에이전트 종료).

**Endpoint**: `POST /api/tasks/:id/cancel`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

**구현 예시**:
```typescript
// app/api/tasks/[id]/cancel/route.ts
import { terminateAgent } from '@/lib/agent/executor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await terminateAgent(params.id, true); // graceful

    await db.task.update({
      where: { id: params.id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
    });
  } catch (error) {
    console.error('Failed to cancel task:', error);
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    );
  }
}
```

---

### 10. Get Task Logs (SSE)

Task의 실시간 로그를 스트리밍합니다.

**Endpoint**: `GET /api/tasks/:id/logs`

**Response**: Server-Sent Events

**예시**:
```
data: {"type":"log","data":{"timestamp":"2024-01-10T10:05:00.000Z","message":"Starting Phase 1: Planning","level":"info"}}

data: {"type":"log","data":{"timestamp":"2024-01-10T10:05:30.000Z","message":"Reading guide: /guide/planning/01_idea.md","level":"info"}}

data: {"type":"dependency_request","data":{"name":"OPENAI_API_KEY","description":"Required for AI features","required":true}}

data: {"type":"phase_complete","data":{"phase":1,"name":"Planning","deliverables":[...]}}
```

자세한 내용은 `../features/sse-streaming.md` 참조.

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../features/task-management.md`** - Task 관리 로직
2. **`../features/process-management.md`** - 에이전트 실행
3. **`../features/sse-streaming.md`** - 로그 스트리밍
4. **`../../CLAUDE.md`** - API 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - API 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`../features/task-management.md`** - Task 관리
4. **Front-end 개발**: UI 컴포넌트에서 API 호출

## 다음 단계

- **Dependencies API**: `dependencies-api.md` - 의존성 API
- **Reviews API**: `reviews-api.md` - 리뷰 API
- **Questions API**: `questions-api.md` - 질문 API

## 관련 문서

- **Task Management**: `../features/task-management.md`
- **Process Management**: `../features/process-management.md`
- **SSE Streaming**: `../features/sse-streaming.md`
- **Dependencies API**: `dependencies-api.md`
- **Reviews API**: `reviews-api.md`
