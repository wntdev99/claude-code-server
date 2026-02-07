# Development Guide

## Overview

This guide covers setting up the development environment, project structure, coding conventions, testing strategies, and deployment procedures for the Claude Code Server.

## Prerequisites

### Required Software

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: 2.x or higher
- **Claude Code CLI**: Latest version (install and authenticate with `claude login`)

### Optional Software

- **Docker**: For containerized development
- **PostgreSQL**: For production database (SQLite for dev)
- **Redis**: For distributed queue (optional)

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/claude-code-server.git
cd claude-code-server
```

### 2. Install Dependencies

```bash
# Install all dependencies (monorepo)
npm install

# Or install for specific package
cd packages/claude-code-server
npm install
```

### 3. Environment Configuration

Create `.env` file in the root:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Claude Code CLI Configuration (CLI handles auth separately)
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_MAX_TOKENS=8000
CLAUDE_AUTO_ACCEPT=true

# Database Configuration
DATABASE_URL=file:./dev.db  # SQLite for development

# Server Configuration
PORT=3000
NODE_ENV=development

# Output Configuration
OUTPUT_DIRECTORY=./projects

# Security
ENCRYPTION_KEY=generate-32-byte-key-here  # openssl rand -hex 32

# Optional: External Integrations
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
GITHUB_TOKEN=ghp_...
FIGMA_ACCESS_TOKEN=...
```

**Note**: Claude Code CLI uses its own authentication. Make sure to run `claude login` before starting the server.

### 4. Database Setup

```bash
# Initialize database
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed database
npx prisma db seed
```

### 5. Start Development Server

```bash
# Start Next.js development server
npm run dev

# Or start with turbo (if using turborepo)
npm run dev --workspace=@claude-platform/web
```

Server will start at `http://localhost:3000`

## Project Structure

```
claude-code-server/
├── apps/
│   └── web/                      # Next.js web application
│       ├── app/                  # App Router
│       │   ├── (routes)/         # Page routes
│       │   ├── api/              # API routes
│       │   └── layout.tsx        # Root layout
│       ├── components/           # UI components
│       ├── lib/                  # Client utilities
│       └── public/               # Static assets
│
├── packages/
│   ├── claude-code-server/       # Web server package
│   │   ├── src/
│   │   │   ├── agent/           # Agent management
│   │   │   ├── api/             # API handlers
│   │   │   └── db/              # Database client
│   │   └── CLAUDE.md            # Development guide
│   │
│   ├── agent-manager/            # Agent orchestration
│   │   ├── src/
│   │   │   ├── lifecycle/       # Lifecycle management
│   │   │   ├── parser/          # Protocol parser
│   │   │   ├── queue/           # Queue management
│   │   │   └── checkpoint/      # Checkpoint system
│   │   └── CLAUDE.md
│   │
│   ├── sub-agent/                # Task execution
│   │   └── CLAUDE.md            # Execution guide
│   │
│   ├── core/                     # Shared domain logic
│   │   ├── entities/
│   │   ├── use-cases/
│   │   └── repositories/
│   │
│   └── shared/                   # Common utilities
│       ├── types/
│       ├── utils/
│       └── constants/
│
├── guide/                        # Agent guide documents
│   ├── planning/                 # (9 guides)
│   ├── design/                   # (5 guides)
│   ├── development/              # (6 guides)
│   ├── review/                   # (1 guide)
│   └── verification/             # (3 guides)
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── WORKFLOWS.md
│   ├── FEATURES.md
│   └── DEVELOPMENT.md           # This file
│
├── prisma/                       # Database schema
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                  # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/task-queue-management
```

### 2. Make Changes

Follow coding conventions (see below)

### 3. Test Changes

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run all tests
npm run test:all
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add task queue management"

# Follow conventional commits:
# feat: new feature
# fix: bug fix
# docs: documentation
# refactor: code refactoring
# test: add/update tests
# chore: maintenance
```

### 5. Push and Create PR

```bash
git push origin feature/task-queue-management

# Create pull request on GitHub
# Request review from team
```

## Coding Conventions

### TypeScript

**General Rules**:
- Use TypeScript strictly - avoid `any`
- Define interfaces for all data structures
- Use proper types for function parameters and returns
- Export types from dedicated `types/` directories

**Example**:
```typescript
// Good
interface Task {
  id: string;
  title: string;
  type: TaskType;
}

function createTask(data: CreateTaskInput): Task {
  // ...
}

// Bad
function createTask(data: any): any {
  // ...
}
```

### Next.js Conventions

**File Naming**:
- Routes: lowercase with hyphens (`task-list`, `user-profile`)
- Components: PascalCase (`TaskCard.tsx`, `UserProfile.tsx`)
- Utilities: camelCase (`formatDate.ts`, `validatePath.ts`)

**Server vs Client Components**:
```typescript
// Server Component (default)
async function TaskPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  return <TaskDetails task={task} />;
}

// Client Component (when needed)
'use client';
function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  // ...
}
```

**API Routes**:
```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tasks = await db.task.findMany();
  return NextResponse.json({ success: true, data: { tasks } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = await db.task.create({ data: body });
  return NextResponse.json({ success: true, data: { task } }, { status: 201 });
}
```

### React Component Conventions

**Component Structure**:
```typescript
// components/tasks/TaskCard.tsx
import { Task } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskCardProps {
  task: Task;
  onSelect?: (task: Task) => void;
}

export function TaskCard({ task, onSelect }: TaskCardProps) {
  return (
    <Card onClick={() => onSelect?.(task)}>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
    </Card>
  );
}
```

**Props Naming**:
- Event handlers: `onSelect`, `onClick`, `onChange`
- Boolean props: `isLoading`, `hasError`, `canEdit`
- Optional props: `className?`, `children?`

### State Management (Zustand)

```typescript
// lib/store/tasks.ts
import { create } from 'zustand';

interface TaskStore {
  tasks: Task[];
  selectedTask: Task | null;
  setTasks: (tasks: Task[]) => void;
  selectTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  selectedTask: null,
  setTasks: (tasks) => set({ tasks }),
  selectTask: (id) => set((state) => ({
    selectedTask: state.tasks.find(t => t.id === id) || null
  })),
}));
```

### Error Handling

**API Routes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Process
    const task = await createTask(body);
    return NextResponse.json({ success: true, data: { task } });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Client Components**:
```typescript
'use client';
function TaskList() {
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      setTasks(data.data.tasks);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    }
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  // ...
}
```

## Testing

### Unit Tests (Jest)

```typescript
// __tests__/utils/validatePath.test.ts
import { validatePath } from '@/lib/utils/validatePath';

describe('validatePath', () => {
  it('should allow paths within base directory', () => {
    expect(validatePath('/base/dir/file.txt', '/base/dir')).toBe(true);
  });

  it('should reject path traversal attempts', () => {
    expect(validatePath('/base/../etc/passwd', '/base')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// __tests__/api/tasks.test.ts
import { POST } from '@/app/api/tasks/route';
import { NextRequest } from 'next/server';

describe('POST /api/tasks', () => {
  it('should create a task', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task',
        type: 'create_app',
        description: 'Test description'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.task.title).toBe('Test Task');
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/tasks.spec.ts
import { test, expect } from '@playwright/test';

test('create and execute task', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Click new task button
  await page.click('button:has-text("New Task")');

  // Fill form
  await page.fill('input[name="title"]', 'Test Todo App');
  await page.selectOption('select[name="type"]', 'create_app');
  await page.fill('textarea[name="description"]', 'Create a todo app');

  // Submit
  await page.click('button:has-text("Create Task")');

  // Verify task created
  await expect(page.locator('text=Test Todo App')).toBeVisible();

  // Execute task
  await page.click('button:has-text("Execute")');

  // Verify status changed
  await expect(page.locator('text=In Progress')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Database Management

### Schema Changes

```bash
# Create migration
npx prisma migrate dev --name add_checkpoints_table

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

### Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.task.create({
    data: {
      title: 'Sample Task',
      type: 'create_app',
      status: 'draft',
      description: 'Sample task for development',
    },
  });
}

main();
```

## Debugging

### Server-side Debugging

```bash
# Enable debug logs
DEBUG=* npm run dev

# Node.js inspector
node --inspect node_modules/.bin/next dev
```

Then open `chrome://inspect` in Chrome

### Client-side Debugging

- Use React Developer Tools browser extension
- Use browser DevTools console
- Add `debugger;` statements in code

### Agent Output Debugging

Agent logs are stored in:
- Memory during execution
- File: `logs/{taskId}.jsonl` (persistent)

View logs:
```bash
# Tail agent logs
tail -f logs/task_123.jsonl

# View specific task logs
cat logs/task_123.jsonl | jq .
```

## Building for Production

### Build

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@claude-platform/web
```

### Environment Variables

Create `.env.production`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
ENCRYPTION_KEY=...
NODE_ENV=production
PORT=3000

# Optional: Claude Code CLI settings
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_MAX_TOKENS=8000
```

**Note**: Make sure Claude Code CLI is authenticated on the production server with `claude login`.

### Start Production Server

```bash
npm run start
```

## Deployment

### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t claude-task-platform .
docker run -p 3000:3000 --env-file .env.production claude-task-platform
```

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

## Monitoring & Logging

### Logging

Use structured logging:

```typescript
import { logger } from '@/lib/logger';

logger.info('Task created', { taskId: task.id, type: task.type });
logger.error('Task failed', { taskId: task.id, error: error.message });
```

### Monitoring

Consider integrating:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Datadog**: APM and logging
- **Prometheus**: Metrics collection

## Performance Optimization

### Next.js Optimizations

- Use Server Components by default
- Implement proper caching strategies
- Optimize images with `next/image`
- Enable Turbopack for faster builds

### Database Optimizations

- Add indexes for frequently queried fields
- Use connection pooling
- Implement caching (Redis)
- Optimize queries (avoid N+1)

### Agent Optimizations

- Use prompt caching effectively
- Batch operations when possible
- Implement rate limit handling
- Clean up completed agent processes

## Troubleshooting

### Common Issues

**Issue**: Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Issue**: Database locked (SQLite)
```bash
# Reset database
rm prisma/dev.db
npx prisma migrate dev
```

**Issue**: Agent not starting
- Verify Claude Code CLI is installed (`claude --version`)
- Check Claude Code CLI authentication (`claude login`)
- Verify working directory permissions
- Check agent process logs

**Issue**: SSE connection drops
- Check reverse proxy timeout settings
- Verify client reconnection logic
- Check server keep-alive settings

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes following conventions
4. Add tests
5. Update documentation
6. Submit pull request

## Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Claude API Documentation**: https://docs.anthropic.com
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

## Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `/docs` directory
- **Component Guides**: See `CLAUDE.md` files in each package

---

Happy coding! 🚀
