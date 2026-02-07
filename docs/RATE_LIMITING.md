# Rate Limiting (요청 제한)

이 문서는 Claude Code Server의 Rate Limiting 처리 시스템을 상세히 설명합니다.

---

## 개요

**Rate Limiting**은 Claude API의 사용량 제한을 준수하고, 제한 초과 시 자동으로 일시중지 및 재개하는 메커니즘입니다.

### Claude API Rate Limits

| Limit Type | Free Tier | Pro Tier | Enterprise |
|------------|-----------|----------|------------|
| Requests per minute (RPM) | 50 | 1000 | Custom |
| Tokens per minute (TPM) | 40,000 | 80,000 | Custom |
| Tokens per day (TPD) | 1,000,000 | 2,500,000 | Custom |

**참조**: [Claude API Documentation](https://docs.anthropic.com/claude/reference/rate-limits)

---

## Rate Limit 처리 흐름

### 전체 프로세스

```
1. Agent 실행 중
   ↓
2. Token 사용량 추적
   ↓
3. Rate Limit 근접 감지 (90% 도달)
   ↓
4. [WARNING] 로그 출력
   ↓
5. Rate Limit 초과
   ↓
6. [ERROR] type: recoverable 출력
   ↓
7. Agent Manager가 파싱
   ↓
8. Agent 일시중지 (SIGTSTP)
   ↓
9. Checkpoint 생성
   ↓
10. Rate Limit reset 시간 계산
   ↓
11. 스케줄러에 재개 작업 등록
   ↓
12. Reset 시간 대기
   ↓
13. Agent 자동 재개 (SIGCONT)
```

---

## Token 추적

### Agent Manager 구현

```typescript
interface TokenUsage {
  taskId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastUpdated: Date;
}

class TokenTracker {
  private usage: Map<string, TokenUsage> = new Map();
  private readonly TPM_LIMIT = 80000; // Pro tier
  private readonly WARNING_THRESHOLD = 0.9; // 90%

  /**
   * Token 사용량 업데이트
   */
  updateTokenUsage(taskId: string, input: number, output: number): void {
    const current = this.usage.get(taskId) || {
      taskId,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      lastUpdated: new Date(),
    };

    current.inputTokens += input;
    current.outputTokens += output;
    current.totalTokens += input + output;
    current.lastUpdated = new Date();

    this.usage.set(taskId, current);

    // DB에도 저장
    this.saveTokenUsageToDB(current);

    // Rate Limit 체크
    this.checkRateLimit(taskId);
  }

  /**
   * 1분당 Token 사용량 계산
   */
  getTokensPerMinute(taskId: string): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // 최근 1분간 사용량 합산
    const recentUsage = this.getUsageInTimeRange(taskId, oneMinuteAgo, now);
    return recentUsage.totalTokens;
  }

  /**
   * Rate Limit 체크
   */
  checkRateLimit(taskId: string): void {
    const tokensPerMinute = this.getTokensPerMinute(taskId);
    const usagePercent = tokensPerMinute / this.TPM_LIMIT;

    if (usagePercent >= this.WARNING_THRESHOLD) {
      console.warn(`⚠️  Rate limit warning: ${Math.round(usagePercent * 100)}%`);

      // 사용자에게 경고
      this.emitWarning(taskId, {
        type: 'rate_limit_warning',
        current: tokensPerMinute,
        limit: this.TPM_LIMIT,
        percent: usagePercent,
      });
    }

    if (usagePercent >= 1.0) {
      console.error(`🛑 Rate limit exceeded!`);
      this.handleRateLimitExceeded(taskId);
    }
  }

  /**
   * Rate Limit 초과 처리
   */
  async handleRateLimitExceeded(taskId: string): Promise<void> {
    console.log(`⏸️  Pausing task ${taskId} due to rate limit`);

    // 1. Agent 일시중지
    await pauseAgent(taskId);

    // 2. Checkpoint 생성
    await createCheckpoint(taskId, 'rate_limit');

    // 3. Reset 시간 계산
    const resetTime = this.calculateResetTime();
    const waitMs = resetTime.getTime() - Date.now();

    console.log(`⏰ Rate limit resets in ${Math.round(waitMs / 1000)}s`);

    // 4. 사용자에게 알림
    await notifyUser({
      taskId,
      type: 'rate_limit',
      message: `Task paused due to rate limit. Will resume in ${Math.round(waitMs / 60000)} minutes.`,
      resetTime,
    });

    // 5. 스케줄러에 재개 작업 등록
    this.scheduleResume(taskId, resetTime);
  }

  /**
   * Reset 시간 계산
   */
  calculateResetTime(): Date {
    // Rate limit은 1분 단위로 reset
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    return nextMinute;
  }

  /**
   * 자동 재개 스케줄링
   */
  scheduleResume(taskId: string, resetTime: Date): void {
    const waitMs = resetTime.getTime() - Date.now();

    setTimeout(async () => {
      console.log(`🔄 Rate limit reset. Resuming task ${taskId}`);

      // Token 카운터 리셋
      this.resetTokenCounter(taskId);

      // Agent 재개
      await resumeAgent(taskId);

      // 사용자에게 알림
      await notifyUser({
        taskId,
        type: 'resumed',
        message: 'Task resumed after rate limit reset',
      });
    }, waitMs);
  }

  /**
   * Token 카운터 리셋
   */
  resetTokenCounter(taskId: string): void {
    const usage = this.usage.get(taskId);
    if (usage) {
      // 기록 보관 (통계용)
      this.archiveUsage(usage);

      // 카운터 리셋
      this.usage.set(taskId, {
        taskId,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        lastUpdated: new Date(),
      });
    }
  }
}
```

---

## Token 계산

### Claude Code CLI에서 Token 추출

```typescript
/**
 * Claude Code CLI stdout에서 Token 사용량 파싱
 */
function parseTokenUsage(output: string): { input: number; output: number } | null {
  // Claude Code CLI는 각 API 호출 후 사용량 출력
  // 예: "Tokens used: 1250 input, 850 output"

  const match = output.match(/Tokens used: (\d+) input, (\d+) output/);
  if (match) {
    return {
      input: parseInt(match[1], 10),
      output: parseInt(match[2], 10),
    };
  }

  return null;
}

/**
 * Agent stdout 모니터링
 */
agent.process.stdout.on('data', (data: Buffer) => {
  const output = data.toString();

  // Token 사용량 파싱
  const tokenUsage = parseTokenUsage(output);
  if (tokenUsage) {
    tokenTracker.updateTokenUsage(taskId, tokenUsage.input, tokenUsage.output);
  }

  // 로그 기록
  logAgentOutput(taskId, output);
});
```

### Prompt Caching 고려

Claude API는 Prompt Caching을 지원하여 반복 요청 시 token을 절약합니다.

```typescript
interface CachedTokenUsage {
  input: number;           // 실제 입력 토큰
  output: number;          // 출력 토큰
  cacheRead: number;       // 캐시에서 읽은 토큰 (무료)
  cacheWrite: number;      // 캐시에 쓴 토큰 (25% 할인)
}

/**
 * 캐시 고려한 실제 비용 계산
 */
function calculateEffectiveTokens(usage: CachedTokenUsage): number {
  return (
    usage.input +
    usage.output +
    (usage.cacheWrite * 0.25) // 캐시 쓰기는 25% 할인
    // cacheRead는 무료이므로 제외
  );
}
```

---

## Rate Limit 예방

### 1. 지능형 Throttling

```typescript
class IntelligentThrottler {
  private readonly SAFETY_MARGIN = 0.85; // 85%까지만 사용

  /**
   * 요청 전 Rate Limit 체크
   */
  async canMakeRequest(taskId: string, estimatedTokens: number): Promise<boolean> {
    const current = tokenTracker.getTokensPerMinute(taskId);
    const projected = current + estimatedTokens;
    const limit = tokenTracker.TPM_LIMIT * this.SAFETY_MARGIN;

    if (projected > limit) {
      console.log(`⏸️  Throttling: projected ${projected} > limit ${limit}`);
      return false;
    }

    return true;
  }

  /**
   * Token 예측
   */
  estimateTokens(prompt: string): number {
    // 대략적인 추정: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }
}
```

### 2. 요청 배치 처리

여러 작은 요청을 하나의 큰 요청으로 결합:

```typescript
class RequestBatcher {
  private pendingRequests: Array<{
    prompt: string;
    resolve: (response: string) => void;
  }> = [];

  private batchTimeout: NodeJS.Timeout | null = null;

  /**
   * 요청 배치에 추가
   */
  addRequest(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.pendingRequests.push({ prompt, resolve });

      // 100ms 후 배치 실행
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, 100);
      }
    });
  }

  /**
   * 배치 실행
   */
  private async executeBatch(): Promise<void> {
    const batch = this.pendingRequests;
    this.pendingRequests = [];
    this.batchTimeout = null;

    if (batch.length === 0) return;

    // 모든 프롬프트 결합
    const combinedPrompt = batch.map((r, i) => `[Request ${i + 1}]\n${r.prompt}`).join('\n\n');

    // 단일 API 호출
    const response = await claudeAPI.call(combinedPrompt);

    // 응답 분할 및 resolve
    const responses = this.splitResponses(response);
    batch.forEach((req, i) => {
      req.resolve(responses[i]);
    });
  }
}
```

---

## 모니터링 및 알림

### 실시간 모니터링

```typescript
interface RateLimitMetrics {
  taskId: string;
  timestamp: Date;
  tokensPerMinute: number;
  percentUsed: number;
  estimatedTimeToLimit: number; // 초
}

/**
 * 메트릭 수집 (1초마다)
 */
setInterval(() => {
  for (const [taskId, usage] of tokenTracker.usage) {
    const tpm = tokenTracker.getTokensPerMinute(taskId);
    const percent = tpm / tokenTracker.TPM_LIMIT;

    const metrics: RateLimitMetrics = {
      taskId,
      timestamp: new Date(),
      tokensPerMinute: tpm,
      percentUsed: percent,
      estimatedTimeToLimit: estimateTimeToLimit(tpm),
    };

    // 메트릭 저장
    saveMetrics(metrics);

    // SSE로 웹 UI에 전송
    sendSSEEvent(taskId, 'rate_limit_metrics', metrics);
  }
}, 1000);
```

### 웹 UI 표시

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

export function RateLimitIndicator({ taskId }: { taskId: string }) {
  const [metrics, setMetrics] = useState<RateLimitMetrics | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.addEventListener('rate_limit_metrics', (e) => {
      const data = JSON.parse(e.data);
      setMetrics(data);
    });

    return () => eventSource.close();
  }, [taskId]);

  if (!metrics) return null;

  const percentUsed = metrics.percentUsed * 100;
  const isWarning = percentUsed > 90;
  const isDanger = percentUsed > 95;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Token Usage</span>
        <span className={isWarning ? 'text-yellow-600' : ''}>
          {Math.round(percentUsed)}%
        </span>
      </div>

      <Progress
        value={percentUsed}
        className={isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : ''}
      />

      {isWarning && (
        <p className="text-xs text-yellow-600">
          ⚠️ Approaching rate limit. Requests may slow down.
        </p>
      )}
    </div>
  );
}
```

---

## 비용 추적

### Token 비용 계산

```typescript
interface PricingTier {
  input: number;   // $ per million tokens
  output: number;  // $ per million tokens
}

const PRICING: Record<string, PricingTier> = {
  'claude-sonnet-4-5': {
    input: 3.00,   // $3 per 1M input tokens
    output: 15.00, // $15 per 1M output tokens
  },
  'claude-opus-4-6': {
    input: 15.00,
    output: 75.00,
  },
  'claude-haiku-4-5': {
    input: 0.25,
    output: 1.25,
  },
};

/**
 * Task의 총 비용 계산
 */
function calculateCost(taskId: string, model: string): number {
  const usage = tokenTracker.usage.get(taskId);
  if (!usage) return 0;

  const pricing = PRICING[model];
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * 실시간 비용 업데이트
 */
tokenTracker.on('usage_updated', (taskId, usage) => {
  const cost = calculateCost(taskId, 'claude-sonnet-4-5');

  // DB 업데이트
  db.task.update({
    where: { id: taskId },
    data: {
      tokensUsed: usage.totalTokens,
      cost,
    },
  });

  // UI 업데이트
  sendSSEEvent(taskId, 'cost_updated', { cost });
});
```

---

## 에러 처리

### ERROR 프로토콜

Sub-Agent가 Rate Limit을 감지하면:

```
[ERROR]
type: recoverable
message: Rate limit exceeded
details: API rate limit hit (80000 tokens/min)
recovery: pause_and_retry
[/ERROR]
```

Agent Manager 처리:

```typescript
agent.process.stdout.on('data', (data: Buffer) => {
  const output = data.toString();

  // ERROR 프로토콜 파싱
  const error = parseErrorProtocol(output);
  if (error && error.message.includes('Rate limit')) {
    handleRateLimitExceeded(taskId);
  }
});
```

---

## 최적화 전략

### 1. Prompt Engineering

Token을 절약하는 프롬프트 작성:

```typescript
// ❌ 비효율적 (많은 token)
const prompt = `
Please read the following guide document and generate a comprehensive planning document...
[전체 가이드 문서 포함]
`;

// ✅ 효율적 (적은 token)
const prompt = `
Guide: /guide/planning/01_idea.md (cached)
Task: Generate planning document based on guide
`;
```

### 2. Context Window 관리

긴 대화는 요약하여 token 절약:

```typescript
async function summarizeConversation(messages: Message[]): Promise<Message[]> {
  if (messages.length < 20) return messages;

  // 최근 10개 메시지만 유지
  const recent = messages.slice(-10);

  // 이전 메시지 요약
  const older = messages.slice(0, -10);
  const summary = await summarizeMessages(older);

  return [
    { role: 'system', content: `Previous conversation summary: ${summary}` },
    ...recent,
  ];
}
```

### 3. 캐시 활용

반복되는 프롬프트는 캐싱:

```typescript
// Prompt caching 활성화
const response = await claude.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: 'You are a helpful assistant...',
      cache_control: { type: 'ephemeral' }, // 캐싱
    },
  ],
  messages: [...],
});
```

---

## 관련 문서

- **Checkpoint 시스템**: `/docs/CHECKPOINT_SYSTEM.md`
- **Token 관리**: `/packages/agent-manager/docs/monitoring/token-management.md`
- **프로토콜**: `/docs/PROTOCOLS.md`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
