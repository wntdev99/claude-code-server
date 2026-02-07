# 2.4 API 설계 가이드

## 목적

Next.js App Router 기반의 RESTful API를 설계하고, 타입 안전한 클라이언트-서버 통신 규약을 정의합니다.

---

## 입력

- `result/design/02_data_model.md`
- `result/design/03_task_flow.md`
- `result/planning/08_tech.md`

---

## 작업 항목

### 1. API 설계 원칙

```markdown
## API 설계 원칙

### RESTful 규칙

| 원칙 | 설명 | 예시 |
|------|------|------|
| 리소스 중심 | URL은 명사, 동사 X | ✅ /tasks, ❌ /getTasks |
| HTTP 메서드 활용 | CRUD에 메서드 매핑 | GET, POST, PATCH, DELETE |
| 복수형 사용 | 컬렉션은 복수 | /tasks, /projects |
| 계층 구조 | 관계를 URL로 표현 | /tasks/:id/logs |
| 쿼리 파라미터 | 필터링/정렬/페이징 | ?status=running&sort=-createdAt |

### Next.js App Router 규칙

| 구조 | 경로 | 메서드 |
|------|------|--------|
| `app/api/tasks/route.ts` | /api/tasks | GET, POST |
| `app/api/tasks/[id]/route.ts` | /api/tasks/:id | GET, PATCH, DELETE |
| `app/api/tasks/[id]/stop/route.ts` | /api/tasks/:id/stop | POST |
| `app/api/tasks/[id]/stream/route.ts` | /api/tasks/:id/stream | GET (SSE) |

### 응답 형식 표준

```typescript
// 성공 응답 (단일)
interface SuccessResponse<T> {
  data: T;
}

// 성공 응답 (목록)
interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 에러 응답
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```
```

### 2. API 엔드포인트 목록

```markdown
## 엔드포인트 목록

### Tasks API

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|------------|
| GET | /api/tasks | 작업 목록 조회 | ❌ | - |
| POST | /api/tasks | 작업 생성 | ❌ | 30/분 |
| GET | /api/tasks/:id | 작업 상세 조회 | ❌ | - |
| PATCH | /api/tasks/:id | 작업 수정 | ❌ | 30/분 |
| DELETE | /api/tasks/:id | 작업 삭제 | ❌ | 30/분 |
| POST | /api/tasks/:id/stop | 작업 중지 | ❌ | 10/분 |
| POST | /api/tasks/:id/retry | 작업 재시도 | ❌ | 10/분 |
| GET | /api/tasks/:id/stream | 로그 스트림 (SSE) | ❌ | - |
| GET | /api/tasks/:id/logs | 로그 조회 | ❌ | - |

### Projects API

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|------------|
| GET | /api/projects | 프로젝트 목록 | ❌ | - |
| POST | /api/projects | 프로젝트 생성 | ❌ | 30/분 |
| GET | /api/projects/:id | 프로젝트 상세 | ❌ | - |
| PATCH | /api/projects/:id | 프로젝트 수정 | ❌ | 30/분 |
| DELETE | /api/projects/:id | 프로젝트 삭제 | ❌ | 30/분 |

### Schedules API

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|------------|
| GET | /api/schedules | 스케줄 목록 | ❌ | - |
| POST | /api/schedules | 스케줄 생성 | ❌ | 10/분 |
| GET | /api/schedules/:id | 스케줄 상세 | ❌ | - |
| PATCH | /api/schedules/:id | 스케줄 수정 | ❌ | 10/분 |
| DELETE | /api/schedules/:id | 스케줄 삭제 | ❌ | 10/분 |
| POST | /api/schedules/:id/toggle | 활성화/비활성화 | ❌ | - |

### Utility API

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|------------|
| GET | /api/settings | 설정 조회 | ❌ | - |
| PATCH | /api/settings | 설정 수정 | ❌ | 30/분 |
| POST | /api/validate/path | 경로 검증 | ❌ | - |
| GET | /api/stats | 통계 조회 | ❌ | - |
| GET | /api/health | 헬스 체크 | ❌ | - |
```

### 3. 엔드포인트 상세

```markdown
## Tasks API 상세

---

### GET /api/tasks

작업 목록을 조회합니다.

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 | 기본값 | 예시 |
|----------|------|------|------|--------|------|
| status | string | ❌ | 상태 필터 (쉼표 구분) | - | running,completed |
| type | string | ❌ | 유형 필터 | - | create_app |
| search | string | ❌ | 검색어 (name, prompt) | - | 쇼핑몰 |
| sort | string | ❌ | 정렬 (- prefix = DESC) | -createdAt | name,-status |
| page | number | ❌ | 페이지 번호 | 1 | 2 |
| limit | number | ❌ | 페이지 크기 (max 100) | 20 | 50 |

#### Response 200

```typescript
interface TaskListResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

```json
{
  "data": [
    {
      "id": "task_abc123",
      "name": "쇼핑몰 앱 생성",
      "type": "create_app",
      "status": "running",
      "projectPath": "/Users/dev/shopping-mall",
      "prompt": "Next.js로 쇼핑몰...",
      "progress": 45,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "startedAt": "2024-01-15T10:30:01.000Z",
      "updatedAt": "2024-01-15T10:31:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### Implementation

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/storage';
import { taskQuerySchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Query 파라미터 파싱 및 검증
  const query = taskQuerySchema.safeParse({
    status: searchParams.get('status'),
    type: searchParams.get('type'),
    search: searchParams.get('search'),
    sort: searchParams.get('sort'),
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  });

  if (!query.success) {
    return NextResponse.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '쿼리 파라미터가 올바르지 않습니다.',
        details: query.error.issues,
      },
    }, { status: 422 });
  }

  const { status, type, search, sort, page, limit } = query.data;

  // 데이터 조회
  let tasks = await getTasks();

  // 필터링
  if (status?.length) {
    tasks = tasks.filter(t => status.includes(t.status));
  }
  if (type?.length) {
    tasks = tasks.filter(t => type.includes(t.type));
  }
  if (search) {
    const searchLower = search.toLowerCase();
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.prompt.toLowerCase().includes(searchLower)
    );
  }

  // 정렬
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? -1 : 1;
  tasks.sort((a, b) => {
    const aVal = a[sortField as keyof Task];
    const bVal = b[sortField as keyof Task];
    if (aVal < bVal) return -sortOrder;
    if (aVal > bVal) return sortOrder;
    return 0;
  });

  // 페이지네이션
  const total = tasks.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedTasks = tasks.slice(start, start + limit);

  return NextResponse.json({
    data: paginatedTasks,
    meta: { total, page, limit, totalPages },
  });
}
```

---

### POST /api/tasks

새 작업을 생성합니다.

#### Request Body

```typescript
interface CreateTaskRequest {
  name: string;        // 1-100자
  type: TaskType;      // 'create_app' | 'modify_project' | 'scheduled' | 'custom'
  projectPath: string; // 유효한 경로
  prompt: string;      // 1-10000자
}
```

```json
{
  "name": "쇼핑몰 앱 생성",
  "type": "create_app",
  "projectPath": "/Users/dev/shopping-mall",
  "prompt": "Next.js 14와 TypeScript를 사용하여 쇼핑몰 앱을 만들어주세요..."
}
```

#### Response 201 (Created)

```json
{
  "data": {
    "id": "task_abc123",
    "name": "쇼핑몰 앱 생성",
    "type": "create_app",
    "status": "pending",
    "projectPath": "/Users/dev/shopping-mall",
    "prompt": "...",
    "progress": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response 400 (Bad Request)

```json
{
  "error": {
    "code": "PATH_NOT_FOUND",
    "message": "존재하지 않는 경로입니다.",
    "details": {
      "path": "/Users/dev/invalid-path"
    }
  }
}
```

#### Response 409 (Conflict)

```json
{
  "error": {
    "code": "TASK_CONFLICT",
    "message": "해당 경로에서 이미 작업이 실행 중입니다.",
    "details": {
      "runningTaskId": "task_xyz789",
      "runningTaskName": "기존 작업"
    }
  }
}
```

#### Response 422 (Validation Error)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해주세요.",
    "details": [
      { "field": "name", "message": "작업명을 입력해주세요." },
      { "field": "prompt", "message": "프롬프트는 10000자 이내로 입력해주세요." }
    ]
  }
}
```

#### Implementation

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTasks } from '@/lib/storage';
import { createTaskSchema } from '@/lib/validations';
import { isLocked } from '@/lib/locks';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 검증
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값을 확인해주세요.',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      }, { status: 422 });
    }

    const { projectPath } = result.data;

    // 경로 존재 확인
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json({
        error: {
          code: 'PATH_NOT_FOUND',
          message: '존재하지 않는 경로입니다.',
          details: { path: projectPath },
        },
      }, { status: 400 });
    }

    // 중복 실행 확인
    if (isLocked(projectPath)) {
      const tasks = await getTasks();
      const runningTask = tasks.find(t =>
        t.projectPath === projectPath && t.status === 'running'
      );

      return NextResponse.json({
        error: {
          code: 'TASK_CONFLICT',
          message: '해당 경로에서 이미 작업이 실행 중입니다.',
          details: {
            runningTaskId: runningTask?.id,
            runningTaskName: runningTask?.name,
          },
        },
      }, { status: 409 });
    }

    // 작업 생성
    const task = await createTask(result.data);

    return NextResponse.json({ data: task }, { status: 201 });

  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    }, { status: 500 });
  }
}
```

---

### POST /api/tasks/:id/stop

실행 중인 작업을 중지합니다.

#### Response 200

```json
{
  "data": {
    "id": "task_abc123",
    "status": "cancelled",
    "completedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

#### Response 400 (Invalid Status)

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "실행 중인 작업만 중지할 수 있습니다.",
    "details": {
      "currentStatus": "completed"
    }
  }
}
```

#### Implementation

```typescript
// app/api/tasks/[id]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/storage';
import { processManager } from '@/lib/process-manager';
import { releaseLock } from '@/lib/locks';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await getTask(params.id);

  if (!task) {
    return NextResponse.json({
      error: {
        code: 'NOT_FOUND',
        message: '작업을 찾을 수 없습니다.',
      },
    }, { status: 404 });
  }

  if (task.status !== 'running') {
    return NextResponse.json({
      error: {
        code: 'INVALID_STATUS',
        message: '실행 중인 작업만 중지할 수 있습니다.',
        details: { currentStatus: task.status },
      },
    }, { status: 400 });
  }

  // 프로세스 종료
  processManager.kill(task.id);

  // 잠금 해제
  releaseLock(task.projectPath, task.id);

  // 상태 업데이트
  const updated = await updateTask(task.id, {
    status: 'cancelled',
    completedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt,
    },
  });
}
```

---

### DELETE /api/tasks/:id

작업을 삭제합니다.

#### Response 204 (No Content)

본문 없음

#### Response 400 (Cannot Delete)

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "실행 중인 작업은 삭제할 수 없습니다. 먼저 중지해주세요."
  }
}
```

#### Implementation

```typescript
// app/api/tasks/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await getTask(params.id);

  if (!task) {
    return NextResponse.json({
      error: {
        code: 'NOT_FOUND',
        message: '작업을 찾을 수 없습니다.',
      },
    }, { status: 404 });
  }

  if (task.status === 'running') {
    return NextResponse.json({
      error: {
        code: 'INVALID_STATUS',
        message: '실행 중인 작업은 삭제할 수 없습니다. 먼저 중지해주세요.',
      },
    }, { status: 400 });
  }

  await deleteTask(params.id);

  return new Response(null, { status: 204 });
}
```
```

### 4. SSE API

```markdown
## SSE API

### GET /api/tasks/:id/stream

작업의 실시간 로그 스트림에 연결합니다.

#### Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

#### Event Format

```
data: {"type":"log","log":{"id":"log_001","level":"info","message":"...","timestamp":"..."}}\n\n
```

#### Event Types

| 타입 | 페이로드 | 설명 |
|------|----------|------|
| log | `{ log: Log }` | 새 로그 추가 |
| progress | `{ percent: number }` | 진행률 업데이트 |
| status | `{ status: TaskStatus }` | 상태 변경 |
| complete | `{ result: string }` | 작업 완료 |
| error | `{ message: string, code?: string }` | 에러 발생 |
| heartbeat | `{}` | 연결 유지 (30초마다) |

#### Client Usage

```typescript
const eventSource = new EventSource('/api/tasks/task_abc123/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'log':
      console.log('New log:', data.log);
      break;
    case 'progress':
      console.log('Progress:', data.percent);
      break;
    case 'complete':
      console.log('Completed:', data.result);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.message);
      eventSource.close();
      break;
  }
};

eventSource.onerror = () => {
  console.error('Connection lost');
  // 재연결 로직
};
```

#### Reconnection Strategy

| 시도 | 대기 시간 | 최대 시도 |
|------|----------|----------|
| 1 | 1초 | - |
| 2 | 2초 | - |
| 3 | 4초 | - |
| 4 | 8초 | - |
| 5+ | 30초 | 무제한 |

```typescript
let retryCount = 0;

function connect() {
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    retryCount = 0;
  };

  eventSource.onerror = () => {
    eventSource.close();
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    retryCount++;
    setTimeout(connect, delay);
  };
}
```
```

### 5. Utility APIs

```markdown
## Utility APIs

### POST /api/validate/path

프로젝트 경로의 유효성을 검사합니다.

#### Request Body

```json
{
  "path": "/Users/dev/my-project"
}
```

#### Response 200

```json
{
  "data": {
    "valid": true,
    "path": "/Users/dev/my-project",
    "exists": true,
    "isDirectory": true,
    "isEmpty": false,
    "hasGit": true,
    "hasPackageJson": true,
    "packageManager": "npm"
  }
}
```

```json
{
  "data": {
    "valid": false,
    "path": "/Users/dev/invalid",
    "exists": false,
    "error": "경로가 존재하지 않습니다."
  }
}
```

#### Implementation

```typescript
// app/api/validate/path/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const { path: targetPath } = await request.json();

  if (!targetPath) {
    return NextResponse.json({
      data: { valid: false, error: '경로를 입력해주세요.' },
    });
  }

  // Path traversal 방지
  const normalizedPath = path.normalize(targetPath);
  if (normalizedPath.includes('..')) {
    return NextResponse.json({
      data: { valid: false, path: targetPath, error: '올바르지 않은 경로입니다.' },
    });
  }

  try {
    const stat = await fs.stat(normalizedPath);

    if (!stat.isDirectory()) {
      return NextResponse.json({
        data: {
          valid: false,
          path: normalizedPath,
          exists: true,
          isDirectory: false,
          error: '디렉토리가 아닙니다.',
        },
      });
    }

    // 추가 정보 수집
    const files = await fs.readdir(normalizedPath);
    const hasGit = files.includes('.git');
    const hasPackageJson = files.includes('package.json');

    let packageManager: string | null = null;
    if (files.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
    else if (files.includes('yarn.lock')) packageManager = 'yarn';
    else if (files.includes('package-lock.json')) packageManager = 'npm';

    return NextResponse.json({
      data: {
        valid: true,
        path: normalizedPath,
        exists: true,
        isDirectory: true,
        isEmpty: files.length === 0,
        hasGit,
        hasPackageJson,
        packageManager,
      },
    });

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        data: {
          valid: false,
          path: normalizedPath,
          exists: false,
          error: '경로가 존재하지 않습니다.',
        },
      });
    }

    return NextResponse.json({
      data: {
        valid: false,
        path: normalizedPath,
        error: '경로를 확인할 수 없습니다.',
      },
    });
  }
}
```

---

### GET /api/stats

작업 통계를 조회합니다.

#### Response 200

```json
{
  "data": {
    "tasks": {
      "total": 150,
      "byStatus": {
        "pending": 2,
        "running": 3,
        "completed": 130,
        "failed": 10,
        "cancelled": 5
      },
      "byType": {
        "create_app": 50,
        "modify_project": 80,
        "scheduled": 10,
        "custom": 10
      }
    },
    "today": {
      "created": 5,
      "completed": 4,
      "failed": 1
    },
    "schedules": {
      "total": 10,
      "enabled": 8,
      "disabled": 2
    },
    "system": {
      "runningProcesses": 2,
      "maxConcurrent": 3,
      "uptime": 86400
    }
  }
}
```

---

### GET /api/health

헬스 체크 엔드포인트입니다.

#### Response 200

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "checks": {
    "storage": "ok",
    "processManager": "ok"
  }
}
```

#### Response 503

```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "storage": "error",
    "processManager": "ok"
  },
  "error": "Storage is not accessible"
}
```
```

### 6. 에러 코드 정의

```markdown
## 에러 코드 정의

### HTTP 상태 코드

| 코드 | 의미 | 사용 |
|------|------|------|
| 200 | OK | 조회, 수정 성공 |
| 201 | Created | 생성 성공 |
| 204 | No Content | 삭제 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복/충돌 |
| 422 | Unprocessable Entity | 검증 실패 |
| 429 | Too Many Requests | 요청 제한 초과 |
| 500 | Internal Server Error | 서버 오류 |
| 503 | Service Unavailable | 서비스 불가 |

### 에러 코드 목록

| 코드 | HTTP | 설명 | 사용자 메시지 |
|------|------|------|-------------|
| VALIDATION_ERROR | 422 | 입력값 검증 실패 | 입력값을 확인해주세요. |
| PATH_NOT_FOUND | 400 | 경로 없음 | 존재하지 않는 경로입니다. |
| PATH_NOT_DIRECTORY | 400 | 디렉토리 아님 | 디렉토리가 아닙니다. |
| NOT_FOUND | 404 | 리소스 없음 | 요청한 리소스를 찾을 수 없습니다. |
| TASK_CONFLICT | 409 | 작업 충돌 | 해당 경로에서 이미 작업이 실행 중입니다. |
| INVALID_STATUS | 400 | 잘못된 상태 전이 | 현재 상태에서는 수행할 수 없습니다. |
| PROCESS_ERROR | 500 | 프로세스 오류 | 작업 실행 중 오류가 발생했습니다. |
| TIMEOUT | 500 | 타임아웃 | 작업 시간이 초과되었습니다. |
| RATE_LIMITED | 429 | 요청 제한 | 요청이 너무 많습니다. 잠시 후 다시 시도해주세요. |
| INTERNAL_ERROR | 500 | 서버 오류 | 서버 오류가 발생했습니다. |

### TypeScript 에러 타입

```typescript
// types/api.ts

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PATH_NOT_FOUND'
  | 'PATH_NOT_DIRECTORY'
  | 'NOT_FOUND'
  | 'TASK_CONFLICT'
  | 'INVALID_STATUS'
  | 'PROCESS_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  PATH_NOT_FOUND: 400,
  PATH_NOT_DIRECTORY: 400,
  NOT_FOUND: 404,
  TASK_CONFLICT: 409,
  INVALID_STATUS: 400,
  PROCESS_ERROR: 500,
  TIMEOUT: 500,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
```
```

### 7. API 클라이언트

```markdown
## API 클라이언트

### 타입 안전한 Fetch 래퍼

```typescript
// lib/api-client.ts
import type { Task, Project, Schedule, Settings } from '@/types/entities';
import type { ApiError, ListResponse, SuccessResponse } from '@/types/api';

class ApiClient {
  private baseUrl = '/api';

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error: ApiError };
      throw new ApiClientError(
        error.error.code,
        error.error.message,
        response.status,
        error.error.details
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Tasks
  async getTasks(params?: TaskQueryParams): Promise<ListResponse<Task>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status.join(','));
    if (params?.type) searchParams.set('type', params.type.join(','));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<SuccessResponse<Task>> {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskInput): Promise<SuccessResponse<Task>> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: UpdateTaskInput): Promise<SuccessResponse<Task>> {
    return this.request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async stopTask(id: string): Promise<SuccessResponse<Partial<Task>>> {
    return this.request(`/tasks/${id}/stop`, { method: 'POST' });
  }

  async retryTask(id: string): Promise<SuccessResponse<Task>> {
    return this.request(`/tasks/${id}/retry`, { method: 'POST' });
  }

  // Validate
  async validatePath(path: string): Promise<PathValidationResult> {
    const response = await this.request<{ data: PathValidationResult }>('/validate/path', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
    return response.data;
  }

  // Stats
  async getStats(): Promise<StatsResponse> {
    return this.request('/stats');
  }
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  isConflict(): boolean {
    return this.code === 'TASK_CONFLICT';
  }

  isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }
}

export const apiClient = new ApiClient();
```

### React Query 훅

```typescript
// hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { toast } from 'sonner';

export function useTasks(params?: TaskQueryParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => apiClient.getTasks(params),
    staleTime: 30 * 1000, // 30초
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.getTask(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('작업이 생성되었습니다');
    },
    onError: (error: ApiClientError) => {
      toast.error(error.message);
    },
  });
}

export function useStopTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.stopTask,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('작업이 중지되었습니다');
    },
    onError: (error: ApiClientError) => {
      toast.error(error.message);
    },
  });
}
```
```

---

## 산출물 템플릿

`result/design/04_api.md`에 작성:

```markdown
# API 설계

## 1. 개요

- **Base URL**: /api
- **버전**: v1
- **형식**: JSON

---

## 2. 공통 사항

### 응답 형식
[응답 형식 정의]

### 에러 형식
[에러 형식 정의]

### HTTP 상태 코드
| 코드 | 의미 |
|------|------|
| | |

---

## 3. 엔드포인트 목록

### [리소스명]
| 메서드 | 경로 | 설명 |
|--------|------|------|
| | | |

---

## 4. 엔드포인트 상세

### [METHOD] [PATH]

**설명**: ...

**Request**
```json
{}
```

**Response 200**
```json
{}
```

**Response 4xx**
```json
{}
```

---

## 5. SSE API

### 이벤트 타입
| 타입 | 페이로드 |
|------|----------|
| | |

---

## 6. 에러 코드

| 코드 | HTTP | 메시지 |
|------|------|--------|
| | | |

---

## 7. API 클라이언트

```typescript
// 클라이언트 코드
```

---

## 다음 단계
→ 2.5 아키텍처
```

---

## 체크리스트

- [ ] 모든 엔드포인트 정의됨
- [ ] Request/Response 형식 명시
- [ ] 검증 규칙 정의됨
- [ ] 모든 에러 응답 정의됨
- [ ] SSE API 정의됨
- [ ] 필터링/정렬/페이징 정의됨
- [ ] 에러 코드 표준화됨
- [ ] API 클라이언트 코드 작성됨
- [ ] TypeScript 타입 정의됨

---

## 다음 단계

→ `05_architecture.md` (아키텍처)
