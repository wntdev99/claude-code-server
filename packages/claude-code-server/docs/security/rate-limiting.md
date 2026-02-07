# Rate Limiting

## 개요

API 엔드포인트에 대한 요청 제한을 적용하여 남용을 방지하고 시스템 안정성을 보장하는 방법을 설명합니다.

> **중요**: 모든 공개 API는 **반드시 Rate Limiting**을 적용해야 합니다.

## Rate Limiting이 필요한 이유

### 보호 대상

```
✅ 악의적 사용 방지
  - DoS/DDoS 공격
  - 무차별 대입 공격 (Brute Force)
  - 자동화된 스크래핑

✅ 자원 보호
  - CPU/메모리 과부하 방지
  - 데이터베이스 부하 분산
  - 외부 API 비용 제어 (Claude API)

✅ 공정한 사용
  - 모든 사용자에게 공평한 접근
  - 특정 사용자의 독점 방지
```

## Rate Limiting 전략

### 1. 고정 윈도우 (Fixed Window)

**설명**: 고정된 시간 창에서 요청 수 제한

```typescript
// lib/rate-limit/fixed-window.ts
export class FixedWindowLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private limit: number,
    private windowMs: number
  ) {}

  tryAcquire(key: string): boolean {
    const now = Date.now();
    const record = this.counts.get(key);

    if (!record || now >= record.resetAt) {
      // 새 윈도우 시작
      this.counts.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (record.count < this.limit) {
      record.count++;
      return true;
    }

    return false;
  }

  getRemainingTime(key: string): number {
    const record = this.counts.get(key);
    if (!record) return 0;

    return Math.max(0, record.resetAt - Date.now());
  }
}
```

### 2. 슬라이딩 윈도우 (Sliding Window)

**설명**: 더 정확한 제한을 위한 슬라이딩 시간 창

```typescript
// lib/rate-limit/sliding-window.ts
export class SlidingWindowLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number
  ) {}

  tryAcquire(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // 윈도우 밖의 요청 제거
    const validRequests = timestamps.filter(
      ts => now - ts < this.windowMs
    );

    if (validRequests.length < this.limit) {
      validRequests.push(now);
      this.requests.set(key, validRequests);
      return true;
    }

    return false;
  }

  getOldestRequest(key: string): number | null {
    const timestamps = this.requests.get(key);
    if (!timestamps || timestamps.length === 0) return null;
    return timestamps[0];
  }
}
```

### 3. 토큰 버킷 (Token Bucket)

**설명**: 버스트 트래픽 허용하며 평균 속도 제한

```typescript
// lib/rate-limit/token-bucket.ts
export class TokenBucketLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
  ) {}

  tryAcquire(key: string, tokens: number = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // 토큰 리필
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // 토큰 소비
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }
}
```

## Next.js Middleware 적용

### Rate Limiting Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { FixedWindowLimiter } from '@/lib/rate-limit/fixed-window';

// API별 제한 설정
const limiters = {
  '/api/tasks': new FixedWindowLimiter(10, 60000), // 1분에 10회
  '/api/tasks/[id]/stream': new FixedWindowLimiter(1, 1000), // 1초에 1회
  '/api/dependencies': new FixedWindowLimiter(20, 60000), // 1분에 20회
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API 경로만 체크
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // IP 주소 또는 사용자 ID를 키로 사용
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userId = request.headers.get('x-user-id') || ip;

  // 해당 경로의 리미터 찾기
  const limiterKey = Object.keys(limiters).find(key =>
    pathname.startsWith(key) || pathname.match(new RegExp(key.replace('[id]', '[^/]+')))
  );

  if (!limiterKey) {
    return NextResponse.next();
  }

  const limiter = limiters[limiterKey as keyof typeof limiters];
  const allowed = limiter.tryAcquire(userId);

  if (!allowed) {
    const remainingMs = limiter.getRemainingTime(userId);
    const remainingSec = Math.ceil(remainingMs / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: remainingSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(remainingSec),
          'X-RateLimit-Limit': String(limiter.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## API Route별 적용

### 개별 API Route

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit/checker';

export async function POST(request: NextRequest) {
  // Rate Limiting 체크
  const rateLimitResult = await checkRateLimit(request, {
    limit: 10,
    window: 60000, // 1분
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
        },
      }
    );
  }

  // ... 실제 로직 ...
}
```

### Rate Limit Checker 유틸리티

```typescript
// lib/rate-limit/checker.ts
import { NextRequest } from 'next/server';
import { FixedWindowLimiter } from './fixed-window';

const limiters = new Map<string, FixedWindowLimiter>();

export interface RateLimitConfig {
  limit: number;
  window: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window } = config;

  // Limiter 가져오기 또는 생성
  const key = `${limit}:${window}`;
  let limiter = limiters.get(key);

  if (!limiter) {
    limiter = new FixedWindowLimiter(limit, window);
    limiters.set(key, limiter);
  }

  // 사용자 식별
  const userId = getUserId(request);

  // Rate Limit 체크
  const allowed = limiter.tryAcquire(userId);

  if (!allowed) {
    const retryAfter = Math.ceil(limiter.getRemainingTime(userId) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: limit - 1, // 간단화
  };
}

function getUserId(request: NextRequest): string {
  // 1. 인증된 사용자 ID (있다면)
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // 2. IP 주소
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  return `ip:${ip}`;
}
```

## Redis 기반 Rate Limiting

### Redis Limiter

```typescript
// lib/rate-limit/redis-limiter.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSec * 1000))}`;

  // INCR and EXPIRE in a pipeline
  const pipeline = redis.pipeline();
  pipeline.incr(windowKey);
  pipeline.expire(windowKey, windowSec);

  const results = await pipeline.exec();
  const count = results?.[0]?.[1] as number;

  return count <= limit;
}

// Sliding Window with Redis
export async function checkSlidingWindowRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const zsetKey = `ratelimit:sliding:${key}`;

  const pipeline = redis.pipeline();

  // 1. 오래된 요청 제거
  pipeline.zremrangebyscore(zsetKey, 0, windowStart);

  // 2. 현재 요청 수 카운트
  pipeline.zcard(zsetKey);

  // 3. 현재 요청 추가
  pipeline.zadd(zsetKey, now, `${now}:${Math.random()}`);

  // 4. TTL 설정
  pipeline.expire(zsetKey, Math.ceil(windowMs / 1000));

  const results = await pipeline.exec();
  const count = results?.[1]?.[1] as number;

  return count < limit;
}
```

## 특수한 경우 처리

### 1. 비용 기반 Rate Limiting

```typescript
// 토큰 사용량 기반 제한
export async function checkTokenRateLimit(
  userId: string,
  tokensUsed: number
): Promise<boolean> {
  const dailyLimit = 100000; // 하루 10만 토큰
  const key = `tokens:${userId}:${new Date().toISOString().split('T')[0]}`;

  const current = await redis.get(key);
  const total = (parseInt(current || '0') + tokensUsed);

  if (total > dailyLimit) {
    return false;
  }

  await redis.setex(key, 86400, String(total)); // 24시간 TTL
  return true;
}
```

### 2. 동시 실행 제한

```typescript
// 동시 실행 중인 작업 수 제한
export class ConcurrencyLimiter {
  private running = new Map<string, number>();

  constructor(private maxConcurrent: number) {}

  async tryAcquire(userId: string): Promise<boolean> {
    const current = this.running.get(userId) || 0;

    if (current >= this.maxConcurrent) {
      return false;
    }

    this.running.set(userId, current + 1);
    return true;
  }

  release(userId: string): void {
    const current = this.running.get(userId) || 0;
    if (current > 0) {
      this.running.set(userId, current - 1);
    }
  }
}

// 사용
const concurrencyLimiter = new ConcurrencyLimiter(3); // 최대 3개 동시 실행

export async function POST(request: NextRequest) {
  const userId = getUserId(request);

  if (!await concurrencyLimiter.tryAcquire(userId)) {
    return NextResponse.json(
      { error: 'Too many concurrent tasks' },
      { status: 429 }
    );
  }

  try {
    // 작업 실행
    await executeTask();
  } finally {
    concurrencyLimiter.release(userId);
  }
}
```

### 3. 적응형 Rate Limiting

```typescript
// 시스템 부하에 따라 동적으로 조정
export class AdaptiveRateLimiter {
  private baseLimit: number;
  private currentLimit: number;

  constructor(baseLimit: number) {
    this.baseLimit = baseLimit;
    this.currentLimit = baseLimit;

    // 시스템 부하 모니터링
    setInterval(() => this.adjustLimit(), 60000); // 1분마다
  }

  private async adjustLimit() {
    const load = await getSystemLoad();

    if (load > 0.8) {
      // 부하 높음 → 제한 강화
      this.currentLimit = Math.floor(this.baseLimit * 0.5);
    } else if (load < 0.3) {
      // 부하 낮음 → 제한 완화
      this.currentLimit = this.baseLimit;
    } else {
      // 중간 → 점진적 조정
      this.currentLimit = Math.floor(this.baseLimit * (1 - load * 0.5));
    }

    console.log(`Rate limit adjusted: ${this.currentLimit} (load: ${load})`);
  }

  getLimit(): number {
    return this.currentLimit;
  }
}
```

## 에러 응답

### 표준 429 응답

```typescript
// 429 Too Many Requests
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 45,  // seconds
  "limit": 10,
  "remaining": 0,
  "reset": 1234567890  // Unix timestamp
}
```

### 헤더

```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
```

## 모니터링 및 로깅

### Rate Limit 이벤트 로깅

```typescript
// lib/rate-limit/logger.ts
export function logRateLimitExceeded(
  userId: string,
  endpoint: string,
  limit: number
) {
  console.warn('[RATE_LIMIT] Limit exceeded', {
    userId,
    endpoint,
    limit,
    timestamp: new Date().toISOString(),
  });

  // 데이터베이스에 로그
  db.rateLimitLog.create({
    data: {
      userId,
      endpoint,
      limit,
      timestamp: new Date(),
    },
  });
}
```

### 메트릭 수집

```typescript
// lib/rate-limit/metrics.ts
export class RateLimitMetrics {
  private blocked = 0;
  private allowed = 0;

  recordBlocked() {
    this.blocked++;
  }

  recordAllowed() {
    this.allowed++;
  }

  getStats() {
    return {
      blocked: this.blocked,
      allowed: this.allowed,
      blockRate: this.blocked / (this.blocked + this.allowed),
    };
  }

  reset() {
    this.blocked = 0;
    this.allowed = 0;
  }
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/rate-limit/fixed-window.test.ts
import { FixedWindowLimiter } from '@/lib/rate-limit/fixed-window';

describe('Fixed Window Limiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new FixedWindowLimiter(3, 60000);

    expect(limiter.tryAcquire('user1')).toBe(true);
    expect(limiter.tryAcquire('user1')).toBe(true);
    expect(limiter.tryAcquire('user1')).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    const limiter = new FixedWindowLimiter(2, 60000);

    limiter.tryAcquire('user1');
    limiter.tryAcquire('user1');
    expect(limiter.tryAcquire('user1')).toBe(false);
  });

  it('should reset after window expires', async () => {
    const limiter = new FixedWindowLimiter(1, 100);

    limiter.tryAcquire('user1');
    expect(limiter.tryAcquire('user1')).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(limiter.tryAcquire('user1')).toBe(true);
  });
});
```

## API별 권장 설정

| API Endpoint | Limit | Window | 이유 |
|-------------|-------|--------|------|
| `POST /api/tasks` | 10 | 1분 | Task 생성 비용 높음 |
| `GET /api/tasks` | 100 | 1분 | 읽기 작업은 관대 |
| `GET /api/tasks/[id]/stream` | 1 | 1초 | SSE 연결 제한 |
| `POST /api/dependencies/[id]/provide` | 20 | 1분 | 빈번한 사용 예상 |
| `POST /api/reviews/[id]/approve` | 10 | 1분 | 중요한 작업 |

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../api/*.md`** - 각 API의 Rate Limit 명세
2. **`../../CLAUDE.md`** - 보안 개요

### 이 문서를 참조하는 문서

1. **`README.md`** - Security 문서 목록
2. **`../api/*.md`** - API 문서들

## 다음 단계

- **Encryption**: `encryption.md` - 암호화
- **Input Sanitization**: `input-sanitization.md` - 입력 검증
- **Path Validation**: `path-validation.md` - 경로 검증

## 관련 문서

- **Path Validation**: `path-validation.md`
- **Encryption**: `encryption.md`
- **Input Sanitization**: `input-sanitization.md`
- **API Documentation**: `../api/*.md`
