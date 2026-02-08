# 개발 가이드

## 개요

이 가이드는 Claude Code Server의 개발 환경 설정, 프로젝트 구조, 코딩 규칙, 테스팅 전략 및 배포 절차를 다룹니다.

## 사전 요구 사항

### 필수 소프트웨어

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상 (Node.js와 함께 제공)
- **Git**: 2.x 이상
- **Claude Code CLI**: 최신 버전 (설치 후 `claude login`으로 인증)

### 선택 소프트웨어

- **Docker**: 컨테이너화된 개발용
- **PostgreSQL**: 프로덕션 데이터베이스용 (개발은 SQLite)
- **Redis**: 분산 큐용 (선택 사항)

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/claude-code-server.git
cd claude-code-server
```

### 2. 의존성 설치

```bash
# 모든 의존성 설치 (monorepo)
npm install

# 또는 특정 패키지만 설치
cd packages/claude-code-server
npm install
```

### 3. 환경 설정

루트에 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 편집:

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
```

**참고**: Claude Code CLI는 자체 인증을 사용합니다. 서버를 시작하기 전에 `claude login`을 실행하세요.

### 4. 데이터베이스 설정

```bash
# 데이터베이스 초기화
npx prisma migrate dev --name init

# Prisma 클라이언트 생성
npx prisma generate

# (선택) 데이터베이스 시드
npx prisma db seed
```

### 5. 개발 서버 시작

```bash
# Next.js 개발 서버 시작
npm run dev

# 또는 turbo로 시작 (turborepo 사용 시)
npm run dev --workspace=@claude-platform/web
```

서버는 `http://localhost:3000`에서 시작됩니다

## 프로젝트 구조

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

## 개발 워크플로

### 1. 기능 브랜치 생성

```bash
git checkout -b feature/task-queue-management
```

### 2. 변경 사항 작성

코딩 규칙 준수 (아래 참조)

### 3. 변경 사항 테스트

```bash
# 단위 테스트 실행
npm run test

# 통합 테스트 실행
npm run test:integration

# e2e 테스트 실행
npm run test:e2e

# 모든 테스트 실행
npm run test:all
```

### 4. 변경 사항 커밋

```bash
git add .
git commit -m "feat: add task queue management"

# Conventional commits 준수:
# feat: 새 기능
# fix: 버그 수정
# docs: 문서화
# refactor: 코드 리팩토링
# test: 테스트 추가/업데이트
# chore: 유지보수
```

### 5. Push 및 PR 생성

```bash
git push origin feature/task-queue-management

# GitHub에서 pull request 생성
# 팀에 리뷰 요청
```

## 코딩 규칙

### TypeScript

**일반 규칙**:
- TypeScript를 엄격하게 사용 - `any` 피하기
- 모든 데이터 구조에 대한 인터페이스 정의
- 함수 매개변수 및 반환값에 적절한 타입 사용
- 전용 `types/` 디렉토리에서 타입 내보내기

**예시**:
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

### Next.js 규칙

**파일 명명**:
- 라우트: 하이픈을 사용한 소문자 (`task-list`, `user-profile`)
- 컴포넌트: PascalCase (`TaskCard.tsx`, `UserProfile.tsx`)
- 유틸리티: camelCase (`formatDate.ts`, `validatePath.ts`)

**서버 vs 클라이언트 컴포넌트**:
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

**API 라우트**:
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

### React 컴포넌트 규칙

**컴포넌트 구조**:
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

**Props 명명**:
- 이벤트 핸들러: `onSelect`, `onClick`, `onChange`
- Boolean props: `isLoading`, `hasError`, `canEdit`
- 선택적 props: `className?`, `children?`

### 상태 관리 (Zustand)

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

### 오류 처리

**API 라우트**:
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

**클라이언트 컴포넌트**:
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

## 테스팅

### 단위 테스트 (Jest)

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

### 통합 테스트

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

### E2E 테스트 (Playwright)

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

### 테스트 실행

```bash
# 단위 테스트
npm run test

# Watch 모드
npm run test:watch

# 커버리지
npm run test:coverage

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e

# 모든 테스트
npm run test:all
```

## 데이터베이스 관리

### 스키마 변경

```bash
# 마이그레이션 생성
npx prisma migrate dev --name add_checkpoints_table

# 마이그레이션 적용
npx prisma migrate deploy

# 데이터베이스 재설정 (개발 환경만)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Prisma Studio 열기 (데이터베이스 GUI)
npx prisma studio
```

### 시드

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

## 데이터베이스 마이그레이션 전략

### 개요

데이터베이스 스키마가 변경될 때마다 안전하고 신뢰할 수 있는 마이그레이션 절차가 필요합니다. 이 섹션에서는 개발 환경과 프로덕션 환경에서의 마이그레이션 전략을 설명합니다.

### 마이그레이션 도구

이 프로젝트는 **Prisma Migrate**를 사용합니다:
- **개발 환경**: `prisma migrate dev` - 스키마 변경, 마이그레이션 생성, 적용
- **프로덕션 환경**: `prisma migrate deploy` - 기존 마이그레이션만 적용

### 기본 마이그레이션 절차

#### 1. 개발 환경에서 마이그레이션 생성

```bash
# 1. schema.prisma 파일 수정
# 예: Task 모델에 priority 필드 추가

# 2. 마이그레이션 생성
npx prisma migrate dev --name add_task_priority

# 3. 생성된 SQL 확인
cat prisma/migrations/20250115120000_add_task_priority/migration.sql
```

생성된 마이그레이션 예시:
```sql
-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
```

#### 2. 마이그레이션 검토 및 테스트

```typescript
// tests/migrations/add_task_priority.test.ts
import { PrismaClient } from '@prisma/client';

describe('Migration: add_task_priority', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // 테스트 데이터베이스에 마이그레이션 적용
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should add priority column with default value', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Test Task',
        type: 'create_app',
        status: 'draft',
        description: 'Test',
      },
    });

    expect(task.priority).toBe('medium'); // 기본값 확인
  });

  test('should allow all priority values', async () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];

    for (const priority of priorities) {
      const task = await prisma.task.create({
        data: {
          title: `Task ${priority}`,
          type: 'create_app',
          status: 'draft',
          description: 'Test',
          priority,
        },
      });

      expect(task.priority).toBe(priority);
    }
  });
});
```

#### 3. 프로덕션 데이터 복사본에서 테스트

```bash
# 1. 프로덕션 데이터베이스 백업
pg_dump -h prod-db.example.com -U user -d claude_platform > prod_backup.sql

# 2. 로컬 테스트 데이터베이스에 복원
createdb test_migration
psql -d test_migration < prod_backup.sql

# 3. 마이그레이션 테스트 실행
DATABASE_URL="postgresql://localhost/test_migration" npx prisma migrate deploy

# 4. 데이터 무결성 검증
psql -d test_migration -c "SELECT COUNT(*) FROM \"Task\" WHERE priority IS NULL;"
# 결과: 0 (모든 행에 기본값 적용됨)
```

#### 4. 프로덕션 배포

```bash
# 1. 데이터베이스 백업 (필수!)
pg_dump -h prod-db.example.com -U user -d claude_platform \
  -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# 2. 마이그레이션 적용
DATABASE_URL="postgresql://prod-db.example.com/claude_platform" \
  npx prisma migrate deploy

# 3. 데이터 무결성 검증
psql -h prod-db.example.com -U user -d claude_platform \
  -c "SELECT COUNT(*) FROM \"Task\";"
```

### 마이그레이션 스크립트 템플릿

```typescript
// scripts/migrate-with-validation.ts

/**
 * 안전한 프로덕션 마이그레이션 스크립트
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';

interface MigrationConfig {
  databaseUrl: string;
  backupDir: string;
  validationQueries: string[];
  rollbackOnError: boolean;
}

export class MigrationRunner {
  private prisma: PrismaClient;
  private config: MigrationConfig;
  private backupPath: string = '';

  constructor(config: MigrationConfig) {
    this.config = config;
    this.prisma = new PrismaClient({
      datasources: { db: { url: config.databaseUrl } },
    });
  }

  /**
   * 전체 마이그레이션 프로세스 실행
   */
  async run(): Promise<void> {
    console.log('🚀 Starting migration process...\n');

    try {
      // Step 1: Pre-migration validation
      await this.validatePreMigration();

      // Step 2: Create backup
      await this.createBackup();

      // Step 3: Run migration
      await this.applyMigration();

      // Step 4: Post-migration validation
      await this.validatePostMigration();

      // Step 5: Verify data integrity
      await this.verifyDataIntegrity();

      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error);

      if (this.config.rollbackOnError && this.backupPath) {
        await this.rollback();
      }

      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Pre-migration 검증
   */
  private async validatePreMigration(): Promise<void> {
    console.log('📋 Step 1: Pre-migration validation');

    // 데이터베이스 연결 확인
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('  ✓ Database connection OK');
    } catch (error) {
      throw new Error('Database connection failed');
    }

    // 충분한 디스크 공간 확인
    const dbSize = await this.getDatabaseSize();
    const freeSpace = await this.getFreeDiskSpace();

    if (freeSpace < dbSize * 2) {
      throw new Error(
        `Insufficient disk space. Required: ${dbSize * 2}MB, Available: ${freeSpace}MB`
      );
    }
    console.log(`  ✓ Disk space OK (DB: ${dbSize}MB, Free: ${freeSpace}MB)`);

    // 활성 연결 확인
    const activeConnections = await this.getActiveConnections();
    if (activeConnections > 50) {
      console.warn(`  ⚠️  High connection count: ${activeConnections}`);
    } else {
      console.log(`  ✓ Active connections: ${activeConnections}`);
    }

    // 인덱스 및 제약 조건 확인
    await this.checkConstraints();
    console.log('  ✓ Constraints validated');
  }

  /**
   * 데이터베이스 백업 생성
   */
  private async createBackup(): Promise<void> {
    console.log('\n💾 Step 2: Creating backup');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = `${this.config.backupDir}/backup_${timestamp}.dump`;

    // pg_dump 실행
    const dbUrl = new URL(this.config.databaseUrl);
    const command = `pg_dump -h ${dbUrl.hostname} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} -F c -f ${this.backupPath}`;

    try {
      execSync(command, { stdio: 'inherit', env: { PGPASSWORD: dbUrl.password } });
      console.log(`  ✓ Backup created: ${this.backupPath}`);

      // 백업 파일 크기 확인
      const stats = fs.statSync(this.backupPath);
      console.log(`  ✓ Backup size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * 마이그레이션 적용
   */
  private async applyMigration(): Promise<void> {
    console.log('\n⚙️  Step 3: Applying migration');

    const startTime = Date.now();

    try {
      // Prisma migrate deploy 실행
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`  ✓ Migration applied in ${duration}s`);
    } catch (error) {
      throw new Error(`Migration execution failed: ${error}`);
    }
  }

  /**
   * Post-migration 검증
   */
  private async validatePostMigration(): Promise<void> {
    console.log('\n🔍 Step 4: Post-migration validation');

    for (const query of this.config.validationQueries) {
      try {
        const result = await this.prisma.$queryRawUnsafe(query);
        console.log(`  ✓ Validation query passed: ${query.substring(0, 50)}...`);
      } catch (error) {
        throw new Error(`Validation query failed: ${query}\nError: ${error}`);
      }
    }
  }

  /**
   * 데이터 무결성 검증
   */
  private async verifyDataIntegrity(): Promise<void> {
    console.log('\n🛡️  Step 5: Verifying data integrity');

    // 레코드 수 확인
    const taskCount = await this.prisma.task.count();
    console.log(`  ✓ Task count: ${taskCount}`);

    const reviewCount = await this.prisma.review.count();
    console.log(`  ✓ Review count: ${reviewCount}`);

    // NULL 값 확인 (NOT NULL 제약조건)
    const tasksWithNullPriority = await this.prisma.task.count({
      where: { priority: null },
    });

    if (tasksWithNullPriority > 0) {
      throw new Error(`Found ${tasksWithNullPriority} tasks with NULL priority`);
    }
    console.log('  ✓ No NULL values in NOT NULL columns');

    // 외래 키 무결성 확인
    const orphanedReviews = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Review" r
      LEFT JOIN "Task" t ON r."taskId" = t.id
      WHERE t.id IS NULL
    `;
    console.log('  ✓ Foreign key integrity OK');
  }

  /**
   * 롤백 수행
   */
  private async rollback(): Promise<void> {
    console.log('\n⏮️  Rolling back migration...');

    if (!this.backupPath || !fs.existsSync(this.backupPath)) {
      throw new Error('Backup file not found, cannot rollback');
    }

    const dbUrl = new URL(this.config.databaseUrl);
    const dbName = dbUrl.pathname.slice(1);

    // 데이터베이스 삭제 및 재생성
    const dropCommand = `psql -h ${dbUrl.hostname} -U ${dbUrl.username} -c "DROP DATABASE IF EXISTS ${dbName};"`;
    const createCommand = `psql -h ${dbUrl.hostname} -U ${dbUrl.username} -c "CREATE DATABASE ${dbName};"`;

    execSync(dropCommand, { env: { PGPASSWORD: dbUrl.password } });
    execSync(createCommand, { env: { PGPASSWORD: dbUrl.password } });

    // 백업 복원
    const restoreCommand = `pg_restore -h ${dbUrl.hostname} -U ${dbUrl.username} -d ${dbName} ${this.backupPath}`;
    execSync(restoreCommand, { env: { PGPASSWORD: dbUrl.password } });

    console.log('✅ Rollback completed successfully');
  }

  /**
   * 헬퍼 메서드들
   */
  private async getDatabaseSize(): Promise<number> {
    const result = await this.prisma.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) as size
    `;
    return Number(result[0].size) / 1024 / 1024; // MB
  }

  private async getFreeDiskSpace(): Promise<number> {
    // 간단한 구현 - 실제로는 OS별 명령어 사용
    return 10000; // 10GB
  }

  private async getActiveConnections(): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    return Number(result[0].count);
  }

  private async checkConstraints(): Promise<void> {
    // 모든 제약조건이 유효한지 확인
    await this.prisma.$queryRaw`
      SELECT conname
      FROM pg_constraint
      WHERE convalidated = false
    `;
  }
}

// 사용 예시
async function main() {
  const runner = new MigrationRunner({
    databaseUrl: process.env.DATABASE_URL!,
    backupDir: './backups',
    validationQueries: [
      'SELECT COUNT(*) FROM "Task" WHERE priority IS NOT NULL',
      'SELECT COUNT(*) FROM "Review" WHERE status IN (\'pending\', \'approved\', \'rejected\')',
    ],
    rollbackOnError: true,
  });

  await runner.run();
}

main().catch(console.error);
```

### Zero-Downtime 마이그레이션 전략

#### 1. Blue-Green Deployment

```typescript
/**
 * Blue-Green 배포를 통한 무중단 마이그레이션
 */

// Phase 1: Blue 환경 (현재 프로덕션)
// - 기존 스키마로 운영 중

// Phase 2: Green 환경 준비
// 1. Green 데이터베이스 생성
// 2. Blue → Green 복제
// 3. Green에 마이그레이션 적용
// 4. Green 검증

// Phase 3: 트래픽 전환
// 1. 로드 밸런서를 Green으로 전환
// 2. Blue 모니터링
// 3. 문제 발생 시 Blue로 롤백

// Phase 4: Blue 정리
// - 일정 시간 후 Blue 환경 제거
```

#### 2. Backward-Compatible Schema Changes

```typescript
/**
 * 호환성 유지 스키마 변경 전략
 */

// ❌ 나쁜 예: 즉시 NOT NULL 제약조건 추가
// ALTER TABLE "Task" ADD COLUMN "priority" VARCHAR NOT NULL;
// → 기존 행에 값이 없어 실패!

// ✅ 좋은 예: 단계별 추가
// Step 1: Nullable로 추가
await prisma.$executeRaw`
  ALTER TABLE "Task" ADD COLUMN "priority" VARCHAR;
`;

// Step 2: 기본값 채우기
await prisma.$executeRaw`
  UPDATE "Task" SET "priority" = 'medium' WHERE "priority" IS NULL;
`;

// Step 3: NOT NULL 제약조건 추가
await prisma.$executeRaw`
  ALTER TABLE "Task" ALTER COLUMN "priority" SET NOT NULL;
`;
```

#### 3. Multi-Step Migrations (컬럼 이름 변경)

```typescript
/**
 * 다단계 마이그레이션: 컬럼 이름 변경
 */

// 목표: "description" → "taskDescription"

// Step 1: 새 컬럼 추가 (Nullable)
// Migration: 001_add_task_description.sql
await prisma.$executeRaw`
  ALTER TABLE "Task" ADD COLUMN "taskDescription" TEXT;
`;

// Step 2: 데이터 복사
// Migration: 002_copy_to_task_description.sql
await prisma.$executeRaw`
  UPDATE "Task" SET "taskDescription" = "description";
`;

// Step 3: 애플리케이션 코드 업데이트
// - 두 컬럼 모두 읽기/쓰기 지원

// Step 4: 기존 컬럼 삭제
// Migration: 003_drop_description.sql (몇 주 후)
await prisma.$executeRaw`
  ALTER TABLE "Task" DROP COLUMN "description";
`;
```

### 프로덕션 마이그레이션 체크리스트

```markdown
## Pre-Migration Checklist

- [ ] 스키마 변경 사항 검토 완료
- [ ] 마이그레이션 SQL 검토 완료
- [ ] 로컬 환경에서 테스트 완료
- [ ] 프로덕션 데이터 복사본에서 테스트 완료
- [ ] 롤백 계획 수립 완료
- [ ] 데이터베이스 백업 생성 완료
- [ ] 디스크 공간 충분 확인 (최소 DB 크기의 2배)
- [ ] 팀 알림 전송 (유지보수 시간 공지)
- [ ] 모니터링 대시보드 준비

## Migration Execution

- [ ] 유지보수 모드 활성화 (선택사항)
- [ ] 마이그레이션 실행
- [ ] 마이그레이션 완료 확인
- [ ] 데이터 무결성 검증
- [ ] 애플리케이션 재시작

## Post-Migration Validation

- [ ] 모든 API 엔드포인트 테스트
- [ ] 주요 기능 동작 확인
- [ ] 로그 확인 (에러 없음)
- [ ] 성능 메트릭 확인
- [ ] 데이터베이스 쿼리 성능 확인
- [ ] 유지보수 모드 해제

## Rollback Plan (문제 발생 시)

- [ ] 애플리케이션 중지
- [ ] 데이터베이스 백업 복원
- [ ] 이전 버전 애플리케이션 배포
- [ ] 서비스 재개
- [ ] 포스트모텀 작성
```

### 일반적인 마이그레이션 시나리오

#### Scenario 1: 새 컬럼 추가 (Nullable → Required)

```sql
-- Step 1: Nullable로 추가
ALTER TABLE "Task" ADD COLUMN "estimatedDuration" INTEGER;

-- Step 2: 기본값 채우기
UPDATE "Task" SET "estimatedDuration" = 3600 WHERE "estimatedDuration" IS NULL;

-- Step 3: NOT NULL 제약조건 추가
ALTER TABLE "Task" ALTER COLUMN "estimatedDuration" SET NOT NULL;

-- Step 4: 기본값 설정
ALTER TABLE "Task" ALTER COLUMN "estimatedDuration" SET DEFAULT 3600;
```

#### Scenario 2: 컬럼 타입 변경

```sql
-- 목표: status VARCHAR → ENUM

-- Step 1: 새 ENUM 타입 생성
CREATE TYPE "TaskStatus" AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'failed');

-- Step 2: 임시 컬럼 추가
ALTER TABLE "Task" ADD COLUMN "statusNew" "TaskStatus";

-- Step 3: 데이터 변환 및 복사
UPDATE "Task" SET "statusNew" = "status"::"TaskStatus";

-- Step 4: 기존 컬럼 삭제
ALTER TABLE "Task" DROP COLUMN "status";

-- Step 5: 컬럼 이름 변경
ALTER TABLE "Task" RENAME COLUMN "statusNew" TO "status";
```

#### Scenario 3: 데이터 변환 마이그레이션

```typescript
// 복잡한 데이터 변환 로직
async function migrateTaskMetadata() {
  const tasks = await prisma.task.findMany({
    select: { id: true, metadata: true },
  });

  for (const task of tasks) {
    // 기존 JSON 구조 변환
    const oldMetadata = task.metadata as any;
    const newMetadata = {
      version: 2,
      settings: {
        autoApprove: oldMetadata.auto_approve || false,
        notifyOnComplete: oldMetadata.notify || true,
      },
      timestamps: {
        created: oldMetadata.created_at,
        updated: oldMetadata.updated_at,
      },
    };

    await prisma.task.update({
      where: { id: task.id },
      data: { metadata: newMetadata },
    });
  }
}
```

### 오류 시나리오 및 복구

#### Error 1: Migration Timeout (대용량 테이블 Lock)

```typescript
// 문제: 수백만 행의 테이블에서 ALTER TABLE 실행 시 Lock
// 해결: 배치 처리로 나누기

async function addColumnInBatches() {
  const batchSize = 10000;
  let offset = 0;

  while (true) {
    const tasks = await prisma.task.findMany({
      skip: offset,
      take: batchSize,
      select: { id: true },
    });

    if (tasks.length === 0) break;

    // 배치 단위로 업데이트
    await prisma.$executeRaw`
      UPDATE "Task"
      SET "priority" = 'medium'
      WHERE id IN (${Prisma.join(tasks.map((t) => t.id))})
      AND "priority" IS NULL
    `;

    offset += batchSize;
    console.log(`Processed ${offset} rows...`);
  }
}
```

#### Error 2: Constraint Violation

```typescript
// 문제: 기존 데이터가 새 제약조건 위반
// 해결: 데이터 정리 후 제약조건 추가

// 1. 위반 데이터 찾기
const violatingTasks = await prisma.$queryRaw`
  SELECT id, priority
  FROM "Task"
  WHERE priority NOT IN ('low', 'medium', 'high', 'urgent')
`;

// 2. 데이터 정리
for (const task of violatingTasks) {
  await prisma.task.update({
    where: { id: task.id },
    data: { priority: 'medium' }, // 기본값으로 수정
  });
}

// 3. 제약조건 추가
await prisma.$executeRaw`
  ALTER TABLE "Task"
  ADD CONSTRAINT "Task_priority_check"
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
`;
```

#### Error 3: 디스크 공간 부족

```bash
# 문제: 마이그레이션 중 디스크 공간 부족
# 해결: 불필요한 데이터 정리

# 1. 오래된 로그 삭제
psql -c "DELETE FROM \"TaskLog\" WHERE timestamp < NOW() - INTERVAL '90 days';"

# 2. VACUUM으로 공간 회수
psql -c "VACUUM FULL \"TaskLog\";"

# 3. 인덱스 재구성
psql -c "REINDEX DATABASE claude_platform;"
```

### 모니터링 및 메트릭

```typescript
// 마이그레이션 진행 상황 모니터링
export class MigrationMonitor {
  async trackProgress(migrationName: string): Promise<void> {
    const metrics = {
      startTime: Date.now(),
      rowsProcessed: 0,
      errors: 0,
    };

    // 진행 상황 로깅
    const interval = setInterval(async () => {
      const progress = await this.getProgress();
      console.log(`Migration ${migrationName}: ${progress.percentage}% complete`);

      // 메트릭 전송
      await this.sendMetrics({
        migration: migrationName,
        progress: progress.percentage,
        duration: Date.now() - metrics.startTime,
      });
    }, 10000); // 10초마다

    // 마이그레이션 완료 후 정리
    return () => clearInterval(interval);
  }
}

## 디버깅

### 서버 사이드 디버깅

```bash
# 디버그 로그 활성화
DEBUG=* npm run dev

# Node.js inspector
node --inspect node_modules/.bin/next dev
```

그런 다음 Chrome에서 `chrome://inspect` 열기

### 클라이언트 사이드 디버깅

- React Developer Tools 브라우저 확장 프로그램 사용
- 브라우저 DevTools 콘솔 사용
- 코드에 `debugger;` 문 추가

### 에이전트 출력 디버깅

에이전트 로그 저장 위치:
- 실행 중 메모리
- 파일: `logs/{taskId}.jsonl` (영구)

로그 보기:
```bash
# 에이전트 로그 tail
tail -f logs/task_123.jsonl

# 특정 작업 로그 보기
cat logs/task_123.jsonl | jq .
```

## 프로덕션 빌드

### 빌드

```bash
# 모든 패키지 빌드
npm run build

# 특정 패키지 빌드
npm run build --workspace=@claude-platform/web
```

### 환경 변수

`.env.production` 생성:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
ENCRYPTION_KEY=...
NODE_ENV=production
PORT=3000

# Optional: Claude Code CLI settings
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_MAX_TOKENS=8000
```

**참고**: 프로덕션 서버에서 `claude login`으로 Claude Code CLI가 인증되었는지 확인하세요.

### 프로덕션 서버 시작

```bash
npm run start
```

## 배포

### Vercel (Next.js 권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
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

빌드 및 실행:
```bash
docker build -t claude-task-platform .
docker run -p 3000:3000 --env-file .env.production claude-task-platform
```

### Railway

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 초기화
railway init

# 배포
railway up
```

## 모니터링 및 로깅

### 로깅

구조화된 로깅 사용:

```typescript
import { logger } from '@/lib/logger';

logger.info('Task created', { taskId: task.id, type: task.type });
logger.error('Task failed', { taskId: task.id, error: error.message });
```

### 모니터링

통합 고려 사항:
- **Sentry**: 오류 추적
- **LogRocket**: 세션 재생
- **Datadog**: APM 및 로깅
- **Prometheus**: 메트릭 수집

## 성능 최적화

### Next.js 최적화

- 기본적으로 서버 컴포넌트 사용
- 적절한 캐싱 전략 구현
- `next/image`로 이미지 최적화
- 더 빠른 빌드를 위해 Turbopack 활성화

### 데이터베이스 최적화

- 자주 쿼리되는 필드에 인덱스 추가
- 연결 풀링 사용
- 캐싱 구현 (Redis)
- 쿼리 최적화 (N+1 방지)

### 에이전트 최적화

- 프롬프트 캐싱 효과적으로 사용
- 가능한 경우 배치 작업
- 속도 제한 처리 구현
- 완료된 에이전트 프로세스 정리

## Graceful Shutdown (우아한 종료)

### Agent Manager 서버 종료 시 처리

**문제**: Agent Manager 서버(Next.js)가 종료될 때 실행 중인 Sub-Agent 프로세스를 정리하지 않으면 고아 프로세스(orphan process)가 남아 무한 실행될 수 있습니다.

**해결책**: Graceful shutdown 로직 구현

#### 1. 종료 신호 처리

```typescript
// packages/agent-manager/src/shutdown.ts
import { AgentManager } from './AgentManager';

/**
 * Graceful shutdown handler
 */
export class ShutdownHandler {
  private agentManager: AgentManager;
  private isShuttingDown = false;

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;

    // SIGTERM, SIGINT 신호 처리 등록
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGQUIT', () => this.handleShutdown('SIGQUIT'));
  }

  async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log('⏳ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      // 1. 모든 실행 중인 Agent 목록 가져오기
      const runningAgents = await this.agentManager.getRunningAgents();
      console.log(`📋 Found ${runningAgents.length} running agents`);

      // 2. 각 Agent에 대해 Checkpoint 생성 및 종료
      const shutdownPromises = runningAgents.map(async (agent) => {
        try {
          console.log(`💾 Creating checkpoint for task ${agent.taskId}...`);

          // Checkpoint 생성
          await this.agentManager.createCheckpoint(agent.taskId, 'graceful_shutdown');

          // Agent 프로세스에 SIGTERM 전송
          console.log(`🛑 Terminating agent for task ${agent.taskId}...`);
          agent.process.kill('SIGTERM');

          // 5초 대기 후 아직 살아있으면 SIGKILL
          await this.waitForExit(agent.process, 5000);

        } catch (error) {
          console.error(`❌ Error shutting down agent ${agent.taskId}:`, error);

          // 강제 종료
          agent.process.kill('SIGKILL');
        }
      });

      // 3. 모든 Agent 종료 대기
      await Promise.all(shutdownPromises);
      console.log('✅ All agents terminated');

      // 4. 데이터베이스 연결 종료
      await this.agentManager.closeDatabase();
      console.log('✅ Database connection closed');

      // 5. 기타 리소스 정리
      await this.cleanup();
      console.log('✅ Cleanup completed');

      console.log('👋 Shutdown complete. Goodbye!');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * 프로세스가 종료될 때까지 대기 (타임아웃 있음)
   */
  private waitForExit(childProcess: ChildProcess, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!childProcess.killed) {
          console.warn(`⚠️ Process did not exit gracefully, sending SIGKILL`);
          childProcess.kill('SIGKILL');
        }
        resolve();
      }, timeout);

      childProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * 기타 리소스 정리
   */
  private async cleanup(): Promise<void> {
    // Redis 연결 종료, 파일 핸들러 닫기, 임시 파일 정리 등
    // ...
  }
}
```

#### 2. Next.js 서버와 통합

```typescript
// packages/claude-code-server/src/server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { AgentManager } from '@claude-platform/agent-manager';
import { ShutdownHandler } from '@claude-platform/agent-manager/shutdown';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  // Agent Manager 초기화
  const agentManager = new AgentManager();

  // Graceful shutdown handler 등록
  const shutdownHandler = new ShutdownHandler(agentManager);

  // HTTP 서버 생성
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

#### 3. Docker 환경에서의 처리

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY . .
RUN npm ci --only=production
RUN npm run build

EXPOSE 3000

# Graceful shutdown을 위해 SIGTERM을 전달하도록 설정
STOPSIGNAL SIGTERM

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    stop_grace_period: 30s  # ← Graceful shutdown 대기 시간
    environment:
      - NODE_ENV=production
```

#### 4. 테스트

```bash
# 개발 환경에서 테스트
npm run dev

# Ctrl+C 누르기 (SIGINT)
# 또는 다른 터미널에서:
kill -TERM <PID>

# 로그 확인:
# - "Starting graceful shutdown..."
# - "Creating checkpoint for task..."
# - "All agents terminated"
# - "Shutdown complete"
```

### 주의사항

1. **타임아웃 설정**: Agent가 5초 내에 종료되지 않으면 SIGKILL 사용
2. **Checkpoint 실패**: Checkpoint 생성 실패 시에도 Agent 종료
3. **재시작 안전성**: 서버 재시작 시 Checkpoint에서 Agent 복구 가능
4. **로그 보존**: 종료 전 모든 로그 flush하여 손실 방지

## 문제 해결

### 일반적인 문제

**문제**: 포트가 이미 사용 중
```bash
# 포트 3000의 프로세스 종료
lsof -ti:3000 | xargs kill -9
```

**문제**: 데이터베이스 잠김 (SQLite)
```bash
# 데이터베이스 재설정
rm prisma/dev.db
npx prisma migrate dev
```

**문제**: 에이전트가 시작되지 않음
- Claude Code CLI가 설치되어 있는지 확인 (`claude --version`)
- Claude Code CLI 인증 확인 (`claude login`)
- 작업 디렉토리 권한 확인
- 에이전트 프로세스 로그 확인

**문제**: SSE 연결 끊김
- 리버스 프록시 타임아웃 설정 확인
- 클라이언트 재연결 로직 확인
- 서버 keep-alive 설정 확인

## 기여

1. 저장소 포크
2. 기능 브랜치 생성
3. 규칙에 따라 변경 사항 작성
4. 테스트 추가
5. 문서 업데이트
6. Pull request 제출

## 리소스

- **Next.js 문서**: https://nextjs.org/docs
- **Prisma 문서**: https://www.prisma.io/docs
- **Claude API 문서**: https://docs.anthropic.com
- **TypeScript 핸드북**: https://www.typescriptlang.org/docs

## 지원

- **GitHub Issues**: 버그 보고 및 기능 요청
- **문서**: `/docs` 디렉토리 확인
- **컴포넌트 가이드**: 각 패키지의 `CLAUDE.md` 파일 참조

---

즐거운 코딩 되세요!
