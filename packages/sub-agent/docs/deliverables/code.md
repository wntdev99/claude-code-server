# 코드 작성 규칙

## 개요

Phase 3 (Development)에서 생성하는 코드 프로젝트의 작성 규칙과 품질 기준을 설명합니다.

> **중요**: Phase 3는 **실제 동작하는 코드**를 생성합니다.

## 기본 원칙

### 1. 실제 동작하는 코드

```
✅ 실제 실행 가능
  - npm install 성공
  - npm run dev 실행 가능
  - 기본 기능 동작

❌ 데모/예시 코드만
  - 주석으로만 설명
  - 구현 없는 함수
  - 하드코딩된 더미 데이터
```

### 2. 표준 프로젝트 구조

```
✅ 프레임워크 표준 따르기
  - Next.js: App Router 구조
  - React: 컴포넌트 기반
  - Node.js: 일반적인 폴더 구조

❌ 비표준 구조
  - 임의의 폴더 구조
  - 프레임워크 규칙 무시
```

### 3. 보안 고려

```
✅ .env.example 사용
  - 환경 변수 템플릿 제공
  - 실제 값은 .env에 (gitignore)

❌ 비밀 정보 하드코딩
  - API 키 코드에 직접
  - 비밀번호 하드코딩
```

## 프로젝트 구조

### Next.js 14 (App Router)

```
project-name/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   ├── (routes)/             # Route groups
│   │   ├── tasks/
│   │   │   ├── page.tsx      # Tasks list
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Task detail
│   └── api/                  # API routes
│       └── tasks/
│           ├── route.ts      # GET /api/tasks, POST
│           └── [id]/
│               └── route.ts  # GET/PUT/DELETE /api/tasks/:id
│
├── components/               # React components
│   ├── TaskList.tsx
│   ├── TaskItem.tsx
│   └── TaskForm.tsx
│
├── lib/                      # Utilities & logic
│   ├── db.ts                 # Database client
│   ├── utils.ts              # Helper functions
│   └── types.ts              # TypeScript types
│
├── public/                   # Static assets
│   └── images/
│
├── prisma/                   # Database schema (if using Prisma)
│   └── schema.prisma
│
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── next.config.js            # Next.js config
├── .env.example              # Environment template
├── .gitignore                # Git ignore
└── README.md                 # Documentation
```

### React SPA

```
project-name/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   └── App.tsx
├── public/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

### Node.js API

```
project-name/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── server.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 필수 파일

### package.json

```json
{
  "name": "project-name",
  "version": "0.1.0",
  "description": "Brief description from Phase 1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### .env.example

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys (Phase 1/2에서 정의한 것들)
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**중요**:
- 실제 값은 포함하지 않음
- `your_*_here` 같은 플레이스홀더 사용
- .env는 .gitignore에 포함

### .gitignore

```
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Prisma
prisma/*.db
prisma/*.db-journal
```

### README.md

```markdown
# Project Name

Brief description from Phase 1 (01_idea.md).

## Features

- Feature 1 (from Phase 1: 07_features.md)
- Feature 2
- Feature 3

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma
- **AI**: OpenAI GPT-4 API

(From Phase 1: 08_tech.md)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd project-name
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Set up database
```bash
npx prisma migrate dev
```

5. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/          # Next.js App Router
components/   # React components
lib/          # Utilities
prisma/       # Database schema
```

## API Endpoints

(From Phase 2: 04_api.md)

### Tasks

- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## License

MIT
```

## 코드 품질 기준

### TypeScript 사용

```typescript
// ✅ Good: 타입 정의
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

async function getTasks(): Promise<Task[]> {
  const tasks = await db.task.findMany();
  return tasks;
}

// ❌ Bad: any 사용
async function getTasks(): Promise<any> {
  return await db.task.findMany();
}
```

### 컴포넌트 구조

```typescript
// ✅ Good: 명확한 Props 타입
interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  return (
    <div className="task-item">
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <button onClick={() => onDelete(task.id)}>Delete</button>
    </div>
  );
}

// ❌ Bad: Props 타입 없음
export function TaskItem({ task, onUpdate, onDelete }) {
  // ...
}
```

### API Routes

```typescript
// ✅ Good: 에러 처리 포함
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    // 검증
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || '',
        status: 'pending',
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

### 환경 변수 사용

```typescript
// ✅ Good: 환경 변수 사용
// lib/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function categorizeTask(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: 'Categorize the task...' },
      { role: 'user', content: text },
    ],
  });

  return response.choices[0].message.content || 'Other';
}

// ❌ Bad: API 키 하드코딩
const openai = new OpenAI({
  apiKey: 'sk-1234567890abcdef...',
});
```

### 데이터베이스 (Prisma 예시)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks Task[]

  @@index([email])
}

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      String   @default("pending")
  categoryId  String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model Category {
  id        String   @id @default(uuid())
  name      String
  color     String?
  createdAt DateTime @default(now())

  tasks Task[]

  @@unique([name])
}
```

## 테스트 (선택적)

### 기본 테스트

```typescript
// __tests__/components/TaskItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '@/components/TaskItem';

describe('TaskItem', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    status: 'pending' as const,
    createdAt: new Date(),
  };

  it('renders task title', () => {
    render(<TaskItem task={mockTask} onUpdate={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = jest.fn();
    render(<TaskItem task={mockTask} onUpdate={jest.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
```

## 검증 기준

### 자체 검증 체크리스트

```
□ npm install 성공
□ npm run dev 실행 가능
□ 브라우저에서 접근 가능 (http://localhost:3000)
□ 주요 기능 동작 (Phase 2에서 정의한 기능)
□ API 엔드포인트 응답
□ .env.example 존재
□ README.md 상세 설명 포함
□ .gitignore에 .env 포함
□ 비밀 정보 하드코딩 없음
□ TypeScript 에러 없음
```

### 품질 기준

**상 (Excellent)**:
- 모든 Must Have 기능 구현
- 테스트 포함
- 에러 처리 완벽
- 코드 문서화 (주석)
- 성능 최적화

**중 (Good)**:
- 핵심 기능 구현
- 기본 에러 처리
- README.md 상세

**하 (Poor)**:
- 일부 기능만 구현
- 에러 처리 없음
- 하드코딩된 값
- **재작업 필요**

## 예시 프로젝트

### AI Todo App (Phase 1-2 산출물 기반)

```typescript
// app/page.tsx
import { TaskList } from '@/components/TaskList';

export default async function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">AI Todo App</h1>
      <TaskList />
    </main>
  );
}

// components/TaskList.tsx
'use client';

import { useState, useEffect } from 'react';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  category?: string;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: { title: string; description: string }) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <TaskForm onCreate={handleCreate} />
      <div className="mt-8 space-y-4">
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categorizeTask } from '@/lib/ai';

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // AI 자동 분류
    const categoryName = await categorizeTask(title);

    // Category 찾기 또는 생성
    let category = await db.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      category = await db.category.create({
        data: { name: categoryName },
      });
    }

    // Task 생성
    const task = await db.task.create({
      data: {
        title,
        description: description || '',
        status: 'pending',
        categoryId: category.id,
        userId: 'default-user', // 실제로는 인증된 사용자
      },
      include: { category: true },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`documents.md`** - 문서 vs 코드 작성 규칙
2. **`../verification/phase3-development.md`** - Phase 3 검증 기준
3. **`../workflows/create-app.md`** - Phase 3 작업 프로세스
4. **`../../CLAUDE.md`** - 산출물 규칙 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Deliverables 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../verification/phase3-development.md`** - Phase 3 검증

## 다음 단계

- **검증 기준**: `../verification/phase3-development.md` - Phase 3 상세 검증
- **워크플로우**: `../workflows/create-app.md` - 전체 작업 흐름
- **문서 작성**: `documents.md` - Phase 1, 2 문서 규칙

## 관련 문서

- **Documents Deliverables**: `documents.md`
- **Verification - Phase 3**: `../verification/phase3-development.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Guides - Development**: `/guide/development/*.md`
