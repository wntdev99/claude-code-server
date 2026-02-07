# 코딩 컨벤션

## 개요

Claude Code Server 프로젝트의 코딩 규칙과 베스트 프랙티스입니다.

## TypeScript

### 타입 정의

```typescript
// ✅ 명시적 타입 사용
function createTask(title: string, type: TaskType): Task {
  // ...
}

// ❌ any 타입 사용 금지
function processData(data: any) {  // 피하기
  // ...
}

// ✅ 적절한 타입 정의
interface TaskData {
  title: string;
  type: TaskType;
  description: string;
}

function processData(data: TaskData) {
  // ...
}
```

### 타입 vs 인터페이스

```typescript
// ✅ 객체 형태: interface 사용
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Union, Primitive: type 사용
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
type ID = string;
```

### Enum

```typescript
// ✅ const enum 사용 (런타임 오버헤드 없음)
const enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// ❌ 일반 enum (가능한 피하기)
enum Status {  // 런타임 코드 생성
  Active,
  Inactive,
}
```

## 네이밍 컨벤션

### 파일명

```
✅ kebab-case 사용
- task-manager.ts
- user-profile.tsx
- api-client.ts

❌ 다른 케이스
- TaskManager.ts
- userProfile.tsx
- APIClient.ts
```

### 변수/함수

```typescript
// ✅ camelCase
const taskId = 'task_123';
function createTask() { }

// ❌ 다른 케이스
const TaskId = 'task_123';
const task_id = 'task_123';
```

### 상수

```typescript
// ✅ UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ 객체는 camelCase (freeze 사용)
const taskConfig = Object.freeze({
  maxConcurrent: 3,
  timeout: 30000,
});
```

### 클래스/인터페이스/타입

```typescript
// ✅ PascalCase
class TaskManager { }
interface Task { }
type TaskType = 'create_app' | 'modify_app';
```

### React 컴포넌트

```typescript
// ✅ PascalCase, .tsx 확장자
function TaskCard({ task }: TaskCardProps) {
  return <div>{task.title}</div>;
}

// ✅ Props 인터페이스 이름
interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}
```

## 코드 구조

### 파일 구조

```typescript
// 1. Imports (외부 → 내부)
import { useState } from 'react';
import { Task } from '@prisma/client';
import { createTask } from '@/lib/tasks';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Constants
const MAX_ITEMS = 10;

// 4. 메인 코드
export function Component({ }: Props) {
  // ...
}

// 5. 헬퍼 함수 (private)
function helperFunction() {
  // ...
}
```

### Import 순서

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// 3. 내부 모듈 (@/ alias)
import { Task } from '@/types';
import { createTask } from '@/lib/tasks';

// 4. 상대 경로
import { TaskCard } from './TaskCard';
import { styles } from './styles';
```

### Export

```typescript
// ✅ Named export 선호
export function createTask() { }
export class TaskManager { }

// ✅ Default export는 컴포넌트/페이지만
export default function TaskPage() { }

// ❌ 혼용 지양
export function createTask() { }
export default createTask;  // 혼란 초래
```

## 함수

### 함수 선언 vs 표현식

```typescript
// ✅ 일반 함수: 함수 선언
function createTask(data: TaskData): Task {
  // ...
}

// ✅ 콜백, 일회성: 화살표 함수
const handleClick = () => {
  // ...
};

// ✅ 간단한 변환: 화살표 함수
const toUpperCase = (str: string) => str.toUpperCase();
```

### 함수 길이

```typescript
// ✅ 함수는 20-30줄 이내
function createTask(data: TaskData): Task {
  validateTaskData(data);
  const task = buildTask(data);
  saveTask(task);
  notifyCreation(task);
  return task;
}

// ❌ 너무 긴 함수 (분리 필요)
function createTask(data: TaskData): Task {
  // 100줄 이상의 코드...
}
```

### 파라미터

```typescript
// ✅ 파라미터 3개 이하
function createTask(title: string, type: TaskType, description: string) {
  // ...
}

// ✅ 많은 파라미터: 객체 사용
interface CreateTaskParams {
  title: string;
  type: TaskType;
  description: string;
  priority?: Priority;
  scheduledFor?: Date;
}

function createTask(params: CreateTaskParams) {
  // ...
}
```

## React 컴포넌트

### 함수형 컴포넌트

```tsx
// ✅ 함수형 컴포넌트 사용
export function TaskCard({ task, onClick }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={onClick}>
      <h3>{task.title}</h3>
      {isExpanded && <p>{task.description}</p>}
    </div>
  );
}

// ❌ 클래스 컴포넌트 (레거시)
class TaskCard extends Component<TaskCardProps> {
  // ...
}
```

### Hooks 순서

```tsx
export function TaskCard({ task }: TaskCardProps) {
  // 1. useState
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2. useRef
  const cardRef = useRef<HTMLDivElement>(null);

  // 3. Custom hooks
  const { data, error } = useTasks();

  // 4. useEffect
  useEffect(() => {
    // ...
  }, []);

  // 5. Handlers
  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  // 6. Render
  return <div>{/* ... */}</div>;
}
```

### Props 구조 분해

```tsx
// ✅ Props 구조 분해
function TaskCard({ task, onClick }: TaskCardProps) {
  return <div onClick={onClick}>{task.title}</div>;
}

// ❌ props 객체 직접 사용
function TaskCard(props: TaskCardProps) {
  return <div onClick={props.onClick}>{props.task.title}</div>;
}
```

## 비동기 처리

### async/await

```typescript
// ✅ async/await 사용
async function createTask(data: TaskData): Promise<Task> {
  try {
    const validated = await validateTask(data);
    const task = await db.task.create({ data: validated });
    return task;
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}

// ❌ Promise chain (가능한 피하기)
function createTask(data: TaskData): Promise<Task> {
  return validateTask(data)
    .then(validated => db.task.create({ data: validated }))
    .then(task => {
      return task;
    })
    .catch(error => {
      console.error('Failed to create task:', error);
      throw error;
    });
}
```

### 에러 처리

```typescript
// ✅ 명시적 에러 처리
async function createTask(data: TaskData): Promise<Task> {
  try {
    const task = await db.task.create({ data });
    return task;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      // 특정 에러 처리
      throw new Error('Database error');
    }
    throw error;
  }
}

// ✅ Result 타입 사용
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function createTask(data: TaskData): Promise<Result<Task>> {
  try {
    const task = await db.task.create({ data });
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## 주석

### JSDoc

```typescript
/**
 * Creates a new task in the database
 *
 * @param data - Task creation data
 * @returns The created task
 * @throws {ValidationError} If task data is invalid
 * @throws {DatabaseError} If database operation fails
 */
async function createTask(data: TaskData): Promise<Task> {
  // ...
}
```

### 인라인 주석

```typescript
// ✅ 왜(Why)를 설명하는 주석
// Retry 3 times because API is unstable
const result = await retryOperation(operation, 3);

// ❌ 무엇(What)을 설명하는 주석 (코드가 자명함)
// Create a task
const task = createTask(data);

// ✅ TODO 주석
// TODO: Add rate limiting
// FIXME: Handle edge case when user is null
// HACK: Temporary workaround for API bug
```

## 코드 품질

### Linting

```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint -- --fix
```

**`.eslintrc.js`**:
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Prettier

```bash
# 포맷팅 확인
npm run format:check

# 포맷팅 적용
npm run format
```

**`.prettierrc`**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

## 보안

### 입력 검증

```typescript
// ✅ 항상 입력 검증
function createTask(input: unknown): Task {
  const validated = TaskSchema.parse(input);  // Zod
  return db.task.create({ data: validated });
}

// ❌ 검증 없이 사용
function createTask(input: any): Task {
  return db.task.create({ data: input });  // 위험!
}
```

### 민감 정보

```typescript
// ✅ 환경 변수 사용
const apiKey = process.env.OPENAI_API_KEY;

// ❌ 하드코딩
const apiKey = 'sk-1234...';  // 절대 금지!

// ✅ 로그에서 제외
console.log('API call', { userId, /* apiKey는 로그하지 않음 */ });
```

## 성능

### 메모이제이션

```tsx
// ✅ 비용 높은 계산: useMemo
const sortedTasks = useMemo(
  () => tasks.sort((a, b) => b.createdAt - a.createdAt),
  [tasks]
);

// ✅ 콜백: useCallback
const handleClick = useCallback(() => {
  onClick(task.id);
}, [task.id, onClick]);

// ❌ 불필요한 메모이제이션
const name = useMemo(() => user.name, [user]);  // 단순 접근은 불필요
```

### 조건부 렌더링

```tsx
// ✅ 조건부 렌더링
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <TaskList tasks={data} />}

// ❌ 삼항 연산자 남용
{isLoading ? <Spinner /> : error ? <ErrorMessage /> : data ? <TaskList /> : null}
```

## Git 커밋

### 커밋 메시지

```bash
# ✅ Conventional Commits
feat: add OAuth authentication
fix: resolve memory leak in agent manager
docs: update API documentation
refactor: simplify task creation logic
test: add tests for encryption module
chore: update dependencies

# ❌ 불명확한 메시지
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

### 커밋 크기

```bash
# ✅ 작은 단위 커밋
git commit -m "feat: add task validation"
git commit -m "feat: add task creation API"
git commit -m "test: add task creation tests"

# ❌ 큰 커밋
git commit -m "feat: complete entire task system"
```

## 체크리스트

코드 리뷰 전:

- [ ] ESLint 통과
- [ ] Prettier 포맷팅 적용
- [ ] 타입 체크 통과 (`npx tsc --noEmit`)
- [ ] 테스트 통과 (`npm test`)
- [ ] 주석 추가 (복잡한 로직)
- [ ] TODO 정리
- [ ] 민감 정보 제거
- [ ] console.log 제거

## 관련 문서

- **Setup**: `setup.md` - 개발 환경 설정
- **Testing**: `testing.md` - 테스트 작성
- **Debugging**: `debugging.md` - 디버깅 방법
