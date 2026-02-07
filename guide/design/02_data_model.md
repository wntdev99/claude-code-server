# 2.2 데이터 모델 가이드

## 목적

웹 애플리케이션에서 사용하는 데이터 구조, 타입 시스템, 상태 관리 스키마를 정의하고 TypeScript 기반의 타입 안전한 데이터 모델을 설계합니다.

---

## 입력

- `result/planning/07_features.md`
- `result/design/01_screen.md`
- `form/intake_form.md`의 Section 4 (어떤 정보를 다루나요?)
  - 4.1 보여줘야 할 정보
  - 4.2 정보 출처 (API, 사용자 입력 등)
  - 4.3 기존 시스템
  - 4.4 실시간 여부
  - 4.5 데이터 규모

---

## 작업 항목

### 1. 엔티티 정의

```markdown
## 엔티티 목록

| 엔티티 | 설명 | 주요 필드 | 관계 | 저장 위치 |
|--------|------|----------|------|----------|
| Task | 자동화 작업 | id, name, type, status, prompt | 1:N Log | tasks.json |
| Project | 프로젝트 | id, name, path | 1:N Task | projects.json |
| Log | 작업 로그 | id, taskId, level, message | N:1 Task | logs/{taskId}.json |
| Schedule | 예약 작업 | id, name, cron, enabled | - | schedules.json |
| Settings | 앱 설정 | key, value | - | settings.json |
| Notification | 알림 | id, type, message, read | - | 메모리/localStorage |

### 엔티티 분류

| 분류 | 엔티티 | 설명 | 영속성 |
|------|--------|------|--------|
| **핵심 (Core)** | Task, Project | 비즈니스 핵심 | 서버 파일 |
| **지원 (Support)** | Schedule, Settings | 부가 기능 | 서버 파일 |
| **이력 (History)** | Log | 기록/감사 | 서버 파일 (분리) |
| **임시 (Transient)** | Notification | UI 상태 | 클라이언트 메모리 |

### 데이터 레이어 구분

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ React State   │  │ Zustand Store │  │ localStorage/     │   │
│  │ (Component)   │  │ (Global)      │  │ sessionStorage    │   │
│  │ - UI 상태     │  │ - tasks       │  │ - 설정 캐시       │   │
│  │ - 폼 입력     │  │ - filters     │  │ - 드래프트       │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                            │                                     │
│                     fetch / SSE                                  │
│                            │                                     │
├────────────────────────────▼────────────────────────────────────┤
│                    Server (Next.js API)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ API Route     │  │ Process State │  │ JSON File         │   │
│  │ Handler       │  │ (Memory)      │  │ Storage           │   │
│  │               │  │ - 실행 프로세스│  │ - tasks.json     │   │
│  │               │  │ - SSE 연결    │  │ - projects.json  │   │
│  │               │  │ - 경로 잠금   │  │ - logs/*.json    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```
```

### 2. 엔티티 상세 (TypeScript 인터페이스)

```markdown
## 엔티티 상세

### Task

| 필드 | 타입 | 필수 | 기본값 | 설명 | 검증 |
|------|------|------|--------|------|------|
| id | string | ✅ | nanoid() | PK | UUID/nanoid 형식 |
| name | string | ✅ | - | 작업명 | 1-100자, trim |
| type | TaskType | ✅ | - | 작업 유형 | enum 값 |
| status | TaskStatus | ✅ | 'pending' | 상태 | enum 값 |
| projectPath | string | ✅ | - | 프로젝트 경로 | 유효한 경로, 정규화 |
| prompt | string | ✅ | - | 사용자 프롬프트 | 1-10000자 |
| result | string | ❌ | null | 실행 결과 | - |
| error | string | ❌ | null | 에러 메시지 | - |
| progress | number | ❌ | 0 | 진행률 (%) | 0-100 |
| pid | number | ❌ | null | 프로세스 ID | - |
| createdAt | string | ✅ | now() | 생성일 | ISO 8601 |
| startedAt | string | ❌ | null | 시작일 | ISO 8601 |
| completedAt | string | ❌ | null | 완료일 | ISO 8601 |
| updatedAt | string | ✅ | now() | 수정일 | ISO 8601 |

**TypeScript 인터페이스**:

```typescript
// types/entities.ts

// Enum 타입 (as const 패턴으로 타입 안전성 확보)
export const TASK_TYPES = ['create_app', 'modify_project', 'scheduled', 'custom'] as const;
export type TaskType = typeof TASK_TYPES[number];

export const TASK_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

// 기본 인터페이스
export interface Task {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  projectPath: string;
  prompt: string;
  result?: string | null;
  error?: string | null;
  progress: number;
  pid?: number | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

// 생성용 타입 (Omit으로 자동 생성 필드 제외)
export type CreateTaskInput = Omit<Task, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>;

// 수정용 타입 (Partial로 선택적)
export type UpdateTaskInput = Partial<Pick<Task, 'name' | 'status' | 'result' | 'error' | 'progress'>>;

// API 응답 타입
export interface TaskResponse {
  data: Task;
}

export interface TaskListResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

### Project

| 필드 | 타입 | 필수 | 기본값 | 설명 | 검증 |
|------|------|------|--------|------|------|
| id | string | ✅ | nanoid() | PK | UUID/nanoid 형식 |
| name | string | ✅ | - | 프로젝트명 | 1-100자 |
| path | string | ✅ | - | 경로 (unique) | 유효한 경로 |
| description | string | ❌ | null | 설명 | 0-500자 |
| lastUsedAt | string | ❌ | null | 마지막 사용 | ISO 8601 |
| createdAt | string | ✅ | now() | 생성일 | ISO 8601 |

```typescript
export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt'>;
```

---

### Log

| 필드 | 타입 | 필수 | 기본값 | 설명 | 검증 |
|------|------|------|--------|------|------|
| id | string | ✅ | nanoid() | PK | UUID/nanoid 형식 |
| taskId | string | ✅ | - | FK → Task | 존재하는 task |
| level | LogLevel | ✅ | 'info' | 로그 레벨 | enum 값 |
| message | string | ✅ | - | 로그 메시지 | - |
| timestamp | string | ✅ | now() | 발생 시간 | ISO 8601 |
| metadata | object | ❌ | {} | 추가 정보 | JSON 직렬화 가능 |

```typescript
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export interface Log {
  id: string;
  taskId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// SSE 이벤트 타입
export interface LogStreamEvent {
  type: 'log' | 'status' | 'progress' | 'complete' | 'error';
  data: Log | TaskStatus | number | { result?: string; error?: string };
}
```

---

### Schedule

| 필드 | 타입 | 필수 | 기본값 | 설명 | 검증 |
|------|------|------|--------|------|------|
| id | string | ✅ | nanoid() | PK | UUID/nanoid 형식 |
| name | string | ✅ | - | 스케줄명 | 1-100자 |
| cron | string | ✅ | - | Cron 표현식 | 유효한 cron |
| taskConfig | object | ✅ | - | 작업 설정 | Task 기반 |
| enabled | boolean | ✅ | true | 활성 상태 | - |
| lastRunAt | string | ❌ | null | 마지막 실행 | ISO 8601 |
| nextRunAt | string | ❌ | null | 다음 실행 | ISO 8601 |
| createdAt | string | ✅ | now() | 생성일 | ISO 8601 |

```typescript
export interface Schedule {
  id: string;
  name: string;
  cron: string;
  taskConfig: CreateTaskInput;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
}

export type CreateScheduleInput = Omit<Schedule, 'id' | 'lastRunAt' | 'nextRunAt' | 'createdAt'>;
```

---

### Settings

| 필드 | 타입 | 필수 | 기본값 | 설명 | 검증 |
|------|------|------|--------|------|------|
| key | string | ✅ | - | 설정 키 (PK) | 영문/숫자/언더스코어 |
| value | unknown | ✅ | - | 설정 값 | JSON 직렬화 가능 |
| updatedAt | string | ✅ | now() | 수정일 | ISO 8601 |

```typescript
// 타입 안전한 설정 키
export const SETTING_KEYS = {
  theme: 'theme',
  autoScroll: 'autoScroll',
  maxConcurrentTasks: 'maxConcurrentTasks',
  taskTimeout: 'taskTimeout',
  notifications: 'notifications',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

// 설정 값 타입 매핑
export interface SettingsMap {
  theme: 'light' | 'dark' | 'system';
  autoScroll: boolean;
  maxConcurrentTasks: number;
  taskTimeout: number;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

export interface Setting<K extends SettingKey = SettingKey> {
  key: K;
  value: SettingsMap[K];
  updatedAt: string;
}

// 전체 설정
export type Settings = {
  [K in SettingKey]: SettingsMap[K];
};
```
```

### 3. 관계 다이어그램 (ERD)

```markdown
## ERD (Entity Relationship Diagram)

### 다이어그램

```
┌──────────────────────┐
│       Project        │
├──────────────────────┤
│ PK  id              │
│     name            │
│     path (unique)   │
│     description     │
│     lastUsedAt      │
│     createdAt       │
└──────────┬───────────┘
           │
           │ 1:N (프로젝트당 여러 작업 가능)
           │ (참조만, 외래키 없음)
           │
┌──────────▼───────────┐       ┌──────────────────────┐
│        Task          │       │       Schedule       │
├──────────────────────┤       ├──────────────────────┤
│ PK  id              │       │ PK  id              │
│     name            │       │     name            │
│     type            │       │     cron            │
│     status          │       │     taskConfig      │
│     projectPath ────┼───────│     enabled         │
│     prompt          │       │     lastRunAt       │
│     result          │       │     nextRunAt       │
│     error           │       │     createdAt       │
│     progress        │       └──────────────────────┘
│     pid             │
│     createdAt       │
│     startedAt       │
│     completedAt     │
│     updatedAt       │
└──────────┬───────────┘
           │
           │ 1:N (작업당 여러 로그)
           │
┌──────────▼───────────┐       ┌──────────────────────┐
│         Log          │       │       Settings       │
├──────────────────────┤       ├──────────────────────┤
│ PK  id              │       │ PK  key (unique)    │
│ FK  taskId          │       │     value           │
│     level           │       │     updatedAt       │
│     message         │       └──────────────────────┘
│     timestamp       │
│     metadata        │
└──────────────────────┘
```

### 관계 설명

| 관계 | 설명 | 제약 |
|------|------|------|
| Project → Task | 프로젝트 경로로 참조 | 소프트 참조 (경로 문자열) |
| Task → Log | 한 작업에 여러 로그 | taskId로 참조 |
| Schedule → Task | 스케줄 실행 시 Task 생성 | taskConfig 템플릿 |

### 삭제 정책

| 엔티티 | 삭제 방식 | 연관 데이터 처리 |
|--------|----------|-----------------|
| Task | Hard Delete | 로그 파일도 함께 삭제 |
| Project | Hard Delete | Task의 projectPath 유지 |
| Log | Hard Delete | Task 삭제 시 함께 |
| Schedule | Hard Delete | 생성된 Task는 유지 |
| Settings | N/A (업데이트만) | - |
```

### 4. 클라이언트 상태 관리 (Zustand)

```markdown
## 클라이언트 상태 관리

### Zustand Store 구조

```typescript
// store/taskStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Task, TaskStatus, TaskType } from '@/types/entities';

interface TaskFilter {
  status?: TaskStatus[];
  type?: TaskType[];
  search?: string;
}

interface TaskState {
  // 데이터
  tasks: Task[];
  selectedTaskId: string | null;

  // UI 상태
  isLoading: boolean;
  error: string | null;
  filter: TaskFilter;
  sort: {
    field: keyof Task;
    order: 'asc' | 'desc';
  };

  // 파생 상태 (getter)
  get filteredTasks(): Task[];
  get selectedTask(): Task | null;
  get runningTasks(): Task[];
  get stats(): { total: number; running: number; completed: number; failed: number };

  // 액션
  fetchTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  selectTask: (id: string | null) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setSort: (field: keyof Task, order?: 'asc' | 'desc') => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      tasks: [],
      selectedTaskId: null,
      isLoading: false,
      error: null,
      filter: {},
      sort: { field: 'createdAt', order: 'desc' },

      // Getter 구현
      get filteredTasks() {
        const { tasks, filter, sort } = get();
        let filtered = [...tasks];

        if (filter.status?.length) {
          filtered = filtered.filter(t => filter.status!.includes(t.status));
        }
        if (filter.type?.length) {
          filtered = filtered.filter(t => filter.type!.includes(t.type));
        }
        if (filter.search) {
          const search = filter.search.toLowerCase();
          filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(search) ||
            t.prompt.toLowerCase().includes(search)
          );
        }

        // 정렬
        filtered.sort((a, b) => {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          const order = sort.order === 'asc' ? 1 : -1;
          return aVal < bVal ? -order : aVal > bVal ? order : 0;
        });

        return filtered;
      },

      get selectedTask() {
        const { tasks, selectedTaskId } = get();
        return tasks.find(t => t.id === selectedTaskId) ?? null;
      },

      get runningTasks() {
        return get().tasks.filter(t => t.status === 'running');
      },

      get stats() {
        const { tasks } = get();
        return {
          total: tasks.length,
          running: tasks.filter(t => t.status === 'running').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          failed: tasks.filter(t => t.status === 'failed').length,
        };
      },

      // 액션 구현
      fetchTasks: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/tasks');
          if (!res.ok) throw new Error('Failed to fetch tasks');
          const { data } = await res.json();
          set({ tasks: data, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createTask: async (input) => {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error.message);
        }
        const { data: task } = await res.json();
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return task;
      },

      updateTask: async (id, input) => {
        const res = await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error('Failed to update task');
        const { data: updated } = await res.json();
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? updated : t),
        }));
      },

      deleteTask: async (id) => {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete task');
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }));
      },

      selectTask: (id) => set({ selectedTaskId: id }),
      setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
      setSort: (field, order) => set((state) => ({
        sort: { field, order: order ?? (state.sort.field === field && state.sort.order === 'asc' ? 'desc' : 'asc') },
      })),
      clearError: () => set({ error: null }),
    }),
    { name: 'task-store' }
  )
);

// 선택자 훅 (리렌더링 최적화)
export const useFilteredTasks = () => useTaskStore((state) => state.filteredTasks);
export const useSelectedTask = () => useTaskStore((state) => state.selectedTask);
export const useTaskStats = () => useTaskStore((state) => state.stats);
```

### 실시간 로그 스토어

```typescript
// store/logStore.ts
import { create } from 'zustand';
import type { Log, LogStreamEvent } from '@/types/entities';

interface LogState {
  logs: Map<string, Log[]>;
  connections: Map<string, EventSource>;

  addLog: (taskId: string, log: Log) => void;
  clearLogs: (taskId: string) => void;
  connect: (taskId: string) => void;
  disconnect: (taskId: string) => void;
  disconnectAll: () => void;
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: new Map(),
  connections: new Map(),

  addLog: (taskId, log) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const taskLogs = newLogs.get(taskId) ?? [];
      newLogs.set(taskId, [...taskLogs, log]);
      return { logs: newLogs };
    });
  },

  clearLogs: (taskId) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      newLogs.delete(taskId);
      return { logs: newLogs };
    });
  },

  connect: (taskId) => {
    const { connections } = get();
    if (connections.has(taskId)) return;

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.onmessage = (event) => {
      const data: LogStreamEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'log':
          get().addLog(taskId, data.data as Log);
          break;
        case 'complete':
        case 'error':
          get().disconnect(taskId);
          break;
      }
    };

    eventSource.onerror = () => {
      // 재연결 로직
      get().disconnect(taskId);
      setTimeout(() => get().connect(taskId), 3000);
    };

    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.set(taskId, eventSource);
      return { connections: newConnections };
    });
  },

  disconnect: (taskId) => {
    const { connections } = get();
    const eventSource = connections.get(taskId);
    if (eventSource) {
      eventSource.close();
      set((state) => {
        const newConnections = new Map(state.connections);
        newConnections.delete(taskId);
        return { connections: newConnections };
      });
    }
  },

  disconnectAll: () => {
    const { connections } = get();
    connections.forEach((es) => es.close());
    set({ connections: new Map() });
  },
}));

// 커스텀 훅
export function useTaskLogs(taskId: string) {
  const logs = useLogStore((state) => state.logs.get(taskId) ?? []);
  const connect = useLogStore((state) => state.connect);
  const disconnect = useLogStore((state) => state.disconnect);

  return { logs, connect: () => connect(taskId), disconnect: () => disconnect(taskId) };
}
```
```

### 5. 파일 기반 저장소 스키마

```markdown
## 파일 기반 저장소

### 디렉토리 구조

```
data/
├── tasks.json              # 작업 목록
├── projects.json           # 프로젝트 목록
├── schedules.json          # 스케줄 목록
├── settings.json           # 설정
├── logs/                   # 작업별 로그 (분리)
│   ├── {taskId}.json
│   └── ...
└── _meta.json              # 스키마 버전 정보
```

### JSON 스키마

#### tasks.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string", "minLength": 1, "maxLength": 100 },
          "type": { "enum": ["create_app", "modify_project", "scheduled", "custom"] },
          "status": { "enum": ["pending", "running", "completed", "failed", "cancelled"] },
          "projectPath": { "type": "string" },
          "prompt": { "type": "string", "maxLength": 10000 },
          "progress": { "type": "number", "minimum": 0, "maximum": 100 },
          "createdAt": { "type": "string", "format": "date-time" }
        },
        "required": ["id", "name", "type", "status", "projectPath", "prompt", "createdAt"]
      }
    },
    "lastUpdated": { "type": "string", "format": "date-time" }
  },
  "required": ["tasks"]
}
```

**예시 데이터**:

```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "name": "쇼핑몰 앱 생성",
      "type": "create_app",
      "status": "completed",
      "projectPath": "/Users/dev/shopping-mall",
      "prompt": "Next.js로 쇼핑몰 앱을 만들어주세요...",
      "result": "성공적으로 완료되었습니다.",
      "progress": 100,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "startedAt": "2024-01-15T10:30:01.000Z",
      "completedAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "lastUpdated": "2024-01-15T10:35:00.000Z"
}
```

#### logs/{taskId}.json

```json
{
  "taskId": "task_abc123",
  "logs": [
    {
      "id": "log_001",
      "level": "info",
      "message": "프로젝트 초기화 시작...",
      "timestamp": "2024-01-15T10:30:01.000Z"
    },
    {
      "id": "log_002",
      "level": "info",
      "message": "Next.js 프로젝트 생성 중...",
      "timestamp": "2024-01-15T10:30:05.000Z"
    }
  ]
}
```

### 저장소 유틸리티

```typescript
// lib/storage.ts
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// 제네릭 파일 읽기/쓰기
export async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 타입 안전한 저장소 함수
interface TasksFile {
  tasks: Task[];
  lastUpdated: string;
}

export async function getTasks(): Promise<Task[]> {
  const data = await readJsonFile<TasksFile>('tasks.json');
  return data?.tasks ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const tasks = await getTasks();
  return tasks.find(t => t.id === id) ?? null;
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await writeJsonFile<TasksFile>('tasks.json', {
    tasks,
    lastUpdated: new Date().toISOString(),
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const tasks = await getTasks();
  const now = new Date().toISOString();

  const task: Task = {
    ...input,
    id: nanoid(),
    status: 'pending',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };

  await saveTasks([task, ...tasks]);
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    throw new Error('Task not found');
  }

  const updated: Task = {
    ...tasks[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updated;
  await saveTasks(tasks);
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  await saveTasks(filtered);

  // 로그 파일도 삭제
  try {
    await fs.unlink(path.join(DATA_DIR, 'logs', `${id}.json`));
  } catch {
    // 로그 파일 없으면 무시
  }
}

// 로그 저장
interface LogsFile {
  taskId: string;
  logs: Log[];
}

export async function appendLog(taskId: string, log: Log): Promise<void> {
  const filename = `logs/${taskId}.json`;
  const data = await readJsonFile<LogsFile>(filename);

  const logsFile: LogsFile = data ?? { taskId, logs: [] };
  logsFile.logs.push(log);

  await writeJsonFile(filename, logsFile);
}

export async function getTaskLogs(taskId: string): Promise<Log[]> {
  const data = await readJsonFile<LogsFile>(`logs/${taskId}.json`);
  return data?.logs ?? [];
}
```
```

### 6. 데이터 검증 (Zod)

```markdown
## 데이터 검증

### Zod 스키마 정의

```typescript
// lib/validations.ts
import { z } from 'zod';
import { TASK_TYPES, TASK_STATUSES, LOG_LEVELS } from '@/types/entities';

// 재사용 가능한 스키마
const isoDateString = z.string().datetime();

// Task 스키마
export const taskTypeSchema = z.enum(TASK_TYPES);
export const taskStatusSchema = z.enum(TASK_STATUSES);

export const createTaskSchema = z.object({
  name: z.string()
    .min(1, '작업명을 입력해주세요')
    .max(100, '작업명은 100자 이내로 입력해주세요')
    .transform(s => s.trim()),
  type: taskTypeSchema,
  projectPath: z.string()
    .min(1, '프로젝트 경로를 입력해주세요')
    .refine((path) => !path.includes('..'), '올바르지 않은 경로입니다'),
  prompt: z.string()
    .min(1, '프롬프트를 입력해주세요')
    .max(10000, '프롬프트는 10000자 이내로 입력해주세요'),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()).optional(),
  status: taskStatusSchema.optional(),
  result: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
});

// Schedule 스키마
export const cronSchema = z.string().refine(
  (val) => {
    const cronRegex = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;
    return cronRegex.test(val);
  },
  { message: '올바른 Cron 표현식을 입력해주세요' }
);

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cron: cronSchema,
  taskConfig: createTaskSchema.omit({ name: true }),
  enabled: z.boolean().default(true),
});

// Query 파라미터 스키마
export const taskQuerySchema = z.object({
  status: z.string().optional().transform(s => s?.split(',').filter(Boolean)),
  type: z.string().optional().transform(s => s?.split(',').filter(Boolean)),
  search: z.string().optional(),
  sort: z.string().optional().default('-createdAt'),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// 타입 추론
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
```

### API Route에서 검증

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTaskSchema, taskQuerySchema } from '@/lib/validations';
import { createTask, getTasks } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod 검증
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값을 확인해주세요.',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      }, { status: 422 });
    }

    // 경로 존재 확인
    const pathExists = await fs.access(result.data.projectPath)
      .then(() => true)
      .catch(() => false);

    if (!pathExists) {
      return NextResponse.json({
        error: {
          code: 'PATH_NOT_FOUND',
          message: '존재하지 않는 경로입니다.',
        },
      }, { status: 400 });
    }

    const task = await createTask(result.data);
    return NextResponse.json({ data: task }, { status: 201 });

  } catch (error) {
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    }, { status: 500 });
  }
}
```

### 클라이언트 검증 (React Hook Form + Zod)

```typescript
// components/tasks/CreateTaskForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, CreateTaskInput } from '@/lib/validations';

export function CreateTaskForm({ onSubmit }: { onSubmit: (data: CreateTaskInput) => void }) {
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      name: '',
      type: 'create_app',
      projectPath: '',
      prompt: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register('name')}
        error={form.formState.errors.name?.message}
      />
      {/* ... */}
    </form>
  );
}
```
```

### 7. 마이그레이션 전략

```markdown
## 마이그레이션 전략

### 버전 관리

```typescript
// data/_meta.json
{
  "schemaVersion": "1.2.0",
  "migratedAt": "2024-01-15T00:00:00.000Z"
}
```

| 버전 | 설명 | 변경 사항 |
|------|------|----------|
| 1.0.0 | 초기 스키마 | tasks, projects, logs |
| 1.1.0 | 스케줄 추가 | schedules.json 추가 |
| 1.2.0 | 설정 확장 | settings 필드 추가, updatedAt 필드 |

### 마이그레이션 스크립트

```typescript
// scripts/migrate.ts
import { readJsonFile, writeJsonFile } from '@/lib/storage';

interface Migration {
  version: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: '1.1.0',
    up: async () => {
      const existing = await readJsonFile('schedules.json');
      if (!existing) {
        await writeJsonFile('schedules.json', { schedules: [] });
      }
    },
    down: async () => {
      // Rollback logic
    },
  },
  {
    version: '1.2.0',
    up: async () => {
      // Task에 updatedAt 필드 추가
      const tasksFile = await readJsonFile<{ tasks: any[] }>('tasks.json');
      if (tasksFile) {
        tasksFile.tasks = tasksFile.tasks.map(task => ({
          ...task,
          updatedAt: task.updatedAt ?? task.createdAt,
        }));
        await writeJsonFile('tasks.json', tasksFile);
      }
    },
    down: async () => {
      // Rollback logic
    },
  },
];

export async function runMigrations() {
  const meta = await readJsonFile<{ schemaVersion: string }>('_meta.json') ?? { schemaVersion: '1.0.0' };

  for (const migration of migrations) {
    if (compareVersions(migration.version, meta.schemaVersion) > 0) {
      console.log(`Running migration ${migration.version}...`);
      await migration.up();
      await writeJsonFile('_meta.json', {
        schemaVersion: migration.version,
        migratedAt: new Date().toISOString(),
      });
    }
  }

  console.log('Migrations complete!');
}

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}
```

### 백업 전략

```typescript
// lib/backup.ts
import fs from 'fs/promises';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const RETENTION_DAYS = 7;

export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = path.join(BACKUP_DIR, timestamp);

  await fs.mkdir(backupPath, { recursive: true });

  // 모든 JSON 파일 복사
  const files = ['tasks.json', 'projects.json', 'schedules.json', 'settings.json'];
  for (const file of files) {
    try {
      await fs.copyFile(
        path.join(process.cwd(), 'data', file),
        path.join(backupPath, file)
      );
    } catch {
      // 파일 없으면 무시
    }
  }

  return backupPath;
}

export async function cleanOldBackups(): Promise<void> {
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const backupDate = new Date(entry.name).getTime();
      if (now - backupDate > maxAge) {
        await fs.rm(path.join(BACKUP_DIR, entry.name), { recursive: true });
      }
    }
  }
}
```
```

### 8. 샘플 데이터 (시드)

```markdown
## 샘플 데이터

### 개발용 시드 데이터

```typescript
// scripts/seed.ts
import { writeJsonFile } from '@/lib/storage';
import { nanoid } from 'nanoid';

const now = new Date().toISOString();
const past = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

const seedData = {
  tasks: [
    {
      id: nanoid(),
      name: '샘플 앱 생성',
      type: 'create_app',
      status: 'completed',
      projectPath: '/tmp/sample-app',
      prompt: '간단한 Hello World 앱을 만들어주세요.',
      result: '성공적으로 완료되었습니다.',
      progress: 100,
      createdAt: past(60),
      startedAt: past(59),
      completedAt: past(55),
      updatedAt: past(55),
    },
    {
      id: nanoid(),
      name: 'API 추가',
      type: 'modify_project',
      status: 'running',
      projectPath: '/tmp/sample-app',
      prompt: 'REST API 엔드포인트를 추가해주세요.',
      progress: 45,
      createdAt: past(10),
      startedAt: past(9),
      updatedAt: past(1),
    },
    {
      id: nanoid(),
      name: '버그 수정',
      type: 'custom',
      status: 'failed',
      projectPath: '/tmp/buggy-app',
      prompt: '로그인 버그를 수정해주세요.',
      error: 'Timeout: 작업 시간 초과',
      progress: 30,
      createdAt: past(120),
      startedAt: past(119),
      completedAt: past(90),
      updatedAt: past(90),
    },
  ],
  projects: [
    {
      id: nanoid(),
      name: 'Sample App',
      path: '/tmp/sample-app',
      description: '샘플 프로젝트',
      lastUsedAt: past(10),
      createdAt: past(60),
    },
  ],
  schedules: [],
  settings: {
    theme: 'system',
    autoScroll: true,
    maxConcurrentTasks: 3,
    taskTimeout: 1800000,
    notifications: {
      enabled: true,
      sound: false,
      desktop: true,
    },
  },
};

async function seed() {
  console.log('Seeding database...');

  await writeJsonFile('tasks.json', {
    tasks: seedData.tasks,
    lastUpdated: now,
  });

  await writeJsonFile('projects.json', {
    projects: seedData.projects,
    lastUpdated: now,
  });

  await writeJsonFile('schedules.json', {
    schedules: seedData.schedules,
    lastUpdated: now,
  });

  await writeJsonFile('settings.json', seedData.settings);

  await writeJsonFile('_meta.json', {
    schemaVersion: '1.2.0',
    migratedAt: now,
  });

  console.log('Seed data created!');
}

seed().catch(console.error);
```

### package.json 스크립트

```json
{
  "scripts": {
    "seed": "tsx scripts/seed.ts",
    "migrate": "tsx scripts/migrate.ts",
    "backup": "tsx scripts/backup.ts"
  }
}
```
```

---

## 산출물 템플릿

`result/design/02_data_model.md`에 작성:

```markdown
# 데이터 모델

## 1. 엔티티 목록

| 엔티티 | 설명 | 저장 위치 |
|--------|------|----------|
| | | |

---

## 2. 엔티티 상세

### [Entity 1]

| 필드 | 타입 | 필수 | 설명 | 검증 |
|------|------|------|------|------|
| | | | | |

**TypeScript 인터페이스**:
```typescript
interface Entity {
  // ...
}
```

### [Entity 2]
[동일 형식]

---

## 3. ERD

[관계 다이어그램]

### 관계 설명
| 관계 | 설명 | 삭제 정책 |
|------|------|----------|
| | | |

---

## 4. 상태 관리 (Zustand)

```typescript
// Store 정의
```

---

## 5. 저장소 스키마

### 파일 구조
```
data/
├── tasks.json
└── ...
```

### JSON 예시
```json
{}
```

---

## 6. 검증 규칙 (Zod)

```typescript
// 스키마 정의
```

---

## 7. 마이그레이션

| 버전 | 변경 사항 |
|------|----------|
| | |

---

## 8. 샘플 데이터

[시드 데이터 예시]

---

## 다음 단계
→ 2.3 태스크 플로우
```

---

## 작성 팁

### 좋은 데이터 모델의 특징

- **타입 안전성**: TypeScript + Zod로 런타임까지 보장
- **단순함**: 필요한 필드만, 과도한 중첩 피하기
- **일관성**: 네이밍, 타입, 검증 규칙 통일
- **확장성**: 마이그레이션 가능한 구조
- **클라이언트-서버 동기화**: 동일한 타입 공유

### 피해야 할 것

- ❌ any 타입 남용
- ❌ 검증 없는 API 입력
- ❌ 일관성 없는 네이밍
- ❌ 마이그레이션 전략 없음
- ❌ 클라이언트/서버 타입 불일치

### 네이밍 컨벤션

| 항목 | 규칙 | 예시 |
|------|------|------|
| 타입/인터페이스 | PascalCase | Task, TaskStatus |
| 필드명 | camelCase | createdAt, projectPath |
| 상수 | UPPER_SNAKE | TASK_TYPES, MAX_PROMPT_LENGTH |
| 파일명 | kebab-case | tasks.json, task-store.ts |

---

## 체크리스트

- [ ] 모든 엔티티 정의됨
- [ ] TypeScript 인터페이스 작성됨
- [ ] 필드별 타입과 제약 조건 명시
- [ ] ERD (관계 다이어그램) 작성됨
- [ ] 삭제 정책 정의됨
- [ ] Zustand 스토어 설계됨
- [ ] 파일 저장소 스키마 작성됨
- [ ] Zod 검증 스키마 작성됨
- [ ] 마이그레이션 전략 수립됨
- [ ] 샘플 데이터 준비됨

---

## 다음 단계

→ `03_task_flow.md` (태스크 플로우)
