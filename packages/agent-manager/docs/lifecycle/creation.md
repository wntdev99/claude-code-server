# 에이전트 생성

## 개요

새로운 Claude Code 에이전트 프로세스를 생성하고 초기화하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 에이전트 생성을 다룹니다.
> **웹 서버의 프로세스 관리**는 `../../../claude-code-server/docs/features/process-management.md` 참조

## 생성 흐름

```
웹 서버 → 에이전트 관리자
    ↓
1. Task 정보 수신
    ↓
2. 작업 디렉토리 준비
    ↓
3. 환경 변수 구성
    ↓
4. CLAUDE.md 로드
    ↓
5. 프로세스 Spawn
    ↓
6. 핸들러 등록
    ↓
7. 상태 초기화
    ↓
8. 등록 완료
```

## 작업 디렉토리 준비

### 디렉토리 구조 생성

```typescript
// agent-manager/lib/workspace.ts
import path from 'path';
import fs from 'fs/promises';

export interface WorkspaceConfig {
  taskId: string;
  taskType: string;
  baseDir: string;
}

export async function prepareWorkspace(config: WorkspaceConfig): Promise<string> {
  const { taskId, taskType, baseDir } = config;

  // 작업 디렉토리 경로
  const workingDir = path.join(baseDir, taskId);

  try {
    // 1. 디렉토리 생성
    await fs.mkdir(workingDir, { recursive: true });

    // 2. Task 타입별 하위 디렉토리 생성
    if (taskType === 'create_app' || taskType === 'workflow') {
      await fs.mkdir(path.join(workingDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(workingDir, 'docs/planning'), { recursive: true });
      await fs.mkdir(path.join(workingDir, 'docs/design'), { recursive: true });
    }

    // 3. 로그 디렉토리
    await fs.mkdir(path.join(workingDir, '.logs'), { recursive: true });

    // 4. Checkpoint 디렉토리
    await fs.mkdir(path.join(workingDir, '.checkpoints'), { recursive: true });

    console.log(`Workspace prepared: ${workingDir}`);
    return workingDir;
  } catch (error) {
    console.error(`Failed to prepare workspace for ${taskId}:`, error);
    throw error;
  }
}
```

### 가이드 파일 복사

```typescript
// agent-manager/lib/workspace.ts
export async function setupGuideFiles(workingDir: string) {
  const guideSourceDir = path.join(process.cwd(), 'guide');
  const guideTargetDir = path.join(workingDir, 'guide');

  try {
    // guide 폴더 복사 (심볼릭 링크 또는 복사)
    await fs.symlink(guideSourceDir, guideTargetDir, 'dir');
  } catch (error) {
    // 심볼릭 링크 실패 시 복사
    await fs.cp(guideSourceDir, guideTargetDir, { recursive: true });
  }
}
```

## 환경 변수 구성

### 기본 환경 변수

```typescript
// agent-manager/lib/environment.ts
export interface EnvironmentConfig {
  taskId: string;
  taskType: string;
  workingDir: string;
  userVariables?: Record<string, string>;
}

export function buildEnvironment(config: EnvironmentConfig): Record<string, string> {
  const { taskId, taskType, workingDir, userVariables = {} } = config;

  return {
    // 시스템 환경 변수 상속
    ...process.env,

    // Claude Code CLI 설정 (자체 인증 사용, API key 불필요)
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
    CLAUDE_MAX_TOKENS: process.env.CLAUDE_MAX_TOKENS || '8000',

    // Task 정보
    TASK_ID: taskId,
    TASK_TYPE: taskType,
    WORKING_DIR: workingDir,

    // 사용자 제공 환경 변수 (검증 필요)
    ...validateAndSanitize(userVariables),

    // 에이전트 모드
    AGENT_MODE: 'autonomous',
    AUTO_ACCEPT_TOOLS: 'true',
  };
}

function validateAndSanitize(variables: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    // 1. 키 검증 (영문, 숫자, 언더스코어만)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      console.warn(`Invalid environment variable key: ${key}`);
      continue;
    }

    // 2. 민감한 시스템 변수 덮어쓰기 방지
    const protectedKeys = ['PATH', 'HOME', 'USER', 'SHELL'];
    if (protectedKeys.includes(key)) {
      console.warn(`Attempting to override protected key: ${key}`);
      continue;
    }

    // 3. 값 길이 제한
    if (value.length > 10000) {
      console.warn(`Environment variable ${key} exceeds max length`);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}
```

## CLAUDE.md 로드

### 적절한 가이드 선택

```typescript
// agent-manager/lib/guide.ts
export function getClaudeGuideForTask(taskType: string): string {
  // 모든 sub-agent는 동일한 CLAUDE.md 사용
  // Task 타입별 워크플로우는 CLAUDE.md 내에서 분기
  const guidePath = path.join(
    process.cwd(),
    'packages/sub-agent/CLAUDE.md'
  );

  return guidePath;
}
```

## 프로세스 생성

### Spawn

```typescript
// agent-manager/lib/spawner.ts
import { spawn, ChildProcess } from 'child_process';

export interface SpawnConfig {
  taskId: string;
  taskType: string;
  workingDir: string;
  environment: Record<string, string>;
  claudeGuide: string;
}

export function spawnAgent(config: SpawnConfig): ChildProcess {
  const { workingDir, environment, claudeGuide } = config;

  const agent = spawn('claude', [
    'code',                           // Claude Code 서브커맨드
    '--yes',                          // Tool 자동 승인
    '--output-dir', workingDir,       // 출력 디렉토리
    '--context', claudeGuide,         // Sub-agent CLAUDE.md
  ], {
    cwd: workingDir,
    env: environment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return agent;
}
```

## 핸들러 등록

### stdout/stderr/exit 핸들러

```typescript
// agent-manager/lib/handlers.ts
import { ChildProcess } from 'child_process';

export function registerHandlers(taskId: string, agent: ChildProcess) {
  // stdout: 에이전트 출력
  agent.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();
    handleAgentOutput(taskId, output);
  });

  // stderr: 에러 출력
  agent.stderr?.on('data', (data: Buffer) => {
    const error = data.toString();
    handleAgentError(taskId, error);
  });

  // exit: 프로세스 종료
  agent.on('close', (code: number | null) => {
    handleAgentExit(taskId, code);
  });

  // error: 프로세스 에러
  agent.on('error', (error: Error) => {
    handleProcessError(taskId, error);
  });
}

function handleAgentOutput(taskId: string, output: string) {
  // 1. 로그 저장
  saveLog(taskId, output);

  // 2. 프로토콜 파싱
  parseProtocols(taskId, output);

  // 3. 상태 업데이트
  updateStatusFromOutput(taskId, output);

  // 4. 웹 서버에 전달 (SSE)
  notifyWebServer(taskId, { type: 'log', data: output });
}
```

## 상태 초기화

### AgentState 생성

```typescript
// agent-manager/lib/state.ts
export interface AgentState {
  taskId: string;
  process: ChildProcess;
  status: AgentStatus;
  currentPhase: number | null;
  currentStep: string | null;
  progress: number;
  tokensUsed: number;
  startedAt: Date;
  lastUpdate: Date;
  workingDir: string;
}

const agentStates = new Map<string, AgentState>();

export function initializeAgentState(
  taskId: string,
  process: ChildProcess,
  workingDir: string
): AgentState {
  const state: AgentState = {
    taskId,
    process,
    status: 'idle',
    currentPhase: null,
    currentStep: null,
    progress: 0,
    tokensUsed: 0,
    startedAt: new Date(),
    lastUpdate: new Date(),
    workingDir,
  };

  agentStates.set(taskId, state);

  return state;
}

export function getAgentState(taskId: string): AgentState | null {
  return agentStates.get(taskId) || null;
}

export function updateAgentState(taskId: string, updates: Partial<AgentState>) {
  const state = agentStates.get(taskId);
  if (!state) return;

  Object.assign(state, updates, { lastUpdate: new Date() });
}

export function removeAgentState(taskId: string) {
  agentStates.delete(taskId);
}
```

## 전체 프로세스

### 통합 함수

```typescript
// agent-manager/lib/creator.ts
export interface CreateAgentRequest {
  taskId: string;
  taskType: 'create_app' | 'modify_app' | 'workflow' | 'custom';
  baseDir: string;
  environmentVariables?: Record<string, string>;
}

export async function createAgent(request: CreateAgentRequest): Promise<AgentState> {
  const { taskId, taskType, baseDir, environmentVariables } = request;

  try {
    // 1. 작업 디렉토리 준비
    const workingDir = await prepareWorkspace({
      taskId,
      taskType,
      baseDir,
    });

    // 2. 가이드 파일 설정
    await setupGuideFiles(workingDir);

    // 3. 환경 변수 구성
    const environment = buildEnvironment({
      taskId,
      taskType,
      workingDir,
      userVariables: environmentVariables,
    });

    // 4. CLAUDE.md 경로
    const claudeGuide = getClaudeGuideForTask(taskType);

    // 5. 프로세스 생성
    const agent = spawnAgent({
      taskId,
      taskType,
      workingDir,
      environment,
      claudeGuide,
    });

    // 6. 핸들러 등록
    registerHandlers(taskId, agent);

    // 7. 상태 초기화
    const state = initializeAgentState(taskId, agent, workingDir);

    // 8. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'agent_created',
      data: { taskId, status: 'idle' },
    });

    console.log(`Agent created successfully: ${taskId}`);
    return state;
  } catch (error) {
    console.error(`Failed to create agent for ${taskId}:`, error);
    throw error;
  }
}
```

## 에러 처리

### 생성 실패 처리

```typescript
// agent-manager/lib/creator.ts
export class AgentCreationError extends Error {
  constructor(
    public taskId: string,
    public reason: string,
    public originalError?: Error
  ) {
    super(`Failed to create agent ${taskId}: ${reason}`);
    this.name = 'AgentCreationError';
  }
}

export async function createAgentSafe(
  request: CreateAgentRequest
): Promise<AgentState | null> {
  try {
    return await createAgent(request);
  } catch (error) {
    // 1. 에러 로깅
    console.error('Agent creation failed:', error);

    // 2. 정리 작업
    await cleanupFailedCreation(request.taskId);

    // 3. 웹 서버에 알림
    notifyWebServer(request.taskId, {
      type: 'agent_creation_failed',
      data: {
        taskId: request.taskId,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return null;
  }
}

async function cleanupFailedCreation(taskId: string) {
  try {
    // 작업 디렉토리 정리
    const state = getAgentState(taskId);
    if (state?.workingDir) {
      await fs.rm(state.workingDir, { recursive: true, force: true });
    }

    // 상태 제거
    removeAgentState(taskId);
  } catch (error) {
    console.error(`Failed to cleanup after failed creation: ${taskId}`, error);
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`execution.md`** - 생성 후 실행 단계
2. **`../../../claude-code-server/docs/features/process-management.md`** - 웹 서버의 프로세스 관리 (중복 로직 동기화)
3. **`../../CLAUDE.md`** - 에이전트 관리자 개요
4. **`README.md`** - Lifecycle 문서 목록

### 이 문서를 참조하는 문서

1. **`../README.md`** - Lifecycle 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`execution.md`** - 에이전트 실행
4. **`../../../claude-code-server/docs/features/task-management.md`** - Task 실행

## 다음 단계

- **실행 및 제어**: `execution.md` - 에이전트 시작, 일시중지, 재개
- **프로토콜 처리**: `../protocols/` - 에이전트 출력 파싱 및 처리
- **종료**: `termination.md` - 에이전트 정리 및 종료

## 관련 문서

- **Execution**: `execution.md`
- **Protocols**: `../protocols/README.md`
- **Web Server - Process Management**: `../../../claude-code-server/docs/features/process-management.md`
- **Sub-Agent Guide**: `../../../sub-agent/CLAUDE.md`
