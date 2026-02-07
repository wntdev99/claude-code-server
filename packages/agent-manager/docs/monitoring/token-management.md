# 토큰 관리

## 개요

Claude API 토큰 사용량을 추적하고 관리하여 비용을 최적화하고 예산을 초과하지 않도록 합니다.

> **목적**: 토큰 사용량 실시간 추적, 예산 관리, 비용 계산, 최적화 전략

## 토큰이란?

### 개념

```
Token = 텍스트 조각 단위

- 입력 토큰 (Input Tokens): 프롬프트에 포함된 토큰
- 출력 토큰 (Output Tokens): 모델이 생성한 토큰

예시:
"Hello, world!" ≈ 3-4 tokens
```

### Claude API 토큰 가격

```typescript
// 2024년 기준 (실제 가격은 Anthropic 공식 사이트 확인)
const TOKEN_PRICES = {
  'claude-opus-4': {
    input: 15.0 / 1_000_000,    // $15 per 1M tokens
    output: 75.0 / 1_000_000,   // $75 per 1M tokens
  },
  'claude-sonnet-4-5': {
    input: 3.0 / 1_000_000,     // $3 per 1M tokens
    output: 15.0 / 1_000_000,   // $15 per 1M tokens
  },
  'claude-haiku-4-5': {
    input: 0.25 / 1_000_000,    // $0.25 per 1M tokens
    output: 1.25 / 1_000_000,   // $1.25 per 1M tokens
  },
};
```

## 토큰 추적

### TokenUsage 인터페이스

```typescript
// agent-manager/lib/monitoring/types.ts
export interface TokenUsage {
  taskId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

export interface TokenBudget {
  maxTokensPerTask: number;
  maxTokensPerDay: number;
  maxCostPerTask: number;
  maxCostPerDay: number;
}

export interface TokenStats {
  used: number;
  remaining: number;
  percentUsed: number;
  estimatedCost: number;
}
```

### 토큰 사용량 파싱

```typescript
// agent-manager/lib/monitoring/token-parser.ts
export function parseTokenUsage(apiResponse: any): TokenUsage {
  // Claude API 응답에서 토큰 정보 추출
  const usage = apiResponse.usage;

  return {
    taskId: getCurrentTaskId(),
    model: apiResponse.model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    cost: calculateCost(apiResponse.model, usage),
    timestamp: new Date(),
  };
}

function calculateCost(model: string, usage: any): number {
  const prices = TOKEN_PRICES[model];

  if (!prices) {
    console.warn(`Unknown model: ${model}`);
    return 0;
  }

  const inputCost = usage.input_tokens * prices.input;
  const outputCost = usage.output_tokens * prices.output;

  return inputCost + outputCost;
}
```

### 실시간 추적

```typescript
// agent-manager/lib/monitoring/token-tracker.ts
export class TokenTracker {
  private usage = new Map<string, TokenUsage[]>();

  track(usage: TokenUsage): void {
    const taskUsage = this.usage.get(usage.taskId) || [];
    taskUsage.push(usage);
    this.usage.set(usage.taskId, taskUsage);

    // 데이터베이스에 저장
    this.saveToDatabase(usage);

    // 실시간 이벤트 발행
    this.emit('token-usage', usage);

    // 예산 체크
    this.checkBudget(usage.taskId);
  }

  getTaskUsage(taskId: string): TokenUsage[] {
    return this.usage.get(taskId) || [];
  }

  getTotalUsage(taskId: string): TokenStats {
    const usageList = this.getTaskUsage(taskId);

    const totalTokens = usageList.reduce(
      (sum, u) => sum + u.totalTokens,
      0
    );

    const totalCost = usageList.reduce((sum, u) => sum + u.cost, 0);

    return {
      used: totalTokens,
      remaining: this.budget.maxTokensPerTask - totalTokens,
      percentUsed: (totalTokens / this.budget.maxTokensPerTask) * 100,
      estimatedCost: totalCost,
    };
  }

  private async saveToDatabase(usage: TokenUsage): Promise<void> {
    await db.tokenUsage.create({
      data: {
        taskId: usage.taskId,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cost: usage.cost,
        timestamp: usage.timestamp,
      },
    });
  }
}
```

## 예산 관리

### 예산 설정

```typescript
// agent-manager/lib/monitoring/budget-manager.ts
export class BudgetManager {
  private budget: TokenBudget;

  constructor(budget: TokenBudget) {
    this.budget = budget;
  }

  setBudget(budget: Partial<TokenBudget>): void {
    this.budget = {
      ...this.budget,
      ...budget,
    };
  }

  getBudget(): TokenBudget {
    return { ...this.budget };
  }

  checkTaskBudget(taskId: string): BudgetStatus {
    const stats = tokenTracker.getTotalUsage(taskId);

    return {
      tokensOverBudget: stats.used > this.budget.maxTokensPerTask,
      costOverBudget: stats.estimatedCost > this.budget.maxCostPerTask,
      percentUsed: stats.percentUsed,
      remaining: stats.remaining,
    };
  }

  checkDailyBudget(): BudgetStatus {
    const today = startOfDay(new Date());
    const usageToday = this.getUsageSince(today);

    const totalTokens = usageToday.reduce(
      (sum, u) => sum + u.totalTokens,
      0
    );

    const totalCost = usageToday.reduce((sum, u) => sum + u.cost, 0);

    return {
      tokensOverBudget: totalTokens > this.budget.maxTokensPerDay,
      costOverBudget: totalCost > this.budget.maxCostPerDay,
      percentUsed: (totalTokens / this.budget.maxTokensPerDay) * 100,
      remaining: this.budget.maxTokensPerDay - totalTokens,
    };
  }

  private getUsageSince(date: Date): TokenUsage[] {
    return db.tokenUsage.findMany({
      where: {
        timestamp: {
          gte: date,
        },
      },
    });
  }
}

interface BudgetStatus {
  tokensOverBudget: boolean;
  costOverBudget: boolean;
  percentUsed: number;
  remaining: number;
}
```

### 예산 초과 처리

```typescript
// agent-manager/lib/monitoring/budget-enforcer.ts
export function enforceTaskBudget(taskId: string): void {
  const status = budgetManager.checkTaskBudget(taskId);

  // 90% 경고
  if (status.percentUsed >= 90 && status.percentUsed < 100) {
    console.warn(`Task ${taskId} token budget 90% exceeded`);

    createAlert({
      level: AlertLevel.WARN,
      message: `Task ${taskId} is approaching token budget limit`,
      taskId,
      timestamp: new Date(),
      metadata: { percentUsed: status.percentUsed },
    });
  }

  // 100% 차단
  if (status.tokensOverBudget || status.costOverBudget) {
    console.error(`Task ${taskId} token budget exceeded`);

    createAlert({
      level: AlertLevel.CRITICAL,
      message: `Task ${taskId} exceeded token budget`,
      taskId,
      timestamp: new Date(),
      metadata: { status },
    });

    // 에이전트 일시중지
    pauseAgent(taskId);

    // 사용자에게 알림
    notifyBudgetExceeded(taskId, status);
  }
}

export function enforceDailyBudget(): void {
  const status = budgetManager.checkDailyBudget();

  if (status.tokensOverBudget || status.costOverBudget) {
    console.error('Daily token budget exceeded');

    // 모든 대기 중인 Task 차단
    pauseAllPendingTasks();

    // 관리자에게 알림
    notifyAdminBudgetExceeded(status);
  }
}
```

## 비용 계산

### 실시간 비용 추정

```typescript
// agent-manager/lib/monitoring/cost-estimator.ts
export function estimateTaskCost(taskId: string): CostEstimate {
  const usage = tokenTracker.getTaskUsage(taskId);

  if (usage.length === 0) {
    return {
      currentCost: 0,
      estimatedTotalCost: 0,
      confidence: 0,
    };
  }

  // 현재까지 비용
  const currentCost = usage.reduce((sum, u) => sum + u.cost, 0);

  // 평균 비용 계산
  const avgCostPerRequest = currentCost / usage.length;

  // 예상 남은 요청 수 (Phase 기반)
  const remainingRequests = estimateRemainingRequests(taskId);

  // 총 예상 비용
  const estimatedTotalCost =
    currentCost + avgCostPerRequest * remainingRequests;

  return {
    currentCost,
    estimatedTotalCost,
    confidence: calculateConfidence(usage.length),
  };
}

function estimateRemainingRequests(taskId: string): number {
  const task = getTask(taskId);
  const currentPhase = task.currentPhase || 1;
  const totalPhases = getWorkflowPhases(task.type).length;

  // 평균적으로 Phase당 10-15 요청
  const avgRequestsPerPhase = 12;

  return (totalPhases - currentPhase + 1) * avgRequestsPerPhase;
}

function calculateConfidence(sampleSize: number): number {
  // 샘플이 많을수록 신뢰도 증가
  return Math.min(sampleSize / 20, 1.0);
}

interface CostEstimate {
  currentCost: number;
  estimatedTotalCost: number;
  confidence: number;
}
```

### 비용 리포트

```typescript
// agent-manager/lib/monitoring/cost-reporter.ts
export async function generateCostReport(
  startDate: Date,
  endDate: Date
): Promise<CostReport> {
  const usage = await db.tokenUsage.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
  const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);

  const byModel = groupBy(usage, 'model');
  const byTask = groupBy(usage, 'taskId');

  return {
    period: { startDate, endDate },
    summary: {
      totalRequests: usage.length,
      totalTokens,
      totalCost,
      avgCostPerRequest: totalCost / usage.length,
    },
    byModel: Object.entries(byModel).map(([model, usages]) => ({
      model,
      requests: usages.length,
      tokens: usages.reduce((sum, u) => sum + u.totalTokens, 0),
      cost: usages.reduce((sum, u) => sum + u.cost, 0),
    })),
    byTask: Object.entries(byTask).map(([taskId, usages]) => ({
      taskId,
      requests: usages.length,
      tokens: usages.reduce((sum, u) => sum + u.totalTokens, 0),
      cost: usages.reduce((sum, u) => sum + u.cost, 0),
    })),
  };
}

interface CostReport {
  period: { startDate: Date; endDate: Date };
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgCostPerRequest: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  byTask: Array<{
    taskId: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}
```

## 최적화 전략

### 1. 프롬프트 최적화

```typescript
// 긴 프롬프트를 줄이기
function optimizePrompt(prompt: string): string {
  // 불필요한 공백 제거
  let optimized = prompt.replace(/\s+/g, ' ').trim();

  // 반복된 지시사항 제거
  optimized = removeDuplicateInstructions(optimized);

  // 짧은 표현으로 변경
  optimized = useConciselanguage(optimized);

  return optimized;
}

// ❌ 비효율적
const prompt = `
Please analyze the code and provide detailed explanations.
Make sure to check every single line carefully.
Be very thorough in your analysis.
`;

// ✅ 최적화
const prompt = 'Analyze code thoroughly';
```

### 2. 응답 길이 제한

```typescript
// Claude API 호출 시 max_tokens 설정
export async function callClaudeAPI(
  prompt: string,
  options?: { maxTokens?: number }
) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: options?.maxTokens || 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return response;
}

// Phase별 적절한 max_tokens 설정
const MAX_TOKENS_BY_PHASE = {
  planning: 2048,    // 계획은 간결하게
  design: 4096,      // 설계는 상세하게
  development: 2048, // 코드는 효율적으로
  testing: 1024,     // 테스트는 간결하게
};
```

### 3. 캐싱 활용

```typescript
// 자주 사용되는 프롬프트 캐싱
export class PromptCache {
  private cache = new Map<string, CachedPrompt>();

  get(key: string): string | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // 만료 확인
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.prompt;
  }

  set(key: string, prompt: string, ttl: number = 3600000): void {
    this.cache.set(key, {
      prompt,
      expiresAt: Date.now() + ttl,
    });
  }
}

interface CachedPrompt {
  prompt: string;
  expiresAt: number;
}
```

### 4. 모델 선택 최적화

```typescript
// Task 복잡도에 따라 모델 선택
export function selectOptimalModel(task: Task): string {
  const complexity = calculateComplexity(task);

  if (complexity === 'simple') {
    return 'claude-haiku-4-5';    // 저렴하고 빠름
  } else if (complexity === 'medium') {
    return 'claude-sonnet-4-5';   // 균형
  } else {
    return 'claude-opus-4';       // 복잡한 작업
  }
}

function calculateComplexity(task: Task): 'simple' | 'medium' | 'complex' {
  // Task 타입별 복잡도
  if (task.type === 'custom') return 'simple';
  if (task.type === 'workflow') return 'simple';
  if (task.type === 'create_app') return 'complex';
  if (task.type === 'modify_app') return 'medium';

  return 'medium';
}
```

## API 통합

### 토큰 사용량 조회 API

```typescript
// app/api/tasks/[id]/tokens/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  const usage = tokenTracker.getTaskUsage(taskId);
  const stats = tokenTracker.getTotalUsage(taskId);
  const estimate = estimateTaskCost(taskId);
  const budgetStatus = budgetManager.checkTaskBudget(taskId);

  return NextResponse.json({
    success: true,
    data: {
      usage,
      stats,
      estimate,
      budgetStatus,
    },
  });
}
```

### 예산 설정 API

```typescript
// app/api/admin/budget/route.ts
export async function PUT(request: NextRequest) {
  const session = await getSession(request);

  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();

  budgetManager.setBudget({
    maxTokensPerTask: body.maxTokensPerTask,
    maxTokensPerDay: body.maxTokensPerDay,
    maxCostPerTask: body.maxCostPerTask,
    maxCostPerDay: body.maxCostPerDay,
  });

  return NextResponse.json({
    success: true,
    budget: budgetManager.getBudget(),
  });
}
```

## 실시간 모니터링

### SSE로 토큰 사용량 스트리밍

```typescript
// app/api/tasks/[id]/tokens/stream/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // 토큰 사용 이벤트 구독
  const unsubscribe = tokenTracker.on('token-usage', (usage) => {
    if (usage.taskId !== taskId) return;

    const message = `data: ${JSON.stringify({
      type: 'token-usage',
      usage,
      stats: tokenTracker.getTotalUsage(taskId),
    })}\n\n`;

    writer.write(encoder.encode(message));
  });

  // 연결 종료 시 정리
  request.signal.addEventListener('abort', () => {
    unsubscribe();
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### UI 컴포넌트

```tsx
// components/TokenUsagePanel.tsx
export function TokenUsagePanel({ taskId }: { taskId: string }) {
  const [usage, setUsage] = useState<TokenStats | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/tokens/stream`);

    eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'token-usage') {
        setUsage(data.stats);
      }
    });

    return () => eventSource.close();
  }, [taskId]);

  if (!usage) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Tokens Used:</span>
        <span className="font-mono">
          {usage.used.toLocaleString()} / {(usage.used + usage.remaining).toLocaleString()}
        </span>
      </div>

      <div className="h-2 bg-gray-200 rounded">
        <div
          className={`h-full rounded ${
            usage.percentUsed > 90
              ? 'bg-red-500'
              : usage.percentUsed > 70
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
        />
      </div>

      <div className="text-sm text-gray-500">
        Estimated Cost: ${usage.estimatedCost.toFixed(4)}
      </div>
    </div>
  );
}
```

## 테스트

```typescript
// __tests__/lib/monitoring/token-tracker.test.ts
describe('TokenTracker', () => {
  it('should track token usage', () => {
    const tracker = new TokenTracker();

    tracker.track({
      taskId: 'task_123',
      model: 'claude-sonnet-4-5',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      cost: 0.012,
      timestamp: new Date(),
    });

    const usage = tracker.getTaskUsage('task_123');
    expect(usage).toHaveLength(1);
    expect(usage[0].totalTokens).toBe(1500);
  });

  it('should calculate total usage', () => {
    const tracker = new TokenTracker();

    tracker.track({ taskId: 'task_123', totalTokens: 1000, /* ... */ });
    tracker.track({ taskId: 'task_123', totalTokens: 500, /* ... */ });

    const stats = tracker.getTotalUsage('task_123');
    expect(stats.used).toBe(1500);
  });

  it('should check budget', () => {
    const budgetManager = new BudgetManager({
      maxTokensPerTask: 2000,
      maxTokensPerDay: 10000,
      maxCostPerTask: 0.1,
      maxCostPerDay: 1.0,
    });

    // 사용량 추가
    tokenTracker.track({ taskId: 'task_123', totalTokens: 1800, /* ... */ });

    const status = budgetManager.checkTaskBudget('task_123');
    expect(status.percentUsed).toBe(90);
    expect(status.tokensOverBudget).toBe(false);
  });
});
```

## 관련 문서

- **Status Tracking**: `status-tracking.md` - 상태 추적
- **Rate Limiting**: `rate-limit.md` - Rate Limit 처리
- **Monitoring README**: `README.md` - 모니터링 개요
