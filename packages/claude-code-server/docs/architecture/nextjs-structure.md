# Next.js 프로젝트 구조

## 개요

이 문서는 웹 서버의 Next.js 14 App Router 기반 프로젝트 구조를 설명합니다.

## 디렉토리 구조

```
packages/claude-code-server/
├── app/                        # Next.js App Router
│   ├── (routes)/               # 페이지 라우트
│   │   ├── page.tsx            # 홈페이지 (/)
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── tasks/              # /tasks
│   │   │   ├── page.tsx        # Task 목록
│   │   │   └── [id]/           # /tasks/:id
│   │   │       ├── page.tsx    # Task 상세
│   │   │       └── logs/       # /tasks/:id/logs
│   │   │           └── page.tsx
│   │   └── settings/           # /settings
│   │       └── page.tsx
│   │
│   └── api/                    # API Routes
│       ├── tasks/
│       │   ├── route.ts        # GET/POST /api/tasks
│       │   └── [id]/
│       │       ├── route.ts    # GET/PATCH/DELETE /api/tasks/:id
│       │       ├── execute/
│       │       │   └── route.ts
│       │       ├── stream/
│       │       │   └── route.ts
│       │       └── ...
│       ├── reviews/
│       ├── dependencies/
│       └── questions/
│
├── components/                 # UI 컴포넌트
│   ├── ui/                     # shadcn/ui 기본 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── tasks/                  # Task 관련 컴포넌트
│   │   ├── TaskCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskForm.tsx
│   │   └── TaskDetail.tsx
│   │
│   ├── logs/                   # 로그 뷰어 컴포넌트
│   │   ├── LogViewer.tsx
│   │   └── LogEntry.tsx
│   │
│   └── shared/                 # 공통 컴포넌트
│       ├── Header.tsx
│       ├── Navigation.tsx
│       └── ErrorBoundary.tsx
│
├── lib/                        # 비즈니스 로직 & 유틸리티
│   ├── agent/                  # 에이전트 관리
│   │   ├── executor.ts         # 프로세스 실행
│   │   ├── parser.ts           # 출력 파싱
│   │   └── stream.ts           # SSE 스트리밍
│   │
│   ├── store/                  # Zustand 스토어
│   │   ├── tasks.ts
│   │   ├── agents.ts
│   │   └── settings.ts
│   │
│   ├── db/                     # 데이터베이스
│   │   └── client.ts           # Prisma 클라이언트
│   │
│   └── utils/                  # 유틸리티
│       ├── validation.ts
│       ├── encryption.ts
│       └── formatting.ts
│
├── public/                     # 정적 파일
│   ├── images/
│   └── fonts/
│
├── styles/                     # 스타일
│   └── globals.css             # Tailwind 전역 스타일
│
└── types/                      # TypeScript 타입
    └── index.ts
```

## 파일 기반 라우팅

### 페이지 라우트

| 파일 경로 | URL | 설명 |
|----------|-----|------|
| `app/(routes)/page.tsx` | `/` | 홈/대시보드 |
| `app/(routes)/tasks/page.tsx` | `/tasks` | Task 목록 |
| `app/(routes)/tasks/[id]/page.tsx` | `/tasks/:id` | Task 상세 |
| `app/(routes)/tasks/[id]/logs/page.tsx` | `/tasks/:id/logs` | Task 로그 |
| `app/(routes)/settings/page.tsx` | `/settings` | 설정 |

### API 라우트

| 파일 경로 | URL | 메서드 |
|----------|-----|--------|
| `app/api/tasks/route.ts` | `/api/tasks` | GET, POST |
| `app/api/tasks/[id]/route.ts` | `/api/tasks/:id` | GET, PATCH, DELETE |
| `app/api/tasks/[id]/execute/route.ts` | `/api/tasks/:id/execute` | POST |
| `app/api/tasks/[id]/stream/route.ts` | `/api/tasks/:id/stream` | GET (SSE) |

## 파일 네이밍 규칙

### 특수 파일

- **`page.tsx`**: 페이지 컴포넌트 (라우트가 됨)
- **`layout.tsx`**: 레이아웃 컴포넌트
- **`loading.tsx`**: 로딩 상태 UI
- **`error.tsx`**: 에러 바운더리
- **`route.ts`**: API 핸들러
- **`not-found.tsx`**: 404 페이지

### 컴포넌트

- **PascalCase**: `TaskCard.tsx`, `LogViewer.tsx`
- **컴포넌트명 = 파일명**: 파일명과 export된 컴포넌트명 일치

### 유틸리티

- **camelCase**: `validatePath.ts`, `formatDate.ts`
- **기능 설명적**: 파일명이 기능을 명확히 설명

## Server vs Client Components

### Server Component (기본)

```typescript
// app/(routes)/tasks/page.tsx
// "use client" 없음 = Server Component

async function TasksPage() {
  // 서버에서만 실행
  const tasks = await db.task.findMany();

  return <TaskList tasks={tasks} />;
}

export default TasksPage;
```

**사용 시기**:
- 데이터 페칭
- 백엔드 리소스 접근
- 민감한 정보 처리 (API 키 등)
- 큰 의존성 (서버에만 유지)

### Client Component

```typescript
// components/tasks/TaskList.tsx
'use client';

import { useState } from 'react';

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState('');

  // 클라이언트에서 실행
  return <div>...</div>;
}
```

**사용 시기**:
- 이벤트 핸들러 (`onClick`, `onChange` 등)
- State 사용 (`useState`, `useReducer`)
- Effect 사용 (`useEffect`)
- 브라우저 API 사용 (localStorage 등)
- Custom Hooks 사용

## 폴더 구조 컨벤션

### Route Groups `(폴더명)`

괄호로 묶인 폴더는 URL에 포함되지 않음:

```
app/
├── (routes)/              # URL에 영향 없음
│   ├── page.tsx           # → /
│   └── tasks/
│       └── page.tsx       # → /tasks
```

### Private Folders `_폴더명`

언더스코어로 시작하는 폴더는 라우팅에서 제외:

```
app/
├── _components/           # 라우팅 제외
├── _utils/                # 라우팅 제외
└── tasks/
    └── page.tsx           # → /tasks
```

### Dynamic Routes `[param]`

대괄호로 묶인 폴더는 동적 라우트:

```
app/
└── tasks/
    └── [id]/
        └── page.tsx       # → /tasks/:id
```

## 레이아웃 구조

### Root Layout

```typescript
// app/(routes)/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Nested Layout

```typescript
// app/(routes)/tasks/layout.tsx
export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tasks-layout">
      <TasksSidebar />
      <div className="content">{children}</div>
    </div>
  );
}
```

## 컴포넌트 배치 원칙

### 1. 재사용성 기준

- **한 곳에서만 사용**: 해당 페이지 폴더에 배치
- **여러 곳에서 사용**: `components/` 폴더에 배치

### 2. 도메인 기준

- **Task 관련**: `components/tasks/`
- **Review 관련**: `components/reviews/`
- **공통**: `components/shared/`

### 3. 추상화 수준

- **UI 기본**: `components/ui/` (shadcn/ui)
- **도메인 컴포넌트**: `components/[도메인]/`
- **페이지 컴포넌트**: `app/(routes)/`

## 다음 단계

- **API Routes 구조**: `api-routes.md` 참조
- **상태 관리**: `state-management.md` 참조
- **UI 컴포넌트**: `ui-components.md` 참조

## 관련 문서

- **개발 환경 설정**: `../development/setup.md`
- **코딩 컨벤션**: `../development/conventions.md`
- **API 설계**: `../api/README.md`
