# 모니터링 시스템 문서

## 개요

에이전트 관리자의 실시간 모니터링 시스템 관련 문서 목록입니다.

## 문서 목록

### 1. 상태 추적

**문서**: `status-tracking.md`

**내용**:
- 실시간 에이전트 상태 추적
- 진행률 계산 알고리즘
- SSE를 통한 상태 스트리밍
- 이벤트 기반 상태 업데이트

**핵심 개념**:
```typescript
export type AgentStatus =
  | 'idle'              // 대기 중
  | 'starting'          // 시작 중
  | 'running'           // 실행 중
  | 'waiting_review'    // 리뷰 대기
  | 'waiting_dependency'// 의존성 대기
  | 'waiting_question'  // 질문 응답 대기
  | 'paused'            // 일시 중지
  | 'completed'         // 완료
  | 'failed';           // 실패

interface AgentState {
  status: AgentStatus;
  progress: number;
  currentPhase: string;
  tokensUsed: number;
  estimatedCompletion?: Date;
}
```

### 2. 토큰 관리

**문서**: `token-management.md`

**내용**:
- 토큰 사용량 추적
- 토큰 예산 관리
- 비용 계산
- 사용량 최적화 전략

**핵심 개념**:
```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

interface TokenBudget {
  maxTokensPerTask: number;
  maxTokensPerDay: number;
  currentUsage: number;
  remaining: number;
}
```

### 3. Rate Limit 처리

**문서**: `rate-limit.md`

**내용**:
- Claude API Rate Limit 감지
- 자동 재시도 로직
- Exponential Backoff
- Rate Limit 회복 전략

**핵심 개념**:
```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
```

## 모니터링 시스템 개요

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   Web Dashboard                          │
│              (Real-time Monitoring UI)                   │
└───────────────────────┬─────────────────────────────────┘
                        │ SSE
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Monitoring Manager                      │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ Status       │ │ Token        │ │ Rate Limit      │ │
│  │ Tracker      │ │ Manager      │ │ Handler         │ │
│  └──────────────┘ └──────────────┘ └─────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ Events
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 Agent Executors                          │
│         (Individual Agent Processes)                     │
└─────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
Agent Process
    ↓
  Output Stream (stdout/stderr)
    ↓
  Event Parser
    ↓
  Monitoring Manager
    ├─> Status Tracker → State Update → SSE Broadcast
    ├─> Token Manager → Usage Accumulation → Budget Check
    └─> Rate Limit Handler → Detect 429 → Retry Logic
    ↓
  Database (Metrics Storage)
```

## 주요 기능

### 1. 실시간 상태 추적

**기능**:
- 에이전트 상태 실시간 업데이트
- 진행률 계산 및 표시
- Phase별 진행 상황 추적
- 예상 완료 시간 계산

**사용**:
```typescript
import { trackAgentStatus } from '@/lib/monitoring/status-tracker';

// 상태 추적 시작
const tracker = trackAgentStatus(taskId);

// 상태 변경 리스닝
tracker.on('status-change', (status) => {
  console.log(`Agent ${taskId} status: ${status}`);
});

// 진행률 업데이트
tracker.on('progress-update', (progress) => {
  console.log(`Progress: ${progress}%`);
});
```

### 2. 토큰 사용량 관리

**기능**:
- 입력/출력 토큰 추적
- 누적 사용량 계산
- 예산 초과 경고
- 비용 추정

**사용**:
```typescript
import { TokenManager } from '@/lib/monitoring/token-manager';

const tokenManager = new TokenManager({
  maxTokensPerTask: 200000,
  maxTokensPerDay: 1000000,
});

// 토큰 사용 기록
tokenManager.recordUsage({
  taskId: 'task_123',
  inputTokens: 1000,
  outputTokens: 500,
});

// 예산 확인
if (tokenManager.isOverBudget('task_123')) {
  console.warn('Token budget exceeded!');
}
```

### 3. Rate Limit 자동 처리

**기능**:
- 429 에러 자동 감지
- Exponential Backoff 재시도
- Rate Limit 정보 추적
- 자동 복구

**사용**:
```typescript
import { RateLimitHandler } from '@/lib/monitoring/rate-limit';

const handler = new RateLimitHandler({
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 60000,
});

// API 호출 래핑
const result = await handler.executeWithRetry(async () => {
  return await callClaudeAPI(prompt);
});
```

## 메트릭 수집

### 수집되는 메트릭

```typescript
interface AgentMetrics {
  // 성능 메트릭
  executionTime: number;
  averageResponseTime: number;
  throughput: number;

  // 토큰 메트릭
  totalTokensUsed: number;
  averageTokensPerRequest: number;
  tokenEfficiency: number;

  // 에러 메트릭
  errorRate: number;
  rateLimitHits: number;
  retryCount: number;

  // 품질 메트릭
  completionRate: number;
  userSatisfaction?: number;
  reviewPassRate: number;
}
```

### 메트릭 저장

```typescript
// lib/monitoring/metrics-collector.ts
export async function saveMetrics(taskId: string, metrics: AgentMetrics) {
  await db.taskMetrics.create({
    data: {
      taskId,
      executionTime: metrics.executionTime,
      tokensUsed: metrics.totalTokensUsed,
      errorRate: metrics.errorRate,
      completionRate: metrics.completionRate,
      timestamp: new Date(),
    },
  });
}

// 메트릭 조회
export async function getMetrics(taskId: string): Promise<AgentMetrics> {
  const metrics = await db.taskMetrics.findMany({
    where: { taskId },
    orderBy: { timestamp: 'desc' },
  });

  return aggregateMetrics(metrics);
}
```

## 알림 시스템

### 이벤트 기반 알림

```typescript
// lib/monitoring/alerts.ts
export enum AlertLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  level: AlertLevel;
  message: string;
  taskId: string;
  timestamp: Date;
  metadata?: any;
}

export function createAlert(alert: Alert): void {
  console.log(`[ALERT ${alert.level}] ${alert.message}`);

  // 알림 저장
  db.alert.create({ data: alert });

  // 심각한 경우 즉시 알림
  if (alert.level === AlertLevel.CRITICAL) {
    notifyAdmin(alert);
  }
}
```

### 알림 트리거 조건

```typescript
// Token 예산 초과
if (tokenUsage > tokenBudget * 0.9) {
  createAlert({
    level: AlertLevel.WARN,
    message: `Token budget 90% exceeded for task ${taskId}`,
    taskId,
    timestamp: new Date(),
  });
}

// Rate Limit 반복
if (rateLimitHits > 3) {
  createAlert({
    level: AlertLevel.ERROR,
    message: `Multiple rate limit hits for task ${taskId}`,
    taskId,
    timestamp: new Date(),
  });
}

// 장시간 실행
if (executionTime > MAX_EXECUTION_TIME) {
  createAlert({
    level: AlertLevel.WARN,
    message: `Task ${taskId} running longer than expected`,
    taskId,
    timestamp: new Date(),
  });
}
```

## 대시보드 통합

### SSE 엔드포인트

```typescript
// app/api/monitoring/stream/route.ts
export async function GET(request: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // 모니터링 이벤트 구독
  const unsubscribe = subscribeToMonitoringEvents((event) => {
    const message = `data: ${JSON.stringify(event)}\n\n`;
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

### 실시간 UI 업데이트

```tsx
// components/MonitoringDashboard.tsx
export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/monitoring/stream');

    eventSource.addEventListener('metrics', (e) => {
      const data = JSON.parse(e.data);
      setMetrics(data);
    });

    eventSource.addEventListener('alert', (e) => {
      const alert = JSON.parse(e.data);
      setAlerts((prev) => [alert, ...prev]);
    });

    return () => eventSource.close();
  }, []);

  return (
    <div>
      <MetricsPanel metrics={metrics} />
      <AlertsList alerts={alerts} />
    </div>
  );
}
```

## 성능 최적화

### 1. 효율적인 데이터 수집

```typescript
// 배치 처리로 데이터베이스 쓰기 최소화
class MetricsBuffer {
  private buffer: AgentMetrics[] = [];
  private flushInterval = 5000; // 5초마다

  add(metrics: AgentMetrics) {
    this.buffer.push(metrics);

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    await db.taskMetrics.createMany({
      data: this.buffer,
    });

    this.buffer = [];
  }
}
```

### 2. 샘플링

```typescript
// 고빈도 이벤트는 샘플링
class SamplingTracker {
  private sampleRate = 0.1; // 10%만 기록

  track(event: Event) {
    if (Math.random() < this.sampleRate) {
      recordEvent(event);
    }
  }
}
```

## 트러블슈팅

### 메트릭 수집 안 됨

**원인**:
- Event listener 미등록
- SSE 연결 끊김
- 파싱 에러

**해결**:
```typescript
// Event listener 확인
console.log('Active listeners:', monitoringManager.listenerCount());

// SSE 재연결
eventSource.addEventListener('error', () => {
  console.log('SSE connection lost, reconnecting...');
  setTimeout(() => {
    eventSource = new EventSource('/api/monitoring/stream');
  }, 5000);
});
```

### 알림 과다 발생

**원인**:
- 임계값 설정 부적절
- 중복 알림 미제거

**해결**:
```typescript
// 알림 중복 제거
class AlertDeduplicator {
  private recent = new Map<string, number>();
  private cooldown = 60000; // 1분

  shouldAlert(key: string): boolean {
    const lastAlertTime = this.recent.get(key);
    const now = Date.now();

    if (lastAlertTime && now - lastAlertTime < this.cooldown) {
      return false; // 쿨다운 중
    }

    this.recent.set(key, now);
    return true;
  }
}
```

## 보안 고려사항

### 1. 민감 정보 마스킹

```typescript
// 로그에서 민감 정보 제거
function sanitizeMetrics(metrics: AgentMetrics): AgentMetrics {
  return {
    ...metrics,
    // API 키, 토큰 등 제거
    apiKey: undefined,
    secrets: undefined,
  };
}
```

### 2. 접근 제어

```typescript
// 모니터링 데이터 접근 권한 확인
export async function GET(request: NextRequest) {
  const session = await getSession(request);

  if (!session || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const metrics = await getMetrics();
  return NextResponse.json(metrics);
}
```

## 관련 문서

- **Status Tracking**: `status-tracking.md` - 상태 추적 상세
- **Token Management**: `token-management.md` - 토큰 관리
- **Rate Limiting**: `rate-limit.md` - Rate Limit 처리
- **Checkpoint**: `../checkpoint/restoration.md` - 복구 시스템
- **Queue**: `../queue/README.md` - 큐 시스템
