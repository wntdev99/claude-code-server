# 3.1 프로젝트 초기화 가이드

## 목적

Next.js 프로젝트 기본 구조를 생성하고 개발 환경을 설정합니다.

---

## 입력

- `result/planning/08_tech.md` (기술 스택)
- `result/design/05_architecture.md` (디렉토리 구조)

---

## 작업 항목

### 1. 프로젝트 생성

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app

# 또는 pnpm 사용 (권장)
pnpm create next-app my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 2. 의존성 추가

```json
// package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",

    "zustand": "^4.4.0",
    "immer": "^10.0.0",

    "@supabase/supabase-js": "^2.39.0",

    "zod": "^3.22.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",

    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.303.0",

    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.2.0"
  }
}
```

```bash
# 의존성 설치
pnpm install
```

### 3. 디렉토리 구조 생성

```bash
# 디렉토리 생성
mkdir -p src/{app,components/{ui,features,layout},lib/{utils,hooks,stores,api},types,styles}

# 폴더 구조
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 인증 관련 라우트 그룹
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/               # 메인 레이아웃 라우트 그룹
│   │   ├── dashboard/page.tsx
│   │   ├── robots/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                  # API Routes
│   │   └── robots/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── features/             # 기능별 컴포넌트
│   │   ├── robots/
│   │   │   ├── RobotList.tsx
│   │   │   └── RobotCard.tsx
│   │   └── auth/
│   │       └── LoginForm.tsx
│   └── layout/               # 레이아웃 컴포넌트
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── lib/
│   ├── utils/                # 유틸리티 함수
│   │   ├── cn.ts             # className 병합
│   │   └── format.ts         # 포맷팅 함수
│   ├── hooks/                # 커스텀 훅
│   │   └── useRobots.ts
│   ├── stores/               # Zustand 스토어
│   │   ├── authStore.ts
│   │   └── robotStore.ts
│   └── api/                  # API 클라이언트
│       ├── supabase.ts
│       └── robots.ts
├── types/                    # TypeScript 타입 정의
│   ├── index.ts
│   └── robot.ts
└── styles/                   # 추가 스타일
    └── components.css
```

### 4. 기본 설정 파일

```typescript
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5. 앱 진입점 설정

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My App',
  description: '로봇 플릿 모니터링 앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

```typescript
// src/components/Providers.tsx
'use client';

import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
    </>
  );
}
```

### 6. Supabase 설정

```typescript
// src/lib/api/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 7. 환경 변수 설정

```bash
# .env.local 파일 생성
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```typescript
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_APP_URL: string;
  }
}
```

---

## 산출물 템플릿

`result/development/01_setup.md`에 작성:

```markdown
# 프로젝트 초기화

## 완료 항목

- [x] Next.js 프로젝트 생성
- [x] 의존성 설치
- [x] 디렉토리 구조 생성
- [x] Tailwind CSS 설정
- [x] TypeScript 설정
- [x] 환경 변수 설정

## 실행 확인

```bash
pnpm dev
```

- [x] 개발 서버 정상 실행 (http://localhost:3000)
- [x] 기본 화면 표시

---

## 다음 단계
→ 3.2 데이터 레이어
```

---

## 체크리스트

- [ ] `pnpm install` 성공
- [ ] `pnpm lint` 오류 없음
- [ ] `pnpm build` 성공
- [ ] 개발 서버 실행 확인
- [ ] 디렉토리 구조 완성

---

## 다음 단계

→ `02_data.md` (데이터 레이어)
