# 3.6 배포 준비 가이드

## 목적

Next.js 앱을 Vercel에 배포하고 프로덕션 환경을 설정합니다.

---

## 입력

- `result/development/05_testing.md`

---

## 작업 항목

### 1. 프로덕션 빌드 확인

```bash
# 빌드 실행
pnpm build

# 예상 출력
✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB        89.1 kB
├ ○ /dashboard                           12.3 kB       96.2 kB
├ ○ /login                               4.1 kB        88.0 kB
├ ● /robots/[id]                         8.7 kB        92.6 kB
└ ...
```

```bash
# 로컬에서 프로덕션 모드 테스트
pnpm start
# http://localhost:3000 에서 확인
```

### 2. 환경 변수 설정

```bash
# .env.local (개발용 - Git에 포함 안 됨)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# .env.production (프로덕션 기본값 - 민감 정보 제외)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

```typescript
// src/lib/config/env.ts
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },
};

// 환경 변수 검증 (앱 시작 시 호출)
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

### 3. Vercel 프로젝트 설정

```bash
# Vercel CLI 설치 (선택사항 - 웹 UI로도 가능)
pnpm add -g vercel

# Vercel 로그인
vercel login

# 프로젝트 연결
vercel link
```

```json
// vercel.json (루트에 생성)
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "regions": ["icn1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health"
    }
  ]
}
```

### 4. GitHub 연동 배포

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 5. Vercel 환경 변수 설정

```bash
# CLI로 환경 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
```

또는 Vercel 대시보드에서:
1. Project Settings → Environment Variables
2. 각 환경(Production, Preview, Development)별로 변수 추가

```
필수 환경 변수:
├── NEXT_PUBLIC_SUPABASE_URL      (모든 환경)
├── NEXT_PUBLIC_SUPABASE_ANON_KEY (모든 환경)
├── SUPABASE_SERVICE_KEY          (Production만)
└── NEXT_PUBLIC_APP_URL           (환경별로 다르게)
```

### 6. 도메인 설정

```bash
# 커스텀 도메인 추가
vercel domains add your-domain.com

# DNS 설정 확인
vercel domains inspect your-domain.com
```

Vercel 대시보드에서:
1. Project Settings → Domains
2. 커스텀 도메인 추가
3. DNS 레코드 설정:
   - A 레코드: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

### 7. 성능 최적화 설정

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // 번들 분석 (선택사항)
  ...(process.env.ANALYZE === 'true' && {
    webpack(config, { isServer }) {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
          })
        );
      }
      return config;
    },
  }),

  // 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 8. 헬스체크 API

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/api/supabase';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {} as Record<string, boolean>,
  };

  // Supabase 연결 확인
  try {
    const { error } = await supabase.from('robots').select('count').limit(1);
    checks.checks.database = !error;
  } catch {
    checks.checks.database = false;
  }

  const allHealthy = Object.values(checks.checks).every(Boolean);

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
```

### 9. 에러 모니터링 (Sentry)

```bash
# Sentry 설치
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

### 10. 배포 체크리스트

```markdown
## 배포 전 체크리스트

### 코드 품질
- [ ] `pnpm lint` 오류 없음
- [ ] `pnpm type-check` 오류 없음
- [ ] `pnpm test` 모든 테스트 통과
- [ ] `pnpm build` 빌드 성공

### 환경 설정
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] Supabase 프로덕션 프로젝트 설정
- [ ] 커스텀 도메인 DNS 설정

### 보안
- [ ] 민감 정보 환경 변수로 분리
- [ ] HTTPS 적용 확인
- [ ] CORS 설정 확인
- [ ] CSP 헤더 설정

### 성능
- [ ] 이미지 최적화 확인
- [ ] 번들 사이즈 확인
- [ ] Lighthouse 점수 확인 (목표: 90+)

### 모니터링
- [ ] Sentry 연동 완료
- [ ] Vercel Analytics 활성화
- [ ] 에러 알림 설정
```

---

## 대안: Docker 배포

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 의존성 설치
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && pnpm build

# 실행
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    restart: unless-stopped
```

```bash
# Docker 빌드 및 실행
docker build -t my-app .
docker run -p 3000:3000 --env-file .env.production my-app
```

---

## 산출물 템플릿

`result/development/06_deploy.md`에 작성:

```markdown
# 배포 준비

## 버전
- 버전: 1.0.0
- 배포일: YYYY-MM-DD

## 빌드 결과

```bash
pnpm build
# ✓ Compiled successfully
# 총 번들 크기: XXX kB
```

## 환경 변수

| 변수 | Production | Preview |
|------|------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | ✓ | ✓ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | ✓ |
| SUPABASE_SERVICE_KEY | ✓ | - |

## 배포 정보

| 항목 | 값 |
|------|-----|
| 플랫폼 | Vercel |
| 프로덕션 URL | https://your-app.vercel.app |
| 커스텀 도메인 | https://your-domain.com |
| 리전 | icn1 (Seoul) |

## 모니터링

- [x] Sentry 연동
- [x] Vercel Analytics 활성화
- [x] 헬스체크 API 동작 확인

## 성능 지표 (Lighthouse)

| 항목 | 점수 |
|------|------|
| Performance | XX |
| Accessibility | XX |
| Best Practices | XX |
| SEO | XX |

---

## 출시 후 할 일

- [ ] 에러 모니터링 대시보드 확인
- [ ] 사용자 피드백 수집
- [ ] v1.1 계획 수립
```

---

## 체크리스트

- [ ] 프로덕션 빌드 성공
- [ ] 환경 변수 설정 완료
- [ ] Vercel 프로젝트 연결
- [ ] GitHub Actions 설정
- [ ] 커스텀 도메인 설정
- [ ] 헬스체크 API 동작
- [ ] Sentry 연동
- [ ] 배포 완료

---

## 개발 완료

이 문서를 마지막으로 **Phase 3: 개발**이 완료됩니다.

### 출시 후
1. Sentry로 에러 모니터링
2. Vercel Analytics로 성능 추적
3. 사용자 피드백 수집
4. v1.1 계획 수립
