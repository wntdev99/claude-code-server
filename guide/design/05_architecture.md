# 2.5 아키텍처 가이드

## 목적

시스템 아키텍처와 프로젝트 구조를 정의하고, 확장성과 유지보수성을 고려한 기술 설계를 완성합니다.

---

## 입력

- `result/planning/08_tech.md`
- `result/design/01_screen.md` ~ `04_api.md`

---

## 작업 항목

### 1. 시스템 아키텍처

```markdown
## 시스템 아키텍처

### 전체 구조

┌─────────────────────────────────────────────────────────────────────────┐
│                              클라이언트                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                        브라우저 (React)                          │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│  │  │  대시보드   │  │  작업 상세  │  │   설정      │              │  │
│  │  │   페이지    │  │   페이지    │  │   페이지    │              │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │              Zustand Store (상태 관리)                   │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                        HTTP / SSE
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           Next.js 서버                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      API Routes (/api)                           │  │
│  │                                                                   │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │  │
│  │  │  /tasks   │  │/tasks/:id │  │/schedules │  │ /settings │    │  │
│  │  │           │  │  /stream  │  │           │  │           │    │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     비즈니스 로직 레이어                          │  │
│  │                                                                   │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │  │
│  │  │ ProcessManager│  │ TaskService   │  │ScheduleService│        │  │
│  │  │ (Claude 실행) │  │               │  │  (node-cron)  │        │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘        │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      데이터 레이어                                │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │              JSON File Storage (data/)                     │  │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │  │
│  │  │  │tasks.json│ │projects │ │schedules│ │settings │      │  │  │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                          spawn / kill
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                        Claude Code CLI                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐│
│  │                    Child Process                                    ││
│  │                                                                     ││
│  │   claude --print "프롬프트" --project "/path/to/project"           ││
│  │                                                                     ││
│  │   stdout ────▶ 로그 수집 ────▶ SSE 전송 ────▶ 클라이언트           ││
│  │   stderr ────▶ 에러 수집 ────▶ SSE 전송 ────▶ 클라이언트           ││
│  │                                                                     ││
│  └───────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 아키텍처 결정 기록 (ADR)

| 결정 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 | App Router, API Routes, SSR 지원 |
| 언어 | TypeScript | 타입 안전성, 개발 생산성 |
| 상태관리 | Zustand | 간결함, 보일러플레이트 최소화 |
| UI | Tailwind + shadcn/ui | 빠른 개발, 일관된 디자인 |
| 데이터 저장 | JSON 파일 | 단순함, 외부 DB 불필요 |
| 실시간 통신 | SSE | 단방향 스트림에 적합, WebSocket보다 단순 |
| 프로세스 관리 | Node.js child_process | Claude CLI 실행에 적합 |
| 스케줄링 | node-cron | 경량, 내장 스케줄러 |
```

### 2. 클라이언트 아키텍처

```markdown
## 클라이언트 아키텍처

### 컴포넌트 구조

┌─────────────────────────────────────────────────────────────────────────┐
│                             App (layout.tsx)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Providers                                    │  │
│  │  • ThemeProvider (다크모드)                                       │  │
│  │  • Toaster (알림)                                                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────┐  ┌────────────────────────────────────────────┐  │
│  │    Sidebar      │  │               Page Content                  │  │
│  │                 │  │                                             │  │
│  │  • Navigation   │  │  ┌───────────────────────────────────────┐ │  │
│  │  • 실행 중 작업 │  │  │           Page Components              │ │  │
│  │                 │  │  │                                        │ │  │
│  │                 │  │  │  • DashboardPage                       │ │  │
│  │                 │  │  │  • TaskDetailPage                      │ │  │
│  │                 │  │  │  • CreateTaskModal                     │ │  │
│  │                 │  │  │  • SettingsPage                        │ │  │
│  │                 │  │  │                                        │ │  │
│  │                 │  │  └───────────────────────────────────────┘ │  │
│  └─────────────────┘  └────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 상태 관리 구조

┌─────────────────────────────────────────────────────────────────────────┐
│                          Zustand Stores                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  useTaskStore                                                     │  │
│  │  ├── tasks: Task[]                                               │  │
│  │  ├── selectedTask: Task | null                                   │  │
│  │  ├── filter: TaskFilter                                          │  │
│  │  ├── isLoading: boolean                                          │  │
│  │  └── actions: fetchTasks, createTask, selectTask, ...            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  useLogStore                                                      │  │
│  │  ├── logs: Map<string, Log[]>                                    │  │
│  │  ├── connections: Map<string, EventSource>                       │  │
│  │  └── actions: connect, disconnect, addLog, ...                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  useSettingsStore                                                 │  │
│  │  ├── theme: 'light' | 'dark'                                     │  │
│  │  ├── autoScroll: boolean                                         │  │
│  │  └── actions: updateSettings, ...                                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. 디렉토리 구조

```markdown
## 디렉토리 구조

### Next.js 프로젝트

```
claude-task-platform/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # 루트 레이아웃
│   ├── page.tsx                   # 대시보드 (/)
│   ├── tasks/
│   │   ├── [id]/
│   │   │   └── page.tsx           # 작업 상세 (/tasks/:id)
│   │   └── new/
│   │       └── page.tsx           # 새 작업 (/tasks/new)
│   ├── projects/
│   │   └── page.tsx               # 프로젝트 목록
│   ├── schedules/
│   │   └── page.tsx               # 스케줄 관리
│   ├── settings/
│   │   └── page.tsx               # 설정
│   ├── api/                       # API Routes
│   │   ├── tasks/
│   │   │   ├── route.ts           # GET, POST /api/tasks
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET, PATCH, DELETE /api/tasks/:id
│   │   │       ├── stream/
│   │   │       │   └── route.ts   # GET /api/tasks/:id/stream (SSE)
│   │   │       ├── stop/
│   │   │       │   └── route.ts   # POST /api/tasks/:id/stop
│   │   │       └── logs/
│   │   │           └── route.ts   # GET /api/tasks/:id/logs
│   │   ├── projects/
│   │   │   └── route.ts
│   │   ├── schedules/
│   │   │   └── route.ts
│   │   ├── settings/
│   │   │   └── route.ts
│   │   ├── stats/
│   │   │   └── route.ts
│   │   └── validate/
│   │       └── path/
│   │           └── route.ts
│   └── globals.css
│
├── components/                    # React 컴포넌트
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageContainer.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── TaskForm.tsx
│   │   ├── LogViewer.tsx
│   │   └── StatusBadge.tsx
│   ├── projects/
│   │   └── ProjectList.tsx
│   ├── schedules/
│   │   └── ScheduleList.tsx
│   └── ui/                        # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ...
│
├── lib/                           # 유틸리티 및 서비스
│   ├── storage.ts                 # JSON 파일 저장소
│   ├── process.ts                 # Claude 프로세스 관리
│   ├── scheduler.ts               # node-cron 스케줄러
│   ├── validations.ts             # Zod 스키마
│   └── utils.ts                   # 공통 유틸리티
│
├── store/                         # Zustand 스토어
│   ├── taskStore.ts
│   ├── logStore.ts
│   └── settingsStore.ts
│
├── types/                         # TypeScript 타입
│   ├── entities.ts                # 엔티티 타입
│   └── api.ts                     # API 관련 타입
│
├── hooks/                         # 커스텀 훅
│   ├── useTaskStream.ts           # SSE 연결 훅
│   ├── useTasks.ts                # 작업 관련 훅
│   └── useDebounce.ts
│
├── data/                          # JSON 데이터 저장소
│   ├── tasks.json
│   ├── projects.json
│   ├── schedules.json
│   ├── settings.json
│   └── logs/
│       └── {taskId}.json
│
├── public/                        # 정적 파일
│
├── .env.local                     # 환경 변수
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 테스트 구조

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── storage.test.ts
│   │   └── process.test.ts
│   └── store/
│       └── taskStore.test.ts
│
├── integration/
│   └── api/
│       ├── tasks.test.ts
│       └── stream.test.ts
│
└── e2e/
    ├── dashboard.spec.ts
    └── task-flow.spec.ts
```
```

### 4. 데이터 플로우

```markdown
## 데이터 플로우

### 작업 생성 플로우

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│   User   │      │   UI     │      │   API    │      │ Storage  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ 1. 폼 입력      │                 │                 │
     │────────────────▶│                 │                 │
     │                 │                 │                 │
     │                 │ 2. 검증         │                 │
     │                 │────────────────▶│                 │
     │                 │                 │                 │
     │                 │                 │ 3. 저장         │
     │                 │                 │────────────────▶│
     │                 │                 │                 │
     │                 │                 │◀────────────────│
     │                 │                 │                 │
     │                 │ 4. Task 반환    │                 │
     │                 │◀────────────────│                 │
     │                 │                 │                 │
     │                 │ 5. Store 업데이트                 │
     │                 │────────────────▶│                 │
     │                 │                 │                 │
     │ 6. 상세 화면    │                 │                 │
     │◀────────────────│                 │                 │
```

### SSE 로그 스트리밍 플로우

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│   UI     │      │   API    │      │ Process  │      │ Claude   │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ 1. SSE 연결     │                 │                 │
     │────────────────▶│                 │                 │
     │                 │                 │                 │
     │                 │ 2. spawn        │                 │
     │                 │────────────────▶│                 │
     │                 │                 │                 │
     │                 │                 │ 3. claude 실행  │
     │                 │                 │────────────────▶│
     │                 │                 │                 │
     │                 │                 │ 4. stdout       │
     │                 │                 │◀────────────────│
     │                 │                 │                 │
     │                 │ 5. log 이벤트   │                 │
     │                 │◀────────────────│                 │
     │                 │                 │                 │
     │ 6. SSE 이벤트   │                 │                 │
     │◀────────────────│                 │                 │
     │                 │                 │                 │
     │ 7. UI 업데이트  │                 │                 │
     │                 │                 │                 │
     │   ... (반복)    │                 │                 │
     │                 │                 │                 │
     │                 │                 │ 8. exit         │
     │                 │                 │◀────────────────│
     │                 │                 │                 │
     │ 9. complete     │                 │                 │
     │◀────────────────│                 │                 │
```

### 상태 업데이트 플로우

```typescript
// 1. 사용자 액션 (컴포넌트)
function TaskCard({ task }: { task: Task }) {
  const selectTask = useTaskStore((state) => state.selectTask);

  return (
    <Card onClick={() => selectTask(task.id)}>
      {task.name}
    </Card>
  );
}

// 2. Store 액션
const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTask: null,

  selectTask: (id: string) => {
    const task = get().tasks.find(t => t.id === id);
    set({ selectedTask: task });
    // 3. Router 이동
    router.push(`/tasks/${id}`);
  },
}));

// 4. 페이지에서 상태 구독
function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = useTaskStore((state) => state.selectedTask);
  const { logs, connect } = useLogStore();

  useEffect(() => {
    if (task?.status === 'running') {
      connect(task.id);
    }
  }, [task]);

  return <TaskDetail task={task} logs={logs} />;
}
```
```

### 5. 테스트 전략

```markdown
## 테스트 전략

### 테스트 피라미드

```
          ┌───────────┐
          │    E2E    │  (10%)
          │   Tests   │
          ├───────────┤
          │Integration│  (30%)
          │   Tests   │
      ┌───┴───────────┴───┐
      │    Unit Tests     │  (60%)
      │                   │
      └───────────────────┘
```

### 테스트 범위

| 영역 | 테스트 유형 | 도구 | 커버리지 목표 |
|------|------------|------|--------------|
| 유틸리티 (lib/) | 단위 테스트 | Vitest | 90%+ |
| API Routes | 통합 테스트 | Vitest + Supertest | 80%+ |
| 컴포넌트 | 컴포넌트 테스트 | React Testing Library | 70%+ |
| 전체 플로우 | E2E 테스트 | Playwright | 핵심 플로우 |

### 테스트 예시

```typescript
// 단위 테스트 - lib/storage.ts
describe('storage', () => {
  it('should read JSON file', async () => {
    const data = await readJsonFile('tasks.json');
    expect(data).toHaveProperty('tasks');
  });

  it('should write JSON file', async () => {
    await writeJsonFile('test.json', { test: true });
    const data = await readJsonFile('test.json');
    expect(data).toEqual({ test: true });
  });
});

// 통합 테스트 - API
describe('POST /api/tasks', () => {
  it('should create a task', async () => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Task',
        type: 'create_app',
        projectPath: '/tmp/test',
        prompt: 'Create a test app',
      }),
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.name).toBe('Test Task');
  });
});

// E2E 테스트
test('task creation flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=새 작업');
  await page.fill('[name=name]', '테스트 작업');
  await page.fill('[name=prompt]', '테스트 프롬프트');
  await page.click('text=시작');

  await expect(page).toHaveURL(/\/tasks\/[\w-]+/);
  await expect(page.locator('.status')).toContainText('실행 중');
});
```
```

### 6. 보안 아키텍처

```markdown
## 보안 아키텍처

### 보안 고려사항

| 영역 | 위험 | 대응 |
|------|------|------|
| **입력 검증** | 악의적 입력 | Zod 스키마 검증 |
| **경로 검증** | Path Traversal | 경로 정규화, 허용 목록 |
| **프로세스** | Command Injection | 인자 이스케이프, 환경 분리 |
| **파일 저장** | 민감 정보 노출 | .gitignore, 권한 제한 |

### 입력 검증

```typescript
// 경로 검증
function validatePath(path: string): boolean {
  // 정규화
  const normalized = path.normalize(path);

  // 허용된 기본 경로 확인
  const allowedBases = ['/Users', '/home', '/tmp'];
  const isAllowed = allowedBases.some(base => normalized.startsWith(base));

  // Path traversal 방지
  const hasTraversal = normalized.includes('..');

  return isAllowed && !hasTraversal && fs.existsSync(normalized);
}
```

### 프로세스 격리

```typescript
// 안전한 프로세스 실행
function spawnClaude(prompt: string, projectPath: string) {
  // 환경 변수 제한
  const safeEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    CLAUDE_AUTO_ACCEPT: 'true',
  };

  // 인자 이스케이프 (child_process가 자동 처리)
  return spawn('claude', ['--print', prompt, '--project', projectPath], {
    env: safeEnv,
    cwd: projectPath,
    timeout: 30 * 60 * 1000, // 30분 타임아웃
  });
}
```
```

### 7. 배포 아키텍처

```markdown
## 배포 아키텍처

### 로컬 실행 (기본)

```
┌─────────────────────────────────────────┐
│           Local Machine                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Next.js Dev Server         │ │
│  │        localhost:3000             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Claude Code CLI            │ │
│  │        (설치 필요)                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        data/ (JSON 파일)          │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 환경 설정

```bash
# .env.local
NODE_ENV=development

# 데이터 저장 경로
DATA_DIR=./data

# 동시 실행 제한
MAX_CONCURRENT_TASKS=3

# 작업 타임아웃 (밀리초)
TASK_TIMEOUT=1800000
```

### 시작 스크립트

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### 요구사항

| 항목 | 요구 사항 |
|------|----------|
| Node.js | 18.x 이상 |
| Claude Code | 최신 버전 설치 |
| OS | macOS, Linux, Windows (WSL) |
| 메모리 | 4GB 이상 권장 |
```

---

## 산출물 템플릿

`result/design/05_architecture.md`에 작성:

```markdown
# 아키텍처

## 1. 시스템 아키텍처

[시스템 다이어그램]

### 구성 요소
| 구성 요소 | 기술 | 역할 |
|----------|------|------|
| 클라이언트 | React, Zustand | UI, 상태 관리 |
| 서버 | Next.js | API, SSE |
| 저장소 | JSON 파일 | 데이터 영속화 |
| 프로세스 | child_process | Claude 실행 |

### ADR (결정 기록)
| 결정 | 선택 | 이유 |
|------|------|------|
| | | |

---

## 2. 클라이언트 아키텍처

### 컴포넌트 구조
[컴포넌트 다이어그램]

### 상태 관리
[Store 구조]

---

## 3. 디렉토리 구조

```
project/
├── app/
├── components/
├── lib/
├── store/
└── data/
```

---

## 4. 데이터 플로우

[데이터 흐름 다이어그램]

---

## 5. 테스트 전략

| 유형 | 범위 | 도구 |
|------|------|------|
| 단위 | lib, store | Vitest |
| 통합 | API | Vitest |
| E2E | 플로우 | Playwright |

---

## 6. 보안

| 영역 | 대응 |
|------|------|
| 입력 검증 | Zod |
| 경로 검증 | 정규화 |

---

## 7. 배포

### 환경
| 환경 | 설명 |
|------|------|
| 로컬 | localhost:3000 |

---

## 다음 단계
→ 설계 검토 요청
→ 승인 후 Phase 3: 개발 진행
```

---

## 작성 팁

### 좋은 아키텍처의 특징

- **명확한 책임**: 각 레이어/모듈의 역할이 명확
- **단순함**: 불필요한 복잡성 제거
- **확장성**: 새 기능 추가가 쉬움
- **테스트 용이**: 각 부분을 독립적으로 테스트 가능

### 피해야 할 것

- ❌ 과도한 추상화
- ❌ 불필요한 레이어
- ❌ 순환 의존성
- ❌ 하드코딩된 설정값

### 디렉토리 구조 원칙

1. **기능별 그룹화**: 관련 파일을 함께
2. **명확한 네이밍**: 역할이 드러나는 이름
3. **적절한 깊이**: 너무 깊지 않게
4. **일관성**: 동일한 패턴 반복

---

## 체크리스트

- [ ] 시스템 아키텍처 다이어그램 완성
- [ ] 클라이언트 아키텍처 정의됨
- [ ] 디렉토리 구조 확정됨
- [ ] 데이터 플로우 명시됨
- [ ] 테스트 전략 수립됨
- [ ] 보안 고려사항 정의됨
- [ ] 배포 방식 정의됨

---

## 설계 완료

이 문서를 마지막으로 **Phase 2: 설계**가 완료됩니다.

### 다음 단계
1. `status.md` 업데이트 (설계 완료, 검토 대기)
2. 모든 설계 문서를 사람에게 제출
3. **검토 가이드**: `guide/review/01_review_gate.md` 참조
4. 승인 시 → Phase 3: 개발 진행
5. 수정 요청 시 → 해당 문서 수정
