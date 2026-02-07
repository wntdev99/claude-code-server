# 리뷰 시스템

## 개요

Phase 완료 후 사용자가 산출물을 검토하고 승인/거부하는 시스템을 설명합니다.

## Review 생명주기

### 상태 전이

```
pending → approved → (다음 Phase 시작)
        → rejected → (현재 Phase 재작업)
```

### Review 데이터 구조

```typescript
// types/review.ts
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  taskId: string;
  phase: number;
  phaseName: string;
  deliverables: string[];      // 산출물 파일 경로
  validationResult: ValidationResult;
  status: ReviewStatus;
  feedback?: string;           // 승인/거부 시 피드백
  rejectionReason?: string;    // 거부 사유
  suggestions?: string;        // 개선 제안
  requestedAt: Date;
  reviewedAt?: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}
```

## Review 생성

### 자동 생성 (Phase 완료 시)

```typescript
// lib/reviews/creator.ts
export async function createReview(
  taskId: string,
  completion: PhaseCompletion
): Promise<Review> {
  // 1. 산출물 검증
  const validation = await validateDeliverables(taskId, completion);

  // 2. Review 생성
  const review = await db.review.create({
    data: {
      taskId,
      phase: completion.phase,
      phaseName: completion.name,
      deliverables: completion.deliverables,
      validationResult: validation,
      status: 'pending',
      requestedAt: new Date(),
    },
  });

  // 3. 사용자에게 알림
  notifyReviewRequired(taskId, review);

  console.log(`Review created: ${review.id} for Phase ${completion.phase}`);
  return review;
}
```

### 산출물 검증

```typescript
// lib/reviews/validator.ts
import fs from 'fs/promises';
import path from 'path';

export async function validateDeliverables(
  taskId: string,
  completion: PhaseCompletion
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const workingDir = `/projects/${taskId}`;

  // 각 산출물 검증
  for (const deliverable of completion.deliverables) {
    const filePath = path.join(workingDir, deliverable);

    try {
      const stats = await fs.stat(filePath);

      // 파일 존재 및 크기
      if (!stats.isFile()) {
        errors.push(`${deliverable} is not a file`);
        continue;
      }

      if (stats.size < 500) {
        warnings.push(`${deliverable} is very small (${stats.size} bytes)`);
      }

      // Markdown 파일 검증
      if (deliverable.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf-8');

        // 플레이스홀더 확인
        const placeholders = [
          /\[TODO\]/i,
          /\[Insert .+?\]/i,
          /\[Fill .+?\]/i,
          /TBD/i,
        ];

        for (const pattern of placeholders) {
          if (pattern.test(content)) {
            warnings.push(`${deliverable} contains placeholder: ${pattern.source}`);
          }
        }

        // 최소 길이
        if (content.length < 500) {
          warnings.push(`${deliverable} is shorter than 500 characters (${content.length})`);
        }
      }
    } catch (error) {
      errors.push(`${deliverable} not found or inaccessible`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
```

## Review 조회

### API - 목록 조회

```typescript
// app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const taskId = searchParams.get('taskId');
    const status = searchParams.get('status') as ReviewStatus | null;

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

### API - 단일 조회

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

## Review 승인

### API Handler

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

    // 승인 처리
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

### 승인 로직

```typescript
// lib/reviews/approver.ts
export async function approveReview(
  taskId: string,
  approval: { reviewId: string; feedback?: string }
): Promise<boolean> {
  const { reviewId, feedback } = approval;

  try {
    // 1. Review 업데이트
    await db.review.update({
      where: { id: reviewId },
      data: {
        status: 'approved',
        feedback,
        reviewedAt: new Date(),
      },
    });

    // 2. Phase 상태 업데이트
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (review) {
      await db.phase.update({
        where: {
          taskId_phase: {
            taskId,
            phase: review.phase,
          },
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    // 3. 에이전트에 승인 메시지 전달
    await sendApprovalToAgent(taskId, reviewId, feedback);

    // 4. Task 상태 업데이트
    await updateTaskStatus(taskId, {
      status: 'in_progress',
    });

    // 5. 에이전트 재개
    resumeAgent({ taskId });

    console.log(`Review ${reviewId} approved`);
    return true;
  } catch (error) {
    console.error(`Failed to approve review ${reviewId}:`, error);
    return false;
  }
}

async function sendApprovalToAgent(
  taskId: string,
  reviewId: string,
  feedback?: string
) {
  const state = getAgentState(taskId);
  if (!state?.process) return;

  let message = `[REVIEW_APPROVED]\nreviewId: ${reviewId}\n`;
  if (feedback) {
    message += `feedback: ${feedback}\n`;
  }
  message += `[/REVIEW_APPROVED]\n`;

  state.process.stdin?.write(message);
}
```

## Review 거부

### API Handler

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

    // 거부 처리
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

### 거부 로직

```typescript
// lib/reviews/rejector.ts
export async function rejectReview(
  taskId: string,
  rejection: { reviewId: string; reason: string; suggestions?: string }
): Promise<boolean> {
  const { reviewId, reason, suggestions } = rejection;

  try {
    // 1. Review 업데이트
    await db.review.update({
      where: { id: reviewId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        suggestions,
        reviewedAt: new Date(),
      },
    });

    // 2. 에이전트에 거부 메시지 전달
    await sendRejectionToAgent(taskId, reviewId, reason, suggestions);

    // 3. Task 상태 업데이트 (같은 Phase 유지)
    await updateTaskStatus(taskId, {
      status: 'in_progress',
    });

    // 4. 에이전트 재개
    resumeAgent({ taskId });

    console.log(`Review ${reviewId} rejected`);
    return true;
  } catch (error) {
    console.error(`Failed to reject review ${reviewId}:`, error);
    return false;
  }
}

async function sendRejectionToAgent(
  taskId: string,
  reviewId: string,
  reason: string,
  suggestions?: string
) {
  const state = getAgentState(taskId);
  if (!state?.process) return;

  let message = `[REVIEW_REJECTED]\nreviewId: ${reviewId}\nreason: ${reason}\n`;
  if (suggestions) {
    message += `suggestions: ${suggestions}\n`;
  }
  message += `[/REVIEW_REJECTED]\n`;

  state.process.stdin?.write(message);
}
```

## 산출물 다운로드

### ZIP 다운로드

```typescript
// app/api/reviews/[id]/download/route.ts
import archiver from 'archiver';
import { Readable } from 'stream';

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

    // ZIP 파일 생성
    const archive = archiver('zip', { zlib: { level: 9 } });

    // 산출물 추가
    for (const deliverable of review.deliverables) {
      const filePath = path.join(workingDir, deliverable);
      archive.file(filePath, { name: deliverable });
    }

    archive.finalize();

    // Stream으로 반환
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

## 자동 승인 (선택적)

### AI 기반 자동 검증

```typescript
// lib/reviews/auto-approver.ts
export async function performAutoApproval(review: Review): Promise<boolean> {
  // 검증 결과 확인
  const { validationResult } = review;

  // 에러가 있으면 자동 거부
  if (!validationResult.valid && validationResult.errors && validationResult.errors.length > 0) {
    await rejectReview(review.taskId, {
      reviewId: review.id,
      reason: `Auto-rejection: ${validationResult.errors.join(', ')}`,
    });
    return false;
  }

  // 경고만 있으면 자동 승인
  if (validationResult.warnings && validationResult.warnings.length > 0) {
    await approveReview(review.taskId, {
      reviewId: review.id,
      feedback: `Auto-approved with warnings: ${validationResult.warnings.join(', ')}`,
    });
    return true;
  }

  // 완벽하면 자동 승인
  await approveReview(review.taskId, {
    reviewId: review.id,
    feedback: 'Auto-approved: All validation passed',
  });
  return true;
}
```

## UI 컴포넌트 예시

### Review 카드

```typescript
// components/ReviewCard.tsx
'use client';

import { useState } from 'react';
import { Review } from '@/types/review';

interface ReviewCardProps {
  review: Review;
  onApprove: (reviewId: string, feedback: string) => void;
  onReject: (reviewId: string, reason: string, suggestions: string) => void;
}

export function ReviewCard({ review, onApprove, onReject }: ReviewCardProps) {
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');
  const [suggestions, setSuggestions] = useState('');

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">
        Phase {review.phase}: {review.phaseName}
      </h3>

      <div className="mt-4">
        <h4 className="font-semibold">Deliverables:</h4>
        <ul className="list-disc list-inside">
          {review.deliverables.map(file => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      </div>

      {review.validationResult.warnings && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800">Warnings:</h4>
          <ul className="list-disc list-inside text-yellow-700">
            {review.validationResult.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {review.status === 'pending' && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Feedback / Rejection Reason
            </label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={feedback || reason}
              onChange={e => {
                setFeedback(e.target.value);
                setReason(e.target.value);
              }}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => onApprove(review.id, feedback)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(review.id, reason, suggestions)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {review.status === 'approved' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-semibold">✓ Approved</p>
          {review.feedback && <p className="text-green-700 mt-2">{review.feedback}</p>}
        </div>
      )}

      {review.status === 'rejected' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 font-semibold">✗ Rejected</p>
          {review.rejectionReason && (
            <p className="text-red-700 mt-2">{review.rejectionReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`task-management.md`** - Task 상태 변경
2. **`../api/reviews-api.md`** - Reviews API 명세
3. **`../../agent-manager/docs/protocols/phase-completion.md`** - Phase 완료 처리
4. **`../../CLAUDE.md`** - 웹 서버 기능 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Features 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개요
3. **`task-management.md`** - Task 관리
4. **`process-management.md`** - 프로세스 관리

## 다음 단계

- **Reviews API**: `../api/reviews-api.md` - API 명세
- **Task Management**: `task-management.md` - Task 관리
- **Process Management**: `process-management.md` - 프로세스 관리

## 관련 문서

- **Reviews API**: `../api/reviews-api.md`
- **Task Management**: `task-management.md`
- **Process Management**: `process-management.md`
- **Agent Manager - Phase Completion**: `../../agent-manager/docs/protocols/phase-completion.md`
