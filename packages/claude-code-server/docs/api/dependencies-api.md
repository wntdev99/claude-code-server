# Dependencies API

## 개요

에이전트가 요청한 의존성(API 키, 환경 변수 등)을 조회하고 제공하는 API 명세입니다.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### 1. List Dependencies

모든 의존성 요청 목록을 조회합니다.

**Endpoint**: `GET /api/dependencies`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | No | 특정 Task의 의존성만 조회 |
| status | string | No | 상태 필터: `pending`, `provided`, `rejected`, `timeout` |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "dependencies": [
      {
        "id": "dep_abc123",
        "taskId": "task_xyz789",
        "type": "api_key",
        "name": "OPENAI_API_KEY",
        "description": "Required for OpenAI GPT-4 API integration",
        "required": true,
        "status": "pending",
        "requestedAt": "2024-01-10T12:00:00.000Z",
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
// app/api/dependencies/route.ts
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

    const dependencies = await db.dependency.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
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
      data: { dependencies },
    });
  } catch (error) {
    console.error('Failed to fetch dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependencies' },
      { status: 500 }
    );
  }
}
```

---

### 2. Get Dependency

특정 의존성의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/dependencies/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "taskId": "task_xyz789",
    "type": "api_key",
    "name": "OPENAI_API_KEY",
    "description": "Required for OpenAI GPT-4 API integration in AI chat feature. Get your API key from https://platform.openai.com/api-keys",
    "required": true,
    "status": "pending",
    "requestedAt": "2024-01-10T12:00:00.000Z",
    "task": {
      "id": "task_xyz789",
      "title": "AI Todo App 개발",
      "type": "create_app",
      "status": "waiting_dependency"
    }
  }
}
```

**Errors**:
- `404 Not Found`: Dependency가 존재하지 않음

**구현 예시**:
```typescript
// app/api/dependencies/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dependency = await db.dependency.findUnique({
      where: { id: params.id },
      include: {
        task: true,
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: dependency });
  } catch (error) {
    console.error('Failed to fetch dependency:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency' },
      { status: 500 }
    );
  }
}
```

---

### 3. Provide Dependency

의존성 값을 제공하고 에이전트를 재개합니다.

**Endpoint**: `POST /api/dependencies/:id/provide`

**Request Body**:
```json
{
  "value": "sk-1234567890abcdef..."
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| value | string | Yes | 의존성 값 |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dependency provided successfully"
}
```

**Errors**:
- `404 Not Found`: Dependency가 존재하지 않음
- `400 Bad Request`: Dependency가 pending 상태가 아님 또는 값이 유효하지 않음

**구현 예시**:
```typescript
// app/api/dependencies/[id]/provide/route.ts
import { provideDependency } from '@/lib/dependencies/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { value } = body;

    if (!value) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    const dependency = await db.dependency.findUnique({
      where: { id: params.id },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    if (dependency.status !== 'pending') {
      return NextResponse.json(
        { error: 'Dependency is not pending' },
        { status: 400 }
      );
    }

    // 값 검증
    const validation = validateDependencyValue(dependency.type, value);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 제공
    const success = await provideDependency({
      taskId: dependency.taskId,
      dependencyId: params.id,
      value,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to provide dependency' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dependency provided successfully',
    });
  } catch (error) {
    console.error('Failed to provide dependency:', error);
    return NextResponse.json(
      { error: 'Failed to provide dependency' },
      { status: 500 }
    );
  }
}
```

### 값 검증

```typescript
// lib/dependencies/validator.ts
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateDependencyValue(type: string, value: string): ValidationResult {
  // 빈 값 확인
  if (!value || value.trim().length === 0) {
    return { valid: false, error: 'Value cannot be empty' };
  }

  // 타입별 검증
  switch (type) {
    case 'api_key':
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return { valid: false, error: 'Invalid API key format' };
      }
      if (value.length < 8) {
        return { valid: false, error: 'API key too short' };
      }
      break;

    case 'service':
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: 'Only HTTP(S) protocols allowed' };
        }
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
      break;

    case 'file':
      if (value.includes('..')) {
        return { valid: false, error: 'Path traversal detected' };
      }
      break;
  }

  return { valid: true };
}
```

---

### 4. Reject Dependency

의존성 요청을 거부합니다.

**Endpoint**: `POST /api/dependencies/:id/reject`

**Request Body**:
```json
{
  "reason": "Cannot provide OpenAI API key at this time"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | 거부 사유 |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dependency rejected successfully"
}
```

**구현 예시**:
```typescript
// app/api/dependencies/[id]/reject/route.ts
import { rejectDependency } from '@/lib/dependencies/rejector';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const dependency = await db.dependency.findUnique({
      where: { id: params.id },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    const success = await rejectDependency(params.id, reason);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reject dependency' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dependency rejected successfully',
    });
  } catch (error) {
    console.error('Failed to reject dependency:', error);
    return NextResponse.json(
      { error: 'Failed to reject dependency' },
      { status: 500 }
    );
  }
}
```

## 의존성 타입

### 지원되는 타입

```typescript
type DependencyType =
  | 'api_key'        // API 키
  | 'env_variable'   // 환경 변수
  | 'service'        // 외부 서비스 URL
  | 'file'           // 파일 경로
  | 'permission'     // 권한
  | 'package';       // npm 패키지
```

### 타입별 예시

#### api_key
```json
{
  "type": "api_key",
  "name": "OPENAI_API_KEY",
  "description": "OpenAI API key from https://platform.openai.com/api-keys",
  "required": true
}
```

#### env_variable
```json
{
  "type": "env_variable",
  "name": "DATABASE_URL",
  "description": "PostgreSQL connection string",
  "required": true
}
```

#### service
```json
{
  "type": "service",
  "name": "REDIS_URL",
  "description": "Redis server URL for caching",
  "required": false
}
```

#### file
```json
{
  "type": "file",
  "name": "GOOGLE_CREDENTIALS_PATH",
  "description": "Path to Google Cloud credentials JSON",
  "required": true
}
```

## 암호화 (보안)

### 저장 시 암호화

```typescript
// lib/dependencies/crypto.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 제공 시 암호화 적용

```typescript
// lib/dependencies/provider.ts
import { encrypt } from './crypto';

export async function provideDependency(request: {
  taskId: string;
  dependencyId: string;
  value: string;
}): Promise<boolean> {
  const { taskId, dependencyId, value } = request;

  try {
    // 값 암호화
    const encryptedValue = encrypt(value);

    // DB 저장
    await db.dependency.update({
      where: { id: dependencyId },
      data: {
        value: encryptedValue,
        status: 'provided',
        providedAt: new Date(),
      },
    });

    // 에이전트에 전달 (평문)
    await injectDependency(taskId, value);

    return true;
  } catch (error) {
    console.error('Failed to provide dependency:', error);
    return false;
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../features/protocol-parsing.md`** - 의존성 프로토콜 파싱
2. **`tasks-api.md`** - Task와의 연동
3. **`../../agent-manager/docs/protocols/dependency.md`** - 의존성 처리
4. **`../../CLAUDE.md`** - API 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - API 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`../features/protocol-parsing.md`** - 프로토콜 파싱
4. **Front-end**: UI 컴포넌트에서 API 호출

## 다음 단계

- **Protocol Parsing**: `../features/protocol-parsing.md` - 프로토콜 파싱
- **Tasks API**: `tasks-api.md` - Tasks API
- **Reviews API**: `reviews-api.md` - Reviews API

## 관련 문서

- **Protocol Parsing**: `../features/protocol-parsing.md`
- **Tasks API**: `tasks-api.md`
- **Reviews API**: `reviews-api.md`
- **Agent Manager - Dependency Protocol**: `../../agent-manager/docs/protocols/dependency.md`
- **Sub-Agent - Dependency Request**: `../../sub-agent/docs/protocols/dependency-request.md`
