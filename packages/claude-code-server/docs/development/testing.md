# 테스팅

## 개요

Claude Code Server의 테스트 전략과 테스트 작성 방법을 설명합니다.

## 테스트 스택

- **테스트 프레임워크**: Jest
- **React 테스팅**: React Testing Library
- **E2E 테스팅**: Playwright (선택사항)
- **목킹**: Jest mocks

## 테스트 구조

```
packages/claude-code-server/
├── __tests__/
│   ├── lib/
│   │   ├── utils/
│   │   │   ├── path-validation.test.ts
│   │   │   ├── encryption.test.ts
│   │   │   └── sanitize.test.ts
│   │   ├── agent/
│   │   │   └── executor.test.ts
│   │   └── database/
│   │       └── tasks.test.ts
│   ├── api/
│   │   ├── tasks.test.ts
│   │   └── reviews.test.ts
│   └── components/
│       ├── TaskCard.test.tsx
│       └── Dashboard.test.tsx
└── jest.config.js
```

## 테스트 실행

### 모든 테스트 실행

```bash
npm test
```

### Watch 모드

```bash
npm test -- --watch
```

### 특정 파일 테스트

```bash
npm test path/to/test.test.ts
```

### 커버리지

```bash
npm test -- --coverage
```

## 단위 테스트 (Unit Tests)

### 유틸리티 함수 테스트

```typescript
// __tests__/lib/utils/path-validation.test.ts
import { validatePath, sanitizePath } from '@/lib/utils/path-validation';

describe('Path Validation', () => {
  const baseDir = '/projects/task_123';

  describe('validatePath', () => {
    it('should allow valid paths within base directory', () => {
      const result = validatePath('docs/planning/01_idea.md', baseDir);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/projects/task_123/docs/planning/01_idea.md');
    });

    it('should reject path traversal attempts', () => {
      const result = validatePath('../../../etc/passwd', baseDir);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('traversal');
    });

    it('should reject null bytes', () => {
      const result = validatePath('file\0.txt', baseDir);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Null byte');
    });

    it('should reject sensitive files', () => {
      const result = validatePath('.env', baseDir);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });
  });

  describe('sanitizePath', () => {
    it('should remove dangerous characters', () => {
      const result = sanitizePath('file<script>.txt');
      expect(result).not.toContain('<script>');
    });
  });
});
```

### 암호화 테스트

```typescript
// __tests__/lib/utils/encryption.test.ts
import { encryptSecret, decryptSecret } from '@/lib/utils/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'sk-test-1234567890abcdef';

    const encrypted = encryptSecret(plaintext);

    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'sk-test-1234567890abcdef';

    const enc1 = encryptSecret(plaintext);
    const enc2 = encryptSecret(plaintext);

    // IV가 다르므로 암호문도 다름
    expect(enc1.encrypted).not.toBe(enc2.encrypted);
    expect(enc1.iv).not.toBe(enc2.iv);

    // 하지만 복호화 결과는 같음
    expect(decryptSecret(enc1)).toBe(plaintext);
    expect(decryptSecret(enc2)).toBe(plaintext);
  });

  it('should fail with tampered data', () => {
    const plaintext = 'sk-test-1234567890abcdef';
    const encrypted = encryptSecret(plaintext);

    // 암호문 변조
    encrypted.encrypted = encrypted.encrypted.replace('A', 'B');

    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
```

## API 테스트 (Integration Tests)

### Next.js API Route 테스트

```typescript
// __tests__/api/tasks.test.ts
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/tasks/route';

describe('Tasks API', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          type: 'custom',
          description: 'This is a test task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.task).toBeDefined();
      expect(data.task.title).toBe('Test Task');
    });

    it('should reject invalid task type', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          type: 'invalid_type',
          description: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject path traversal in output directory', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          type: 'custom',
          description: 'Test',
          outputDirectory: '../../../etc',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return list of tasks', async () => {
      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.tasks)).toBe(true);
    });
  });
});
```

### 데이터베이스 테스트

```typescript
// __tests__/lib/database/tasks.test.ts
import { PrismaClient } from '@prisma/client';
import { createTask, getTask, updateTask } from '@/lib/database/tasks';

const prisma = new PrismaClient();

beforeAll(async () => {
  // 테스트 DB 초기화
  await prisma.$executeRaw`DELETE FROM tasks`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Task Database Operations', () => {
  it('should create a task', async () => {
    const task = await createTask({
      title: 'Test Task',
      type: 'custom',
      description: 'Test description',
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('pending');
  });

  it('should get a task by id', async () => {
    const created = await createTask({
      title: 'Test Task 2',
      type: 'custom',
      description: 'Test',
    });

    const fetched = await getTask(created.id);

    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.title).toBe('Test Task 2');
  });

  it('should update task status', async () => {
    const task = await createTask({
      title: 'Test Task 3',
      type: 'custom',
      description: 'Test',
    });

    const updated = await updateTask(task.id, {
      status: 'in_progress',
      progress: 50,
    });

    expect(updated.status).toBe('in_progress');
    expect(updated.progress).toBe(50);
  });
});
```

## React 컴포넌트 테스트

### 컴포넌트 렌더링 테스트

```typescript
// __tests__/components/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/TaskCard';

const mockTask = {
  id: 'task_123',
  title: 'Test Task',
  type: 'custom' as const,
  status: 'pending' as const,
  description: 'Test description',
  progress: 0,
  createdAt: new Date(),
};

describe('TaskCard', () => {
  it('should render task information', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();

    render(<TaskCard task={mockTask} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledWith(mockTask.id);
  });

  it('should show progress bar when in progress', () => {
    const inProgressTask = { ...mockTask, status: 'in_progress' as const, progress: 45 };

    render(<TaskCard task={inProgressTask} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
  });
});
```

### Hooks 테스트

```typescript
// __tests__/hooks/useTasks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from '@/hooks/useTasks';

// Mock fetch
global.fetch = jest.fn();

describe('useTasks', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch tasks on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        tasks: [{ id: '1', title: 'Task 1' }],
      }),
    });

    const { result } = renderHook(() => useTasks());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Task 1');
  });
});
```

## 목킹 (Mocking)

### API 목킹

```typescript
// __tests__/lib/agent/executor.test.ts
import { spawn } from 'child_process';
import { createAgent } from '@/lib/agent/executor';

// child_process 목킹
jest.mock('child_process');

describe('Agent Executor', () => {
  it('should spawn Claude process', async () => {
    const mockProcess = {
      pid: 1234,
      stdin: { write: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);

    const agent = await createAgent({
      taskId: 'task_123',
      workingDir: '/tmp/task_123',
    });

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--yes']),
      expect.objectContaining({
        cwd: '/tmp/task_123',
      })
    );

    expect(agent).toBeDefined();
    expect(agent.pid).toBe(1234);
  });
});
```

### 데이터베이스 목킹

```typescript
// __tests__/lib/tasks/service.test.ts
import { PrismaClient } from '@prisma/client';
import { TaskService } from '@/lib/tasks/service';

// Prisma 목킹
jest.mock('@prisma/client');

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService(mockPrisma as any);
    jest.clearAllMocks();
  });

  it('should get all tasks', async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ]);

    const tasks = await service.getAllTasks();

    expect(tasks).toHaveLength(2);
    expect(mockPrisma.task.findMany).toHaveBeenCalledTimes(1);
  });
});
```

## E2E 테스트 (Playwright)

### 설치

```bash
npm install -D @playwright/test
npx playwright install
```

### E2E 테스트 예시

```typescript
// e2e/task-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Creation Flow', () => {
  test('should create a new task', async ({ page }) => {
    // 홈페이지 접속
    await page.goto('http://localhost:3000');

    // 새 작업 버튼 클릭
    await page.click('text=New Task');

    // 폼 입력
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.selectOption('select[name="type"]', 'custom');
    await page.fill('textarea[name="description"]', 'This is an E2E test');

    // 제출
    await page.click('button[type="submit"]');

    // 성공 메시지 확인
    await expect(page.locator('text=Task created successfully')).toBeVisible();

    // Task 목록에서 확인
    await expect(page.locator('text=E2E Test Task')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks/new');

    // 빈 폼 제출
    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });
});
```

## 테스트 커버리지

### 커버리지 목표

- **유틸리티 함수**: 90%+
- **API Routes**: 80%+
- **컴포넌트**: 70%+
- **전체**: 75%+

### 커버리지 확인

```bash
npm test -- --coverage
```

### 커버리지 리포트

```bash
# HTML 리포트 생성
npm test -- --coverage --coverageReporters=html

# coverage/index.html 열기
open coverage/index.html
```

## 테스트 베스트 프랙티스

### 1. AAA 패턴

```typescript
it('should do something', () => {
  // Arrange (준비)
  const input = 'test';
  const expected = 'TEST';

  // Act (실행)
  const result = toUpperCase(input);

  // Assert (검증)
  expect(result).toBe(expected);
});
```

### 2. 명확한 테스트 이름

```typescript
// ❌ 나쁜 예
it('works', () => { ... });

// ✅ 좋은 예
it('should return uppercase string when given lowercase input', () => { ... });
```

### 3. 하나의 테스트, 하나의 검증

```typescript
// ❌ 나쁜 예 (여러 검증)
it('should validate user', () => {
  expect(validateEmail(email)).toBe(true);
  expect(validatePassword(password)).toBe(true);
  expect(validateAge(age)).toBe(true);
});

// ✅ 좋은 예 (개별 테스트)
it('should validate email format', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});

it('should validate password strength', () => {
  expect(validatePassword('Strong123!')).toBe(true);
});
```

### 4. 테스트 독립성

```typescript
// ✅ 각 테스트는 독립적
beforeEach(() => {
  // 매 테스트마다 초기화
  resetDatabase();
});

it('test 1', () => { ... });
it('test 2', () => { ... });
```

## CI/CD 통합

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## 관련 문서

- **Setup**: `setup.md` - 개발 환경 설정
- **Debugging**: `debugging.md` - 디버깅 방법
- **Conventions**: `conventions.md` - 코딩 규칙
