# Reviews API

## 개요

Phase 완료 후 생성되는 Review를 조회하고 승인/거부하는 API 명세입니다.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### 1. List Reviews

모든 Review 목록을 조회합니다.

**Endpoint**: `GET /api/reviews`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | No | 특정 Task의 Review만 조회 |
| status | string | No | 상태 필터: `pending`, `approved`, `rejected` |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_abc123",
        "taskId": "task_xyz789",
        "phase": 1,
        "phaseName": "Planning",
        "deliverables": [
          "docs/planning/01_idea.md",
          "docs/planning/02_market.md",
          "docs/planning/03_persona.md"
        ],
        "validationResult": {
          "valid": true,
          "warnings": ["docs/planning/01_idea.md is shorter than 500 characters"]
        },
        "status": "pending",
        "requestedAt": "2024-01-10T11:00:00.000Z",
        "task": {
          "id": "task_xyz789",
          "title": "AI Todo App 개발",
          "type": "create_app"
        }
      }
    ]
  }
}
```

**구현 예시**:
```typescript
// app/api/reviews/route.ts
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

    const reviews = await db.review.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
```

---

### 2. Get Review

특정 Review의 상세 정보를 조회합니다.

**Endpoint**: `GET /api/reviews/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "review_abc123",
    "taskId": "task_xyz789",
    "phase": 1,
    "phaseName": "Planning",
    "deliverables": [
      "docs/planning/01_idea.md",
      "docs/planning/02_market.md",
      "docs/planning/03_persona.md",
      "docs/planning/04_user_journey.md",
      "docs/planning/05_business_model.md",
      "docs/planning/06_product.md",
      "docs/planning/07_features.md",
      "docs/planning/08_tech.md",
      "docs/planning/09_roadmap.md"
    ],
    "validationResult": {
      "valid": true,
      "warnings": [
        "docs/planning/01_idea.md is shorter than 500 characters"
      ]
    },
    "status": "pending",
    "requestedAt": "2024-01-10T11:00:00.000Z",
    "task": {
      "id": "task_xyz789",
      "title": "AI Todo App 개발",
      "type": "create_app",
      "status": "waiting_review"
    }
  }
}
```

**Errors**:
- `404 Not Found`: Review가 존재하지 않음

**구현 예시**:
```typescript
// app/api/reviews/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const review = await db.review.findUnique({
      where: { id: params.id },
      include: {
        task: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error('Failed to fetch review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}
```

---

### 3. Approve Review

Review를 승인하고 다음 Phase를 시작합니다.

**Endpoint**: `POST /api/reviews/:id/approve`

**Request Body**:
```json
{
  "feedback": "Great work! The planning documents are comprehensive."
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feedback | string | No | 승인 피드백 |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Review approved successfully"
}
```

**Errors**:
- `404 Not Found`: Review가 존재하지 않음
- `400 Bad Request`: Review가 pending 상태가 아님

**구현 예시**:
```typescript
// app/api/reviews/[id]/approve/route.ts
import { approveReview } from '@/lib/reviews/approver';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { feedback } = body;

    const review = await db.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.status !== 'pending') {
      return NextResponse.json(
        { error: 'Review is not pending' },
        { status: 400 }
      );
    }

    const success = await approveReview(review.taskId, {
      reviewId: params.id,
      feedback,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to approve review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review approved successfully',
    });
  } catch (error) {
    console.error('Failed to approve review:', error);
    return NextResponse.json(
      { error: 'Failed to approve review' },
      { status: 500 }
    );
  }
}
```

---

### 4. Reject Review

Review를 거부하고 현재 Phase를 재작업합니다.

**Endpoint**: `POST /api/reviews/:id/reject`

**Request Body**:
```json
{
  "reason": "The market analysis (02_market.md) needs more specific data.",
  "suggestions": "Please add TAM, SAM, SOM data with sources."
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | 거부 사유 |
| suggestions | string | No | 개선 제안 |

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Review rejected successfully"
}
```

**Errors**:
- `404 Not Found`: Review가 존재하지 않음
- `400 Bad Request`: Review가 pending 상태가 아님 또는 reason 누락

**구현 예시**:
```typescript
// app/api/reviews/[id]/reject/route.ts
import { rejectReview } from '@/lib/reviews/rejector';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reason, suggestions } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.status !== 'pending') {
      return NextResponse.json(
        { error: 'Review is not pending' },
        { status: 400 }
      );
    }

    const success = await rejectReview(review.taskId, {
      reviewId: params.id,
      reason,
      suggestions,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reject review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review rejected successfully',
    });
  } catch (error) {
    console.error('Failed to reject review:', error);
    return NextResponse.json(
      { error: 'Failed to reject review' },
      { status: 500 }
    );
  }
}
```

---

### 5. Download Deliverables

Review의 산출물을 ZIP 파일로 다운로드합니다.

**Endpoint**: `GET /api/reviews/:id/download`

**Response**: ZIP file (application/zip)

**구현 예시**:
```typescript
// app/api/reviews/[id]/download/route.ts
import archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const review = await db.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    const workingDir = `/projects/${review.taskId}`;

    // ZIP 생성
    const archive = archiver('zip', { zlib: { level: 9 } });

    for (const deliverable of review.deliverables) {
      const filePath = path.join(workingDir, deliverable);
      archive.file(filePath, { name: deliverable });
    }

    archive.finalize();

    const stream = Readable.from(archive);

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="phase-${review.phase}-deliverables.zip"`,
      },
    });
  } catch (error) {
    console.error('Failed to download deliverables:', error);
    return NextResponse.json(
      { error: 'Failed to download deliverables' },
      { status: 500 }
    );
  }
}
```

---

### 6. Get Deliverable File

특정 산출물 파일의 내용을 조회합니다.

**Endpoint**: `GET /api/reviews/:id/files`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | 파일 경로 (예: `docs/planning/01_idea.md`) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "path": "docs/planning/01_idea.md",
    "content": "# 아이디어 정의\n\n## 문제 정의\n현재 사용자들은..."
  }
}
```

**구현 예시**:
```typescript
// app/api/reviews/[id]/files/route.ts
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // 파일이 산출물 목록에 있는지 확인
    if (!review.deliverables.includes(filePath)) {
      return NextResponse.json(
        { error: 'File not in deliverables' },
        { status: 403 }
      );
    }

    const fullPath = path.join(`/projects/${review.taskId}`, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    return NextResponse.json({
      success: true,
      data: {
        path: filePath,
        content,
      },
    });
  } catch (error) {
    console.error('Failed to read file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../features/review-system.md`** - Review 시스템 구현
2. **`tasks-api.md`** - Task와의 연동
3. **`../../agent-manager/docs/protocols/phase-completion.md`** - Phase 완료 프로토콜
4. **`../../CLAUDE.md`** - API 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - API 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`../features/review-system.md`** - Review 시스템
4. **Front-end**: UI 컴포넌트에서 API 호출

## 다음 단계

- **Review System**: `../features/review-system.md` - Review 시스템 구현
- **Tasks API**: `tasks-api.md` - Tasks API
- **Dependencies API**: `dependencies-api.md` - Dependencies API

## 관련 문서

- **Review System**: `../features/review-system.md`
- **Tasks API**: `tasks-api.md`
- **Dependencies API**: `dependencies-api.md`
- **Agent Manager - Phase Completion**: `../../agent-manager/docs/protocols/phase-completion.md`
