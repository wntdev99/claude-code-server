# Phase 완료 프로토콜 처리

## 개요

서브 에이전트가 Phase 완료 신호를 보낼 때 감지하고 처리하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 Phase 완료 처리를 다룹니다.
> **서브 에이전트의 완료 신호 방법**은 `../../../sub-agent/docs/protocols/phase-completion.md` 참조

## 프로토콜 형식

### Phase 완료 신호

서브 에이전트가 다음 형식으로 출력합니다:

```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_persona.md
- docs/planning/04_user_journey.md
- docs/planning/05_business_model.md
- docs/planning/06_product.md
- docs/planning/07_features.md
- docs/planning/08_tech.md
- docs/planning/09_roadmap.md

Ready for review.
```

### 필드 정의

```typescript
// agent-manager/types/protocols.ts
export interface PhaseCompletion {
  phase: number;
  name: string;
  deliverables: string[];
}
```

## 감지 및 파싱

### 출력 감지

```typescript
// agent-manager/lib/protocols/detector.ts
export function detectProtocol(output: string): Protocol | null {
  // Phase 완료 감지
  if (output.includes('=== PHASE') && output.includes('COMPLETE ===')) {
    return parsePhaseCompletion(output);
  }

  // 다른 프로토콜 감지
  // ...

  return null;
}
```

### 파싱 구현

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export function parsePhaseCompletion(output: string): PhaseCompletion | null {
  // 1. Phase 번호 추출
  const phaseMatch = output.match(/=== PHASE (\d+) COMPLETE ===/);
  if (!phaseMatch) {
    return null;
  }

  const phase = parseInt(phaseMatch[1]);

  // 2. Phase 이름 추출
  const nameMatch = output.match(/Completed:\s*Phase\s*\d+\s*\((.+?)\)/i);
  const name = nameMatch ? nameMatch[1].trim() : `Phase ${phase}`;

  // 3. 산출물 목록 추출
  const deliverables: string[] = [];
  const lines = output.split('\n');
  let inDeliverables = false;

  for (const line of lines) {
    // "Documents created:" 또는 "Files created:" 다음부터 산출물
    if (
      line.includes('Documents created:') ||
      line.includes('Files created:')
    ) {
      inDeliverables = true;
      continue;
    }

    if (inDeliverables) {
      // 파일 경로 패턴 매칭
      const fileMatch = line.match(/^[\s-]*(.+\.(?:md|ts|tsx|js|jsx|json|yaml|yml|txt))$/);
      if (fileMatch) {
        deliverables.push(fileMatch[1].trim());
      } else if (line.trim() === '' || line.includes('===') || line.includes('Ready for review')) {
        // 산출물 목록 종료
        break;
      }
    }
  }

  return {
    phase,
    name,
    deliverables,
  };
}
```

## 처리 흐름

### 핸들러

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export async function handlePhaseCompletion(
  taskId: string,
  completion: PhaseCompletion
): Promise<void> {
  console.log(`Phase ${completion.phase} completed for ${taskId}`);

  try {
    // 1. 에이전트 일시 중지
    pauseAgentExecution(taskId, `Phase ${completion.phase} completed, waiting for review`);

    // 2. Checkpoint 생성
    await createCheckpoint(taskId, 'phase_completion', {
      phase: completion.phase,
      name: completion.name,
      deliverables: completion.deliverables,
      timestamp: new Date().toISOString(),
    });

    // 3. Phase 상태 업데이트
    await db.phase.upsert({
      where: {
        taskId_phase: {
          taskId,
          phase: completion.phase,
        },
      },
      create: {
        taskId,
        phase: completion.phase,
        name: completion.name,
        status: 'completed',
        deliverables: completion.deliverables,
        completedAt: new Date(),
      },
      update: {
        status: 'completed',
        deliverables: completion.deliverables,
        completedAt: new Date(),
      },
    });

    // 4. 산출물 검증
    const validation = await validateDeliverables(taskId, completion);
    if (!validation.valid) {
      console.warn(`Deliverables validation failed for ${taskId}:`, validation.errors);
    }

    // 5. 리뷰 생성
    const review = await db.review.create({
      data: {
        taskId,
        phase: completion.phase,
        phaseName: completion.name,
        deliverables: completion.deliverables,
        status: 'pending',
        validationResult: validation,
        requestedAt: new Date(),
      },
    });

    // 6. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'waiting_review',
      blockedBy: 'review',
      blockedReason: `Phase ${completion.phase} awaiting review`,
      currentPhase: completion.phase,
    });

    // 7. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'review_required',
      data: {
        reviewId: review.id,
        phase: completion.phase,
        phaseName: completion.name,
        deliverables: completion.deliverables,
        validationResult: validation,
      },
    });

    console.log(`Review created for Phase ${completion.phase}: ${review.id}`);
  } catch (error) {
    console.error(`Failed to handle phase completion for ${taskId}:`, error);
    await handleProtocolError(taskId, 'phase_completion', error);
  }
}
```

## 산출물 검증

### 파일 존재 확인

```typescript
// agent-manager/lib/protocols/phase-completion.ts
import fs from 'fs/promises';
import path from 'path';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

async function validateDeliverables(
  taskId: string,
  completion: PhaseCompletion
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const state = getAgentState(taskId);
  if (!state) {
    errors.push('Agent state not found');
    return { valid: false, errors };
  }

  const workingDir = state.workingDir;

  // 1. 각 산출물 파일 존재 확인
  for (const deliverable of completion.deliverables) {
    const filePath = path.join(workingDir, deliverable);

    try {
      const stats = await fs.stat(filePath);

      // 파일인지 확인
      if (!stats.isFile()) {
        errors.push(`${deliverable} is not a file`);
        continue;
      }

      // 파일 크기 확인 (너무 작으면 경고)
      if (stats.size < 500) {
        warnings.push(`${deliverable} is very small (${stats.size} bytes)`);
      }

      // 파일 내용 간단 검증 (플레이스홀더 확인)
      if (deliverable.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf-8');

        // 플레이스홀더 패턴
        const placeholders = [
          /\[TODO\]/i,
          /\[Insert .+?\]/i,
          /\[Fill .+?\]/i,
          /\[Add .+?\]/i,
          /TBD/i,
        ];

        for (const pattern of placeholders) {
          if (pattern.test(content)) {
            warnings.push(`${deliverable} contains placeholder: ${pattern.source}`);
          }
        }

        // 최소 길이 확인 (500자)
        if (content.length < 500) {
          warnings.push(`${deliverable} is shorter than 500 characters (${content.length})`);
        }
      }
    } catch (error) {
      errors.push(`${deliverable} not found or inaccessible`);
    }
  }

  // 2. Phase별 필수 파일 개수 확인
  const expectedCounts: Record<number, number> = {
    1: 9,  // Planning: 9개 문서
    2: 5,  // Design: 5개 문서
    3: 1,  // Development: 최소 1개 (package.json)
  };

  const expectedCount = expectedCounts[completion.phase];
  if (expectedCount && completion.deliverables.length < expectedCount) {
    warnings.push(
      `Expected at least ${expectedCount} deliverables, but got ${completion.deliverables.length}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
```

## Review 승인/거부

### 승인 처리

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export interface ReviewApproval {
  reviewId: string;
  feedback?: string;
}

export async function approveReview(
  taskId: string,
  approval: ReviewApproval
): Promise<boolean> {
  const { reviewId, feedback } = approval;

  try {
    // 1. Review 조회
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.taskId !== taskId) {
      console.error(`Review not found: ${reviewId}`);
      return false;
    }

    if (review.status !== 'pending') {
      console.error(`Review ${reviewId} is not pending`);
      return false;
    }

    // 2. Review 상태 업데이트
    await db.review.update({
      where: { id: reviewId },
      data: {
        status: 'approved',
        feedback,
        reviewedAt: new Date(),
      },
    });

    // 3. 에이전트에 승인 메시지 전달
    const state = getAgentState(taskId);
    if (!state || !state.process) {
      return false;
    }

    let message = `[REVIEW_APPROVED]\nreviewId: ${reviewId}\n`;
    if (feedback) {
      message += `feedback: ${feedback}\n`;
    }
    message += `[/REVIEW_APPROVED]\n`;

    state.process.stdin?.write(message);

    // 4. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'running',
      blockedBy: null,
      blockedReason: null,
      currentPhase: review.phase + 1, // 다음 Phase로
    });

    // 5. 에이전트 재개
    resumeAgentExecution({ taskId });

    console.log(`Review ${reviewId} approved for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to approve review ${reviewId}:`, error);
    return false;
  }
}
```

### 거부 처리

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export interface ReviewRejection {
  reviewId: string;
  reason: string;
  suggestions?: string;
}

export async function rejectReview(
  taskId: string,
  rejection: ReviewRejection
): Promise<boolean> {
  const { reviewId, reason, suggestions } = rejection;

  try {
    // 1. Review 조회
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.taskId !== taskId) {
      console.error(`Review not found: ${reviewId}`);
      return false;
    }

    if (review.status !== 'pending') {
      console.error(`Review ${reviewId} is not pending`);
      return false;
    }

    // 2. Review 상태 업데이트
    await db.review.update({
      where: { id: reviewId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        suggestions,
        reviewedAt: new Date(),
      },
    });

    // 3. 에이전트에 거부 메시지 전달
    const state = getAgentState(taskId);
    if (!state || !state.process) {
      return false;
    }

    let message = `[REVIEW_REJECTED]\nreviewId: ${reviewId}\nreason: ${reason}\n`;
    if (suggestions) {
      message += `suggestions: ${suggestions}\n`;
    }
    message += `[/REVIEW_REJECTED]\n`;

    state.process.stdin?.write(message);

    // 4. 에이전트 상태 업데이트 (같은 Phase 유지)
    await updateAgentState(taskId, {
      status: 'running',
      blockedBy: null,
      blockedReason: null,
      // currentPhase는 변경하지 않음 (재작업)
    });

    // 5. 에이전트 재개
    resumeAgentExecution({ taskId });

    console.log(`Review ${reviewId} rejected for ${taskId}`);
    return true;
  } catch (error) {
    console.error(`Failed to reject review ${reviewId}:`, error);
    return false;
  }
}
```

## 다음 Phase 시작

### Phase 전환

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export async function startNextPhase(taskId: string, currentPhase: number): Promise<void> {
  const nextPhase = currentPhase + 1;

  // Phase 맵핑 (create_app 기준)
  const phaseNames: Record<number, string> = {
    1: 'Planning',
    2: 'Design',
    3: 'Development',
    4: 'Testing',
  };

  const nextPhaseName = phaseNames[nextPhase];
  if (!nextPhaseName) {
    // 모든 Phase 완료
    await completeTask(taskId);
    return;
  }

  console.log(`Starting Phase ${nextPhase} (${nextPhaseName}) for ${taskId}`);

  // 1. Phase 레코드 생성
  await db.phase.create({
    data: {
      taskId,
      phase: nextPhase,
      name: nextPhaseName,
      status: 'in_progress',
      startedAt: new Date(),
    },
  });

  // 2. 에이전트 상태 업데이트
  await updateAgentState(taskId, {
    currentPhase: nextPhase,
    currentStep: null,
  });

  // Note: 에이전트 재개는 이미 approveReview에서 수행됨
}

async function completeTask(taskId: string): Promise<void> {
  console.log(`All phases completed for ${taskId}`);

  // 1. Task 상태 업데이트
  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // 2. 에이전트 상태 업데이트
  await updateAgentState(taskId, {
    status: 'completed',
    progress: 100,
  });

  // 3. 웹 서버에 알림
  notifyWebServer(taskId, {
    type: 'task_completed',
    data: { taskId },
  });

  // 4. 에이전트 종료
  await terminateAgent(taskId, true); // graceful
}
```

## 자동 리뷰 (선택)

### AI 기반 자동 검증

```typescript
// agent-manager/lib/protocols/phase-completion.ts
export async function performAutoReview(
  taskId: string,
  completion: PhaseCompletion
): Promise<{ approved: boolean; feedback: string }> {
  // 산출물 검증 결과 기반
  const validation = await validateDeliverables(taskId, completion);

  // 에러가 있으면 자동 거부
  if (!validation.valid && validation.errors && validation.errors.length > 0) {
    return {
      approved: false,
      feedback: `Auto-review failed:\n${validation.errors.join('\n')}`,
    };
  }

  // 경고만 있으면 조건부 승인
  if (validation.warnings && validation.warnings.length > 0) {
    return {
      approved: true,
      feedback: `Auto-review passed with warnings:\n${validation.warnings.join('\n')}`,
    };
  }

  // 완벽
  return {
    approved: true,
    feedback: 'Auto-review passed successfully.',
  };
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/protocols/phase-completion.test.ts
import { parsePhaseCompletion, validateDeliverables } from '@/lib/protocols/phase-completion';

describe('Phase Completion Protocol', () => {
  describe('parsePhaseCompletion', () => {
    it('should parse Phase 1 completion', () => {
      const output = `
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_persona.md

Ready for review.
      `;

      const result = parsePhaseCompletion(output);

      expect(result).toEqual({
        phase: 1,
        name: 'Planning',
        deliverables: [
          'docs/planning/01_idea.md',
          'docs/planning/02_market.md',
          'docs/planning/03_persona.md',
        ],
      });
    });

    it('should parse Phase 3 completion', () => {
      const output = `
=== PHASE 3 COMPLETE ===
Completed: Phase 3 (Development)
Files created:
- package.json
- app/page.tsx
- lib/db.ts

Project structure created with working code.

Ready for review.
      `;

      const result = parsePhaseCompletion(output);

      expect(result).toEqual({
        phase: 3,
        name: 'Development',
        deliverables: [
          'package.json',
          'app/page.tsx',
          'lib/db.ts',
        ],
      });
    });
  });
});
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../lifecycle/execution.md`** - Review 승인/거부 처리
2. **`../../../sub-agent/docs/protocols/phase-completion.md`** - 완료 신호 형식 (양방향 동기화)
3. **`../../../claude-code-server/docs/features/protocol-parsing.md`** - 웹 서버의 파싱 로직
4. **`../../../claude-code-server/docs/features/review-system.md`** - Review 시스템
5. **`../checkpoint/creation.md`** - Phase 완료 시 Checkpoint 생성

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`../lifecycle/execution.md`** - 실행 및 제어
4. **`../checkpoint/creation.md`** - Checkpoint 생성 시점

## 다음 단계

- **Checkpoint 생성**: `../checkpoint/creation.md` - 상태 저장
- **Review 시스템**: `../../../claude-code-server/docs/features/review-system.md` - 웹 UI에서 리뷰
- **Execution**: `../lifecycle/execution.md` - 에이전트 제어

## 관련 문서

- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Sub-Agent - Phase Completion**: `../../../sub-agent/docs/protocols/phase-completion.md`
- **Web Server - Review System**: `../../../claude-code-server/docs/features/review-system.md`
- **Checkpoint - Creation**: `../checkpoint/creation.md`
