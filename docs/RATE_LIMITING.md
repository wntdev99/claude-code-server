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

> **Note**: 아래 `parseTokenUsage` 함수는 구현 참고용 예시입니다. 현재 코드에서는
> `TokenTracker` 클래스(`packages/agent-manager/src/TokenTracker.ts`)가 token 추적을 담당하며,
> `RateLimitDetector`는 rate limit 에러 패턴만 감지합니다.

```typescript
/**
 * [참고 예시] Claude Code CLI stdout에서 Token 사용량 파싱
 * 실제 구현은 TokenTracker.ts를 참조하세요.
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
 * [참고 예시] Agent stdout 모니터링
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

---

## 다중 Agent Rate Limit 분배 정책

여러 Agent가 동시에 실행될 때 Claude API Rate Limit을 공평하게 분배하는 메커니즘입니다.

### 문제 상황

```
전체 Rate Limit: 80,000 TPM (Tokens Per Minute)

Agent A: 60,000 TPM 사용 중
Agent B: 30,000 TPM 사용 요청
→ 총 90,000 TPM → Rate Limit 초과!
```

### 분배 전략

#### 1. 공평 분배 (Fair Share)

각 Agent가 동등한 Rate Limit을 받습니다.

```typescript
// packages/agent-manager/src/RateLimitAllocator.ts

export class FairShareAllocator {
  private readonly TOTAL_TPM = 80000;
  private readonly TOTAL_RPM = 1000;
  private activeAgents: Set<string> = new Set();

  /**
   * Agent별 할당량 계산
   */
  getAllocation(taskId: string): RateLimitAllocation {
    const agentCount = this.activeAgents.size;

    if (agentCount === 0) {
      return {
        tpm: this.TOTAL_TPM,
        rpm: this.TOTAL_RPM,
      };
    }

    return {
      tpm: Math.floor(this.TOTAL_TPM / agentCount),
      rpm: Math.floor(this.TOTAL_RPM / agentCount),
    };
  }

  /**
   * Agent 등록
   */
  registerAgent(taskId: string): void {
    this.activeAgents.add(taskId);
    console.log(`📊 Agent registered. Total: ${this.activeAgents.size}`);
    console.log(`   TPM per agent: ${this.getAllocation(taskId).tpm}`);

    // 모든 Agent에 새로운 할당량 통보
    this.notifyAllAgents();
  }

  /**
   * Agent 해제
   */
  unregisterAgent(taskId: string): void {
    this.activeAgents.delete(taskId);
    console.log(`📊 Agent unregistered. Remaining: ${this.activeAgents.size}`);

    // 남은 Agent들에 증가된 할당량 통보
    this.notifyAllAgents();
  }

  /**
   * 모든 Agent에 할당량 업데이트 통보
   */
  private notifyAllAgents(): void {
    for (const taskId of this.activeAgents) {
      const allocation = this.getAllocation(taskId);
      eventBus.emit('rate_limit_updated', { taskId, allocation });
    }
  }
}
```

**예시**:
```
1 Agent: 80,000 TPM
2 Agents: 40,000 TPM each
3 Agents: 26,666 TPM each
4 Agents: 20,000 TPM each
```

#### 2. 우선순위 기반 분배 (Priority-Based)

중요한 Task에 더 많은 할당량을 부여합니다.

```typescript
export class PriorityBasedAllocator {
  private readonly TOTAL_TPM = 80000;
  private tasks: Map<string, TaskPriority> = new Map();

  /**
   * 우선순위별 가중치
   */
  private readonly WEIGHTS = {
    critical: 4,
    high: 2,
    normal: 1,
    low: 0.5,
  };

  /**
   * 우선순위 기반 할당량 계산
   */
  getAllocation(taskId: string): RateLimitAllocation {
    const priority = this.tasks.get(taskId) || 'normal';
    const totalWeight = this.calculateTotalWeight();
    const taskWeight = this.WEIGHTS[priority];

    const tpm = Math.floor((this.TOTAL_TPM * taskWeight) / totalWeight);

    return { tpm, rpm: Math.floor(tpm / 80) }; // 대략 80 tokens/request
  }

  /**
   * 전체 가중치 계산
   */
  private calculateTotalWeight(): number {
    let total = 0;
    for (const priority of this.tasks.values()) {
      total += this.WEIGHTS[priority];
    }
    return total || 1;
  }

  /**
   * Task 우선순위 설정
   */
  setTaskPriority(taskId: string, priority: TaskPriority): void {
    this.tasks.set(taskId, priority);
    console.log(`🎯 Task ${taskId} priority set to ${priority}`);

    // 모든 Agent에 새로운 할당량 통보
    this.notifyAllAgents();
  }
}
```

**예시** (2 Agents):
```
Task A (critical): 4/(4+1) = 64,000 TPM
Task B (normal):   1/(4+1) = 16,000 TPM
```

#### 3. 동적 분배 (Dynamic Allocation)

실제 사용량 기반으로 동적 조정합니다.

```typescript
export class DynamicAllocator {
  private readonly TOTAL_TPM = 80000;
  private readonly MIN_TPM = 5000; // 최소 보장
  private usage: Map<string, number> = new Map(); // 최근 1분 사용량

  /**
   * 동적 할당량 계산
   */
  getAllocation(taskId: string): RateLimitAllocation {
    const activeAgents = this.usage.size;
    const currentUsage = this.usage.get(taskId) || 0;
    const totalUsage = Array.from(this.usage.values()).reduce((a, b) => a + b, 0);

    // 1. 최소 보장량 확보
    const guaranteed = this.MIN_TPM;

    // 2. 남은 TPM을 사용량 비율로 분배
    const remaining = this.TOTAL_TPM - (activeAgents * this.MIN_TPM);
    const additionalAllocation = totalUsage > 0
      ? Math.floor((remaining * currentUsage) / totalUsage)
      : Math.floor(remaining / activeAgents);

    const tpm = guaranteed + additionalAllocation;

    return { tpm, rpm: Math.floor(tpm / 80) };
  }

  /**
   * 사용량 업데이트
   */
  updateUsage(taskId: string, tokensUsed: number): void {
    this.usage.set(taskId, tokensUsed);

    // 1분마다 사용량 리셋
    setTimeout(() => {
      this.usage.set(taskId, 0);
    }, 60000);

    // 할당량 재계산
    this.rebalance();
  }

  /**
   * 할당량 재조정
   */
  private rebalance(): void {
    for (const taskId of this.usage.keys()) {
      const allocation = this.getAllocation(taskId);
      eventBus.emit('rate_limit_updated', { taskId, allocation });
    }
  }
}
```

**예시** (2 Agents):
```
초기:
  Task A: 5,000 (guaranteed) + 37,500 (additional) = 42,500 TPM
  Task B: 5,000 (guaranteed) + 37,500 (additional) = 42,500 TPM

1분 후 (A가 많이 사용):
  Task A (30,000 사용): 5,000 + 46,666 = 51,666 TPM
  Task B (10,000 사용): 5,000 + 23,334 = 28,334 TPM
```

### 구현 예시

#### Agent Manager 통합

```typescript
// packages/agent-manager/src/AgentManager.ts

export class AgentManager {
  private allocator: RateLimitAllocator;

  constructor(strategy: 'fair' | 'priority' | 'dynamic') {
    switch (strategy) {
      case 'fair':
        this.allocator = new FairShareAllocator();
        break;
      case 'priority':
        this.allocator = new PriorityBasedAllocator();
        break;
      case 'dynamic':
        this.allocator = new DynamicAllocator();
        break;
    }
  }

  async spawnAgent(taskId: string, priority?: TaskPriority): Promise<void> {
    // 1. Agent 등록
    this.allocator.registerAgent(taskId);

    if (this.allocator instanceof PriorityBasedAllocator && priority) {
      this.allocator.setTaskPriority(taskId, priority);
    }

    // 2. 할당량 조회
    const allocation = this.allocator.getAllocation(taskId);

    // 3. Agent 프로세스 생성 (환경 변수로 제한 전달)
    const agentProcess = spawn('claude', ['chat'], {
      env: {
        ...process.env,
        RATE_LIMIT_TPM: allocation.tpm.toString(),
        RATE_LIMIT_RPM: allocation.rpm.toString(),
      },
    });

    // 4. Token 사용량 모니터링
    agentProcess.stdout.on('data', (data) => {
      const tokenUsage = parseTokenUsage(data.toString());
      if (tokenUsage && this.allocator instanceof DynamicAllocator) {
        this.allocator.updateUsage(taskId, tokenUsage.total);
      }
    });

    // 5. 할당량 업데이트 수신
    eventBus.on('rate_limit_updated', ({ taskId: id, allocation: newAllocation }) => {
      if (id === taskId) {
        console.log(`📊 Rate limit updated for ${taskId}: ${newAllocation.tpm} TPM`);
        // Agent에 새로운 제한 전달 (SIGUSR1 + stdin)
        this.updateAgentRateLimit(agentProcess, newAllocation);
      }
    });
  }

  async stopAgent(taskId: string): Promise<void> {
    // Agent 해제
    this.allocator.unregisterAgent(taskId);
  }
}
```

#### Sub-Agent에서 할당량 준수

```typescript
// Sub-Agent가 환경 변수로 Rate Limit 읽기
const rateLimitTPM = parseInt(process.env.RATE_LIMIT_TPM || '80000');
const rateLimitRPM = parseInt(process.env.RATE_LIMIT_RPM || '1000');

class AgentTokenTracker {
  private tokensUsedThisMinute = 0;
  private requestsThisMinute = 0;

  async canMakeRequest(estimatedTokens: number): Promise<boolean> {
    // TPM 체크
    if (this.tokensUsedThisMinute + estimatedTokens > rateLimitTPM) {
      console.warn(`⚠️  TPM limit reached (${this.tokensUsedThisMinute}/${rateLimitTPM})`);
      return false;
    }

    // RPM 체크
    if (this.requestsThisMinute >= rateLimitRPM) {
      console.warn(`⚠️  RPM limit reached (${this.requestsThisMinute}/${rateLimitRPM})`);
      return false;
    }

    return true;
  }

  recordRequest(tokensUsed: number): void {
    this.tokensUsedThisMinute += tokensUsed;
    this.requestsThisMinute += 1;
  }

  // 1분마다 리셋
  resetCounters(): void {
    this.tokensUsedThisMinute = 0;
    this.requestsThisMinute = 0;
  }
}

// 1분마다 카운터 리셋
setInterval(() => tracker.resetCounters(), 60000);
```

### 공평성 보장

#### 대기열 시스템과 결합

```typescript
export class FairQueueManager {
  private queue: PQueue;
  private allocator: RateLimitAllocator;

  constructor(allocator: RateLimitAllocator) {
    this.allocator = allocator;

    // 전체 Rate Limit 기반 concurrency 설정
    this.queue = new PQueue({
      concurrency: 5, // 동시 실행 Agent 수
      interval: 60000, // 1분
      intervalCap: this.allocator.TOTAL_RPM, // 분당 최대 요청 수
    });
  }

  async scheduleAgent(taskId: string, priority: number): Promise<void> {
    return this.queue.add(
      async () => {
        await this.runAgent(taskId);
      },
      { priority }
    );
  }
}
```

### 모니터링 및 조정

```typescript
// 실시간 할당 현황
export async function GET() {
  const allocator = agentManager.getAllocator();
  const allocations: Record<string, RateLimitAllocation> = {};

  for (const taskId of allocator.getActiveAgents()) {
    allocations[taskId] = allocator.getAllocation(taskId);
  }

  return Response.json({
    strategy: allocator.getStrategy(), // 'fair' | 'priority' | 'dynamic'
    totalTPM: 80000,
    totalRPM: 1000,
    activeAgents: allocator.getActiveAgents().length,
    allocations,
  });
}
```

**응답 예시**:
```json
{
  "strategy": "priority",
  "totalTPM": 80000,
  "totalRPM": 1000,
  "activeAgents": 3,
  "allocations": {
    "task_abc": { "tpm": 40000, "rpm": 500 },
    "task_def": { "tpm": 26666, "rpm": 333 },
    "task_ghi": { "tpm": 13334, "rpm": 167 }
  }
}
```

### 권장 전략

**프로덕션 환경**:

```typescript
// 우선순위 + 동적 조합
export class HybridAllocator {
  private priorityAllocator = new PriorityBasedAllocator();
  private dynamicAllocator = new DynamicAllocator();

  getAllocation(taskId: string): RateLimitAllocation {
    // 1. 우선순위 기반 기본 할당
    const baseAllocation = this.priorityAllocator.getAllocation(taskId);

    // 2. 사용량 기반 미세 조정
    const adjustment = this.dynamicAllocator.getAdjustment(taskId);

    return {
      tpm: baseAllocation.tpm + adjustment.tpm,
      rpm: baseAllocation.rpm + adjustment.rpm,
    };
  }
}
```

**개발 환경**:
- Fair Share (간단함)

---

## Rate Limit 감지 실패 폴백

### 개요

Rate Limit은 다양한 방법으로 감지되지만, 모든 케이스를 100% 감지할 수 없습니다. 감지 실패 시 폴백 메커니즘이 필요합니다.

### 감지 실패 시나리오

#### 1. ERROR 프로토콜 누락

**원인**: Sub-Agent가 ERROR 프로토콜을 출력하지 않고 조용히 실패

**증상**:
```
Agent stuck at "Waiting for API response..."
No output for 5 minutes
No ERROR protocol emitted
```

**폴백 전략**:

```typescript
// packages/agent-manager/src/RateLimitDetector.ts

export class RateLimitFallbackDetector {
  private lastOutputTime = new Map<string, number>();
  private stuckCheckInterval: NodeJS.Timeout | null = null;

  /**
   * 출력 없음 감지 시작 (30초마다 체크)
   */
  startMonitoring(taskId: string): void {
    this.lastOutputTime.set(taskId, Date.now());

    if (!this.stuckCheckInterval) {
      this.stuckCheckInterval = setInterval(() => {
        this.checkStuckAgents();
      }, 30 * 1000); // 30초
    }
  }

  /**
   * Agent 출력 기록
   */
  recordOutput(taskId: string): void {
    this.lastOutputTime.set(taskId, Date.now());
  }

  /**
   * 멈춘 Agent 감지
   */
  private async checkStuckAgents(): Promise<void> {
    const now = Date.now();
    const STUCK_THRESHOLD = 5 * 60 * 1000; // 5분

    for (const [taskId, lastOutput] of this.lastOutputTime.entries()) {
      const silentDuration = now - lastOutput;

      if (silentDuration > STUCK_THRESHOLD) {
        console.warn(`⚠️  Agent ${taskId} has been silent for ${silentDuration}ms`);

        // Rate Limit 가능성 높음
        await this.handleSuspectedRateLimit(taskId);
      }
    }
  }

  /**
   * Rate Limit 의심 처리
   */
  private async handleSuspectedRateLimit(taskId: string): Promise<void> {
    console.log(`🔍 Investigating suspected rate limit: ${taskId}`);

    // 1. Token 사용량 확인
    const tokenUsage = await this.getTokenUsage(taskId);

    if (tokenUsage.tpm > 70000 || tokenUsage.rpm > 900) {
      console.log('✅ Likely rate limit - token usage high');

      // Rate Limit 처리
      await this.handleRateLimit(taskId, 'fallback_detection');
    } else {
      // 다른 원인 (네트워크 오류, Agent 버그 등)
      console.log('❌ Not rate limit - investigating other causes');

      await this.investigateOtherCauses(taskId);
    }
  }

  /**
   * 기타 원인 조사
   */
  private async investigateOtherCauses(taskId: string): Promise<void> {
    // 1. Agent 프로세스 상태 확인
    const process = this.processManager.getProcess(taskId);

    if (!process || process.killed) {
      console.error(`❌ Agent process is dead: ${taskId}`);
      await this.handleDeadAgent(taskId);
      return;
    }

    // 2. 네트워크 연결 확인
    const isOnline = await this.checkNetworkConnection();
    if (!isOnline) {
      console.error(`❌ Network connection lost`);
      await this.handleNetworkError(taskId);
      return;
    }

    // 3. Agent에 ping 전송 (stdin으로 명령 전달)
    try {
      process.stdin?.write('\n'); // Nudge agent
      console.log('📤 Sent nudge to agent');

      // 10초 대기 후 출력 확인
      await this.waitForOutput(taskId, 10000);
    } catch (error) {
      console.error('Failed to nudge agent:', error);
    }
  }

  private async waitForOutput(taskId: string, timeoutMs: number): Promise<boolean> {
    const startTime = this.lastOutputTime.get(taskId) || 0;

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentTime = this.lastOutputTime.get(taskId) || 0;

        if (currentTime > startTime) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeoutMs);
    });
  }
}
```

#### 2. HTTP 429 응답 파싱 실패

**원인**: Claude Code CLI가 429 응답을 다르게 처리하거나 출력 포맷 변경

**폴백 전략**:

```typescript
export class HttpResponseMonitor {
  /**
   * Agent stdout을 모니터링하여 429 응답 감지
   */
  monitorStdout(taskId: string, output: string): void {
    // 다양한 패턴으로 감지
    const rateLimitPatterns = [
      /rate.?limit/i,
      /429/,
      /too many requests/i,
      /quota exceeded/i,
      /retry.?after/i,
      /please wait.*before retrying/i,
    ];

    for (const pattern of rateLimitPatterns) {
      if (pattern.test(output)) {
        console.log(`🚨 Rate limit detected via pattern: ${pattern}`);
        this.handleRateLimit(taskId, 'pattern_detection');
        return;
      }
    }
  }
}
```

#### 3. Token 카운터 부정확

**원인**: Prompt Caching 등으로 실제 사용량과 추정값 불일치

**폴백 전략**:

```typescript
export class TokenUsageValidator {
  /**
   * Token 사용량 검증 및 보정
   */
  async validateAndAdjust(taskId: string): Promise<void> {
    const estimated = this.tokenTracker.getUsage(taskId);
    const actual = await this.getActualUsageFromAPI(taskId); // Claude API에서 실제 사용량 조회

    const discrepancy = Math.abs(estimated.total - actual.total);
    const threshold = actual.total * 0.1; // 10% 허용 오차

    if (discrepancy > threshold) {
      console.warn(
        `⚠️  Token usage discrepancy: estimated=${estimated.total}, actual=${actual.total}`
      );

      // 실제 사용량으로 보정
      this.tokenTracker.setUsage(taskId, actual);

      // Rate Limit 재평가
      if (actual.tpm > 80000 || actual.rpm > 1000) {
        console.log('✅ Rate limit detected after correction');
        await this.handleRateLimit(taskId, 'usage_validation');
      }
    }
  }

  /**
   * Claude API에서 실제 사용량 조회
   */
  private async getActualUsageFromAPI(taskId: string): Promise<TokenUsage> {
    // Note: Claude API에 usage endpoint가 있다면 사용
    // 없다면 로그 파싱이나 다른 방법 사용

    // 예시 (가상의 API)
    const response = await fetch('https://api.anthropic.com/v1/usage', {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const data = await response.json();

    return {
      tpm: data.tokens_per_minute,
      rpm: data.requests_per_minute,
      total: data.total_tokens,
    };
  }
}
```

### 수동 오버라이드

사용자가 수동으로 Rate Limit 상태를 제어할 수 있습니다.

```typescript
// API: POST /api/tasks/:id/rate-limit-override

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { action } = await req.json();
  const taskId = params.id;

  switch (action) {
    case 'mark_as_rate_limited':
      // 수동으로 Rate Limit 상태 설정
      await agentManager.pauseAgent(taskId, 'rate_limit_manual');
      await checkpointManager.createCheckpoint(taskId, 'rate_limit_manual');

      return Response.json({
        success: true,
        message: 'Task marked as rate limited and paused',
      });

    case 'clear_rate_limit':
      // Rate Limit 상태 해제 및 재개
      await agentManager.resumeAgent(taskId);

      return Response.json({
        success: true,
        message: 'Rate limit cleared, task resumed',
      });

    case 'reset_token_counter':
      // Token 카운터 리셋
      tokenTracker.reset(taskId);

      return Response.json({
        success: true,
        message: 'Token counter reset',
      });

    default:
      return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }
}
```

### 모니터링 알림

```typescript
export class RateLimitMonitoring {
  /**
   * Rate Limit 감지 실패 알림
   */
  async notifyDetectionFailure(taskId: string, reason: string): Promise<void> {
    await this.alertService.send({
      type: 'rate_limit_detection_failure',
      severity: 'warning',
      taskId,
      reason,
      message: `Rate limit may not have been detected properly for ${taskId}`,
      actions: [
        {
          label: 'Manually mark as rate limited',
          url: `/api/tasks/${taskId}/rate-limit-override`,
          method: 'POST',
          body: { action: 'mark_as_rate_limited' },
        },
        {
          label: 'Investigate',
          url: `/tasks/${taskId}/logs`,
        },
      ],
    });
  }

  /**
   * 의심스러운 패턴 감지 시 알림
   */
  async notifySuspiciousPattern(taskId: string, pattern: string): Promise<void> {
    await this.alertService.send({
      type: 'suspicious_rate_limit_pattern',
      severity: 'info',
      taskId,
      pattern,
      message: `Suspicious pattern detected: ${pattern}. Possible rate limit.`,
    });
  }
}
```

### 대시보드 표시

```typescript
// app/components/TaskMonitor.tsx

export function TaskMonitor({ taskId }: { taskId: string }) {
  const [lastOutput, setLastOutput] = useState<number>(Date.now());
  const [silentDuration, setSilentDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Date.now() - lastOutput;
      setSilentDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastOutput]);

  // Agent 출력 시 업데이트
  useSSE(`/api/tasks/${taskId}/logs`, (event) => {
    setLastOutput(Date.now());
  });

  return (
    <div>
      <p>Last output: {formatDuration(silentDuration)} ago</p>

      {silentDuration > 2 * 60 * 1000 && (
        <div className="alert alert-warning">
          ⚠️  Agent has been silent for {formatDuration(silentDuration)}.
          Possible rate limit or stuck agent.
          <button onClick={() => manualRateLimitOverride(taskId)}>
            Mark as rate limited
          </button>
        </div>
      )}
    </div>
  );
}
```

### 자동 복구 전략

```typescript
export class AutoRecovery {
  /**
   * 감지 실패 후 자동 복구
   */
  async attemptAutoRecovery(taskId: string): Promise<void> {
    console.log(`🔄 Attempting auto-recovery for ${taskId}`);

    // 1. Checkpoint 생성
    await checkpointManager.createCheckpoint(taskId, 'auto_recovery');

    // 2. Agent 재시작
    await agentManager.restartAgent(taskId);

    // 3. Token 카운터 리셋
    tokenTracker.reset(taskId);

    // 4. 모니터링 재시작
    fallbackDetector.startMonitoring(taskId);

    console.log(`✅ Auto-recovery completed for ${taskId}`);
  }
}
```

### 테스트

```typescript
// __tests__/rate-limit-fallback.test.ts

describe('Rate Limit Fallback Detection', () => {
  test('should detect silent agent', async () => {
    const detector = new RateLimitFallbackDetector();
    const taskId = 'test-task';

    detector.startMonitoring(taskId);

    // 5분 대기 시뮬레이션
    jest.advanceTimersByTime(5 * 60 * 1000);

    // handleSuspectedRateLimit 호출 확인
    expect(mockHandleRateLimit).toHaveBeenCalledWith(taskId, 'fallback_detection');
  });

  test('should detect rate limit via pattern matching', () => {
    const monitor = new HttpResponseMonitor();
    const taskId = 'test-task';

    monitor.monitorStdout(taskId, 'Error: Rate limit exceeded. Please retry after 60 seconds.');

    expect(mockHandleRateLimit).toHaveBeenCalledWith(taskId, 'pattern_detection');
  });
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
**버전**: 1.1
