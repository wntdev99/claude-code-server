# Rate Limit 처리

## 개요

Claude API Rate Limit을 감지하고 자동으로 복구하는 시스템입니다.

> **목적**: Rate Limit 에러 감지, 자동 재시도, Exponential Backoff, 에이전트 복구

## Rate Limit이란?

### Claude API Rate Limits

```
Claude API는 다음과 같은 Rate Limits을 적용합니다:

1. RPM (Requests Per Minute)
   - 분당 요청 수 제한
   - 예: 50 RPM

2. TPM (Tokens Per Minute)
   - 분당 토큰 수 제한
   - 예: 40,000 TPM

3. Daily Limits
   - 일일 요청 수 제한
   - 일일 토큰 수 제한
```

### HTTP 429 에러

```
HTTP 429 Too Many Requests

Response Headers:
- retry-after: 60 (초 단위)
- x-ratelimit-limit-requests: 50
- x-ratelimit-remaining-requests: 0
- x-ratelimit-reset-requests: 2024-01-01T00:01:00Z
```

## Rate Limit 감지

### 에러 파싱

```typescript
// agent-manager/lib/monitoring/rate-limit-detector.ts
export interface RateLimitError {
  type: 'rate_limit';
  retryAfter: number; // 초 단위
  limit: number;
  remaining: number;
  resetAt: Date;
}

export function parseRateLimitError(error: any): RateLimitError | null {
  // HTTP 429 체크
  if (error.status !== 429) return null;

  const headers = error.response?.headers;

  if (!headers) return null;

  return {
    type: 'rate_limit',
    retryAfter: parseInt(headers['retry-after']) || 60,
    limit: parseInt(headers['x-ratelimit-limit-requests']) || 0,
    remaining: parseInt(headers['x-ratelimit-remaining-requests']) || 0,
    resetAt: new Date(headers['x-ratelimit-reset-requests']),
  };
}

export function isRateLimitError(error: any): boolean {
  return error.status === 429 || error.error?.type === 'rate_limit_error';
}
```

### 에이전트 출력에서 감지

```typescript
// agent-manager/lib/agent/output-parser.ts
export function detectRateLimitFromOutput(output: string): boolean {
  const rateLimitPatterns = [
    /rate limit/i,
    /429 too many requests/i,
    /quota exceeded/i,
    /retry after \d+ seconds/i,
  ];

  return rateLimitPatterns.some((pattern) => pattern.test(output));
}

// 에이전트 출력 모니터링
agent.stderr?.on('data', (data) => {
  const output = data.toString();

  if (detectRateLimitFromOutput(output)) {
    console.warn(`Rate limit detected for task ${taskId}`);
    handleRateLimit(taskId, output);
  }
});
```

## 자동 재시도 (Exponential Backoff)

### Retry 전략

```typescript
// agent-manager/lib/monitoring/retry-strategy.ts
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;    // ms
  maxDelay: number;        // ms
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelay: 1000,      // 1초
  maxDelay: 60000,         // 60초
  backoffMultiplier: 2,
  jitter: true,
};

export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff 계산
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);

  // 최대 지연 시간 제한
  delay = Math.min(delay, config.maxDelay);

  // Jitter 추가 (랜덤성)
  if (config.jitter) {
    const jitter = delay * 0.1 * Math.random();
    delay += jitter;
  }

  return Math.floor(delay);
}

// 예시 결과:
// Attempt 0: 1000ms
// Attempt 1: 2000ms + jitter
// Attempt 2: 4000ms + jitter
// Attempt 3: 8000ms + jitter
// Attempt 4: 16000ms + jitter
// Attempt 5: 32000ms + jitter (max: 60000ms)
```

### Retry 핸들러

```typescript
// agent-manager/lib/monitoring/rate-limit-handler.ts
export class RateLimitHandler {
  private retryConfig: RetryConfig;
  private retryAttempts = new Map<string, number>();

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = config;
  }

  async executeWithRetry<T>(
    taskId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        // 작업 실행
        const result = await operation();

        // 성공 시 재시도 카운터 리셋
        this.retryAttempts.delete(taskId);

        return result;
      } catch (error) {
        lastError = error;

        // Rate Limit 에러가 아니면 즉시 throw
        if (!isRateLimitError(error)) {
          throw error;
        }

        // Rate Limit 정보 파싱
        const rateLimitInfo = parseRateLimitError(error);

        console.warn(
          `Rate limit hit for task ${taskId}, attempt ${attempt + 1}/${
            this.retryConfig.maxRetries
          }`
        );

        // 재시도 카운터 증가
        this.retryAttempts.set(taskId, attempt + 1);

        // 마지막 시도면 throw
        if (attempt === this.retryConfig.maxRetries - 1) {
          throw new Error(`Max retries (${this.retryConfig.maxRetries}) exceeded`);
        }

        // Backoff 지연 계산
        const delay = rateLimitInfo
          ? rateLimitInfo.retryAfter * 1000
          : calculateBackoffDelay(attempt, this.retryConfig);

        console.log(`Retrying after ${delay}ms...`);

        // Checkpoint 생성
        await createCheckpoint(taskId, 'rate_limit_retry');

        // 대기
        await sleep(delay);

        // 재시도 전 상태 로깅
        console.log(`Retrying task ${taskId} (attempt ${attempt + 2})`);
      }
    }

    throw lastError;
  }

  getRetryAttempt(taskId: string): number {
    return this.retryAttempts.get(taskId) || 0;
  }

  resetRetryAttempt(taskId: string): void {
    this.retryAttempts.delete(taskId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## 에이전트 일시중지 및 복구

### Rate Limit 발생 시 처리

```typescript
// agent-manager/lib/agent/rate-limit-recovery.ts
export async function handleRateLimit(
  taskId: string,
  rateLimitInfo: RateLimitError
): Promise<void> {
  console.log(`Handling rate limit for task ${taskId}`);

  // 1. 에이전트 일시중지
  await pauseAgent(taskId);

  // 2. 상태 업데이트
  await updateTaskStatus(taskId, 'waiting_rate_limit', {
    blockedBy: 'rate_limit',
    retryAfter: rateLimitInfo.retryAfter,
    resetAt: rateLimitInfo.resetAt,
  });

  // 3. Checkpoint 생성
  const checkpoint = await createCheckpoint(taskId, 'rate_limit');

  // 4. 대기열에 추가 (낮은 우선순위)
  await addToQueue(taskId, 'low', {
    scheduledFor: rateLimitInfo.resetAt,
  });

  // 5. 알림 생성
  createAlert({
    level: AlertLevel.WARN,
    message: `Rate limit hit for task ${taskId}, retry at ${rateLimitInfo.resetAt}`,
    taskId,
    timestamp: new Date(),
    metadata: { rateLimitInfo },
  });

  // 6. 자동 재개 스케줄링
  scheduleResume(taskId, rateLimitInfo.resetAt, checkpoint);
}

async function scheduleResume(
  taskId: string,
  resumeAt: Date,
  checkpoint: Checkpoint
): Promise<void> {
  const delay = resumeAt.getTime() - Date.now();

  if (delay <= 0) {
    // 즉시 재개
    await resumeFromRateLimit(taskId, checkpoint);
    return;
  }

  console.log(`Scheduling resume for task ${taskId} at ${resumeAt}`);

  // 타이머 설정
  setTimeout(async () => {
    await resumeFromRateLimit(taskId, checkpoint);
  }, delay);
}
```

### 자동 재개

```typescript
// agent-manager/lib/agent/rate-limit-recovery.ts
export async function resumeFromRateLimit(
  taskId: string,
  checkpoint: Checkpoint
): Promise<void> {
  console.log(`Resuming task ${taskId} after rate limit`);

  try {
    // 1. Checkpoint로부터 복구
    const restored = await restoreFromCheckpoint(taskId, checkpoint);

    if (!restored) {
      throw new Error('Failed to restore from checkpoint');
    }

    // 2. 상태 업데이트
    await updateTaskStatus(taskId, 'running', {
      blockedBy: null,
      retryAfter: null,
    });

    // 3. 큐에서 제거
    removeFromQueue(taskId);

    // 4. 알림
    createAlert({
      level: AlertLevel.INFO,
      message: `Task ${taskId} resumed after rate limit`,
      taskId,
      timestamp: new Date(),
    });

    console.log(`Task ${taskId} successfully resumed`);
  } catch (error) {
    console.error(`Failed to resume task ${taskId}:`, error);

    // 복구 실패 처리
    await updateTaskStatus(taskId, 'failed', {
      error: 'Failed to resume after rate limit',
    });

    createAlert({
      level: AlertLevel.ERROR,
      message: `Failed to resume task ${taskId} after rate limit`,
      taskId,
      timestamp: new Date(),
      metadata: { error },
    });
  }
}
```

## Rate Limit 정보 추적

### RateLimitTracker

```typescript
// agent-manager/lib/monitoring/rate-limit-tracker.ts
export class RateLimitTracker {
  private limits = new Map<string, RateLimitInfo>();
  private history = new Map<string, RateLimitEvent[]>();

  recordRateLimit(taskId: string, info: RateLimitError): void {
    // 현재 제한 정보 저장
    this.limits.set(taskId, {
      limit: info.limit,
      remaining: info.remaining,
      resetAt: info.resetAt,
    });

    // 이벤트 기록
    const events = this.history.get(taskId) || [];
    events.push({
      timestamp: new Date(),
      retryAfter: info.retryAfter,
      resetAt: info.resetAt,
    });
    this.history.set(taskId, events);

    // 데이터베이스에 저장
    this.saveToDatabase(taskId, info);
  }

  getRateLimitInfo(taskId: string): RateLimitInfo | null {
    return this.limits.get(taskId) || null;
  }

  getRateLimitHistory(taskId: string): RateLimitEvent[] {
    return this.history.get(taskId) || [];
  }

  getRateLimitCount(taskId: string): number {
    return this.getRateLimitHistory(taskId).length;
  }

  clearRateLimit(taskId: string): void {
    this.limits.delete(taskId);
  }

  private async saveToDatabase(
    taskId: string,
    info: RateLimitError
  ): Promise<void> {
    await db.rateLimitEvent.create({
      data: {
        taskId,
        retryAfter: info.retryAfter,
        resetAt: info.resetAt,
        timestamp: new Date(),
      },
    });
  }
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface RateLimitEvent {
  timestamp: Date;
  retryAfter: number;
  resetAt: Date;
}
```

## 예방 전략

### 1. Request 속도 제어

```typescript
// agent-manager/lib/monitoring/rate-limiter.ts
export class RequestRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minInterval = 1200; // 1.2초 (50 RPM = 1.2초당 1 요청)

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;

      try {
        await operation();
      } catch (error) {
        console.error('Operation failed:', error);
      }

      // 다음 요청까지 대기
      if (this.queue.length > 0) {
        await sleep(this.minInterval);
      }
    }

    this.processing = false;
  }
}

// 글로벌 Rate Limiter
export const globalRateLimiter = new RequestRateLimiter();

// 사용
await globalRateLimiter.enqueue(() => callClaudeAPI(prompt));
```

### 2. 토큰 버킷

```typescript
// agent-manager/lib/monitoring/token-bucket.ts
export class TokenBucket {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // 초당 토큰 수
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    // 토큰 부족 시 대기
    const waitTime = this.calculateWaitTime(tokens);

    if (waitTime > 0) {
      await sleep(waitTime);
      return this.acquire(tokens);
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private calculateWaitTime(tokens: number): number {
    const deficit = tokens - this.tokens;
    if (deficit <= 0) return 0;

    return (deficit / this.refillRate) * 1000;
  }
}

// 사용
const bucket = new TokenBucket(50, 50 / 60); // 50 RPM

await bucket.acquire(1);
await callClaudeAPI(prompt);
```

### 3. 예측 및 경고

```typescript
// agent-manager/lib/monitoring/rate-limit-predictor.ts
export function predictRateLimit(taskId: string): RateLimitPrediction {
  const recentUsage = getRecentTokenUsage(taskId, 60000); // 최근 1분

  const tokensPerMinute = recentUsage.reduce(
    (sum, u) => sum + u.totalTokens,
    0
  );

  const requestsPerMinute = recentUsage.length;

  const tokenLimit = 40000; // TPM
  const requestLimit = 50; // RPM

  const tokenUtilization = tokensPerMinute / tokenLimit;
  const requestUtilization = requestsPerMinute / requestLimit;

  const willHitRateLimit =
    tokenUtilization > 0.9 || requestUtilization > 0.9;

  return {
    willHitRateLimit,
    tokenUtilization,
    requestUtilization,
    recommendation: willHitRateLimit
      ? 'Slow down requests to avoid rate limit'
      : 'Current pace is safe',
  };
}

interface RateLimitPrediction {
  willHitRateLimit: boolean;
  tokenUtilization: number;
  requestUtilization: number;
  recommendation: string;
}
```

## API 통합

### Rate Limit 상태 조회

```typescript
// app/api/tasks/[id]/rate-limit/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  const info = rateLimitTracker.getRateLimitInfo(taskId);
  const history = rateLimitTracker.getRateLimitHistory(taskId);
  const prediction = predictRateLimit(taskId);

  return NextResponse.json({
    success: true,
    data: {
      currentLimit: info,
      history,
      prediction,
    },
  });
}
```

### 수동 재시도

```typescript
// app/api/tasks/[id]/retry/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'waiting_rate_limit') {
    return NextResponse.json(
      { error: 'Task is not waiting for rate limit' },
      { status: 400 }
    );
  }

  // Checkpoint 가져오기
  const checkpoint = await getLatestCheckpoint(taskId);

  if (!checkpoint) {
    return NextResponse.json(
      { error: 'No checkpoint found' },
      { status: 404 }
    );
  }

  // 재개
  await resumeFromRateLimit(taskId, checkpoint);

  return NextResponse.json({
    success: true,
    message: 'Task retry initiated',
  });
}
```

## 모니터링 대시보드

### SSE 스트리밍

```typescript
// app/api/monitoring/rate-limit/stream/route.ts
export async function GET(request: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Rate Limit 이벤트 구독
  const unsubscribe = rateLimitTracker.on('rate-limit', (event) => {
    const message = `data: ${JSON.stringify({
      type: 'rate-limit',
      event,
    })}\n\n`;

    writer.write(encoder.encode(message));
  });

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
// components/RateLimitPanel.tsx
export function RateLimitPanel({ taskId }: { taskId: string }) {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(
    null
  );
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/monitoring/rate-limit/stream');

    eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'rate-limit' && data.event.taskId === taskId) {
        setRateLimitInfo(data.event);
        setIsRateLimited(true);
      }
    });

    return () => eventSource.close();
  }, [taskId]);

  if (!isRateLimited) {
    return <div className="text-green-600">✓ No rate limit</div>;
  }

  const timeUntilReset = rateLimitInfo
    ? rateLimitInfo.resetAt.getTime() - Date.now()
    : 0;

  return (
    <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded">
      <div className="flex items-center space-x-2">
        <span className="text-yellow-600">⚠️ Rate Limited</span>
      </div>

      <div className="text-sm">
        <div>Retry after: {Math.ceil(timeUntilReset / 1000)}s</div>
        <div>Reset at: {rateLimitInfo?.resetAt.toLocaleTimeString()}</div>
      </div>

      <button
        onClick={() => retryTask(taskId)}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        disabled={timeUntilReset > 0}
      >
        Retry Now
      </button>
    </div>
  );
}
```

## 테스트

```typescript
// __tests__/lib/monitoring/rate-limit-handler.test.ts
describe('RateLimitHandler', () => {
  it('should retry on rate limit', async () => {
    const handler = new RateLimitHandler({
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false,
    });

    let attempts = 0;

    const operation = async () => {
      attempts++;

      if (attempts < 3) {
        const error = new Error('Rate limited');
        (error as any).status = 429;
        throw error;
      }

      return 'success';
    };

    const result = await handler.executeWithRetry('task_123', operation);

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should calculate exponential backoff', () => {
    const config: RetryConfig = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      jitter: false,
    };

    expect(calculateBackoffDelay(0, config)).toBe(1000);
    expect(calculateBackoffDelay(1, config)).toBe(2000);
    expect(calculateBackoffDelay(2, config)).toBe(4000);
    expect(calculateBackoffDelay(3, config)).toBe(8000);
  });

  it('should track rate limit events', () => {
    const tracker = new RateLimitTracker();

    tracker.recordRateLimit('task_123', {
      type: 'rate_limit',
      retryAfter: 60,
      limit: 50,
      remaining: 0,
      resetAt: new Date(),
    });

    const count = tracker.getRateLimitCount('task_123');
    expect(count).toBe(1);
  });
});
```

## 관련 문서

- **Token Management**: `token-management.md` - 토큰 사용량 관리
- **Checkpoint**: `../checkpoint/restoration.md` - Checkpoint 복구
- **Status Tracking**: `status-tracking.md` - 상태 추적
- **Monitoring README**: `README.md` - 모니터링 개요
