# 에이전트 프로세스 관리

## 개요

Node.js `child_process` 모듈을 사용하여 Claude Code 에이전트 프로세스를 생성하고 관리하는 방법을 설명합니다.

## 프로세스 생성

### 기본 구조

```typescript
// lib/agent/executor.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export interface AgentConfig {
  taskId: string;
  taskType: 'create_app' | 'modify_app' | 'workflow' | 'custom';
  workingDir: string;
  environmentVariables?: Record<string, string>;
  claudeModel?: string;
}

export function createAgent(config: AgentConfig): ChildProcess {
  const { taskId, workingDir, environmentVariables = {}, claudeModel = 'claude-sonnet-4-5' } = config;

  // 1. 작업 디렉토리 준비
  ensureDirectoryExists(workingDir);

  // 2. 환경 변수 준비
  const env = {
    ...process.env,
    // Claude Code CLI는 자체 인증 사용 (별도 API key 불필요)
    CLAUDE_MODEL: claudeModel,
    TASK_ID: taskId,
    WORKING_DIR: workingDir,
    ...environmentVariables, // 사용자 제공 의존성
  };

  // 3. CLAUDE.md 경로 결정
  const claudeGuidePath = getClaudeGuideForTaskType(config.taskType);

  // 4. Claude Code CLI 프로세스 spawn
  const agent = spawn('claude', [
    'code',                               // Claude Code 서브커맨드
    '--yes',                              // Tool 자동 승인
    '--output-dir', workingDir,           // 출력 디렉토리
    '--context', claudeGuidePath,         // Sub-agent CLAUDE.md 로드
  ], {
    cwd: workingDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],      // stdin, stdout, stderr
  });

  // 5. 프로세스 이벤트 핸들러 등록
  setupProcessHandlers(taskId, agent);

  return agent;
}

function getClaudeGuideForTaskType(taskType: string): string {
  // Sub-agent CLAUDE.md 경로
  return path.join(process.cwd(), 'packages/sub-agent/CLAUDE.md');
}
```

### 프로세스 핸들러 설정

```typescript
// lib/agent/executor.ts
import { emitLogEvent } from './stream';
import { parseAgentOutput } from './parser';

function setupProcessHandlers(taskId: string, agent: ChildProcess) {
  // stdout 처리 (에이전트 출력)
  agent.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();

    // 1. 로그 스트리밍
    emitLogEvent(taskId, {
      type: 'log',
      data: {
        timestamp: new Date().toISOString(),
        message: output,
        level: 'info',
      },
    });

    // 2. 프로토콜 파싱
    parseAgentOutput(taskId, output);
  });

  // stderr 처리 (에러)
  agent.stderr?.on('data', (data: Buffer) => {
    const error = data.toString();

    emitLogEvent(taskId, {
      type: 'log',
      data: {
        timestamp: new Date().toISOString(),
        message: error,
        level: 'error',
      },
    });

    logError(taskId, error);
  });

  // 프로세스 종료
  agent.on('close', (code: number | null) => {
    handleAgentExit(taskId, code);
  });

  // 프로세스 에러
  agent.on('error', (error: Error) => {
    handleAgentError(taskId, error);
  });
}
```

## 프로세스 제어

### 일시 중지 (Pause)

```typescript
// lib/agent/executor.ts
export function pauseAgent(taskId: string): boolean {
  const agent = getAgentProcess(taskId);
  if (!agent || agent.killed) {
    return false;
  }

  try {
    // SIGTSTP 신호 전송 (Ctrl+Z 효과)
    agent.kill('SIGTSTP');

    updateAgentStatus(taskId, {
      status: 'paused',
      lastUpdate: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error(`Failed to pause agent ${taskId}:`, error);
    return false;
  }
}
```

### 재개 (Resume)

```typescript
// lib/agent/executor.ts
export function resumeAgent(taskId: string): boolean {
  const agent = getAgentProcess(taskId);
  if (!agent || agent.killed) {
    return false;
  }

  try {
    // SIGCONT 신호 전송 (일시 중지 해제)
    agent.kill('SIGCONT');

    updateAgentStatus(taskId, {
      status: 'running',
      lastUpdate: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error(`Failed to resume agent ${taskId}:`, error);
    return false;
  }
}
```

### 종료 (Terminate)

```typescript
// lib/agent/executor.ts
export async function terminateAgent(taskId: string, graceful: boolean = true): Promise<boolean> {
  const agent = getAgentProcess(taskId);
  if (!agent || agent.killed) {
    return true;
  }

  if (graceful) {
    // 정상 종료 시도
    try {
      agent.stdin?.write('exit\n');

      // 5초 대기
      await new Promise((resolve) => setTimeout(resolve, 5000));

      if (!agent.killed) {
        // 여전히 살아있으면 강제 종료
        agent.kill('SIGKILL');
      }
    } catch (error) {
      console.error(`Failed to gracefully terminate agent ${taskId}:`, error);
      agent.kill('SIGKILL');
    }
  } else {
    // 강제 종료
    agent.kill('SIGKILL');
  }

  // 프로세스 정리
  cleanupAgent(taskId);

  return true;
}

function cleanupAgent(taskId: string) {
  // 프로세스 맵에서 제거
  removeAgentProcess(taskId);

  // 구독 정리
  cleanupSubscribers(taskId);

  // 상태 업데이트
  updateAgentStatus(taskId, {
    status: 'completed',
    lastUpdate: new Date().toISOString(),
  });
}
```

## stdin 입력

### 초기 프롬프트 전달

```typescript
// lib/agent/executor.ts
export function startAgentTask(taskId: string, prompt: string): boolean {
  const agent = getAgentProcess(taskId);
  if (!agent || agent.killed) {
    return false;
  }

  try {
    agent.stdin?.write(prompt + '\n');

    updateAgentStatus(taskId, {
      status: 'running',
      currentAction: 'Starting task',
      lastUpdate: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error(`Failed to start agent task ${taskId}:`, error);
    return false;
  }
}
```

### 답변 전달

```typescript
// lib/agent/executor.ts
export function sendToAgent(taskId: string, message: string): boolean {
  const agent = getAgentProcess(taskId);
  if (!agent || agent.killed) {
    return false;
  }

  try {
    agent.stdin?.write(message + '\n');
    return true;
  } catch (error) {
    console.error(`Failed to send message to agent ${taskId}:`, error);
    return false;
  }
}
```

## 프로세스 모니터링

### 상태 추적

```typescript
// lib/agent/status.ts
interface AgentProcess {
  process: ChildProcess;
  config: AgentConfig;
  startedAt: Date;
  status: AgentStatus;
}

const agentProcesses = new Map<string, AgentProcess>();

export function registerAgent(taskId: string, agent: ChildProcess, config: AgentConfig) {
  agentProcesses.set(taskId, {
    process: agent,
    config,
    startedAt: new Date(),
    status: 'idle',
  });
}

export function getAgentProcess(taskId: string): ChildProcess | null {
  return agentProcesses.get(taskId)?.process || null;
}

export function removeAgentProcess(taskId: string) {
  agentProcesses.delete(taskId);
}

export function listActiveAgents(): string[] {
  return Array.from(agentProcesses.keys());
}
```

### 리소스 사용량 모니터링

```typescript
// lib/agent/monitor.ts
import pidusage from 'pidusage';

export async function getAgentResourceUsage(taskId: string): Promise<ResourceUsage | null> {
  const agent = getAgentProcess(taskId);
  if (!agent || !agent.pid) {
    return null;
  }

  try {
    const stats = await pidusage(agent.pid);

    return {
      cpu: stats.cpu,          // CPU 사용률 (%)
      memory: stats.memory,    // 메모리 사용량 (bytes)
      elapsed: stats.elapsed,  // 경과 시간 (ms)
    };
  } catch (error) {
    console.error(`Failed to get resource usage for agent ${taskId}:`, error);
    return null;
  }
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  elapsed: number;
}
```

## 에러 처리

### 프로세스 종료 처리

```typescript
// lib/agent/executor.ts
function handleAgentExit(taskId: string, code: number | null) {
  console.log(`Agent ${taskId} exited with code ${code}`);

  if (code === 0) {
    // 정상 종료
    updateAgentStatus(taskId, {
      status: 'completed',
      lastUpdate: new Date().toISOString(),
    });

    emitLogEvent(taskId, {
      type: 'complete',
      data: { success: true },
    });
  } else {
    // 비정상 종료
    updateAgentStatus(taskId, {
      status: 'failed',
      lastUpdate: new Date().toISOString(),
    });

    emitLogEvent(taskId, {
      type: 'error',
      data: { message: `Agent exited with code ${code}` },
    });
  }

  // 정리
  cleanupAgent(taskId);
}
```

### 프로세스 에러 처리

```typescript
// lib/agent/executor.ts
function handleAgentError(taskId: string, error: Error) {
  console.error(`Agent ${taskId} error:`, error);

  updateAgentStatus(taskId, {
    status: 'error',
    lastUpdate: new Date().toISOString(),
  });

  emitLogEvent(taskId, {
    type: 'error',
    data: { message: error.message },
  });

  // Checkpoint 생성 (복구 가능하도록)
  createCheckpoint(taskId, 'error', error.message);

  // 정리
  cleanupAgent(taskId);
}
```

## 보안 고려사항

### 1. 환경 변수 격리

```typescript
// 에이전트마다 독립된 환경 변수
const env = {
  ...process.env,
  // Task별 독립 변수
  TASK_ID: taskId,
  WORKING_DIR: workingDir,
  // 사용자 제공 변수 (검증 필요)
  ...validateEnvironmentVariables(environmentVariables),
};
```

### 2. 작업 디렉토리 검증

```typescript
// lib/utils/validation.ts
export function validateWorkingDirectory(dir: string, baseDir: string): boolean {
  const resolved = path.resolve(baseDir, dir);

  // Path traversal 방지
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Invalid working directory: path traversal detected');
  }

  return true;
}
```

### 3. 리소스 제한

```typescript
// 프로세스 리소스 제한 (Linux)
const agent = spawn('claude', args, {
  cwd: workingDir,
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
  // Linux에서 리소스 제한
  uid: process.getuid?.(),  // 현재 사용자로 실행
  gid: process.getgid?.(),  // 현재 그룹으로 실행
});

// 메모리 제한 (별도 모니터링 필요)
const MEMORY_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB

setInterval(async () => {
  const usage = await getAgentResourceUsage(taskId);
  if (usage && usage.memory > MEMORY_LIMIT) {
    console.warn(`Agent ${taskId} exceeds memory limit`);
    terminateAgent(taskId, false); // 강제 종료
  }
}, 10000); // 10초마다 체크
```

## API 통합

### Task 실행 API

```typescript
// app/api/tasks/[id]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAgent, startAgentTask } from '@/lib/agent/executor';
import { buildTaskPrompt } from '@/lib/agent/prompts';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  try {
    // 1. Task 조회
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 2. 에이전트 생성
    const agent = createAgent({
      taskId: task.id,
      taskType: task.type,
      workingDir: `/projects/${task.id}`,
      environmentVariables: task.environmentVariables,
    });

    // 3. 초기 프롬프트 전달
    const prompt = buildTaskPrompt(task);
    startAgentTask(taskId, prompt);

    // 4. Task 상태 업데이트
    await db.task.update({
      where: { id: taskId },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { taskId, status: 'started' },
    });
  } catch (error) {
    console.error('Failed to execute task:', error);
    return NextResponse.json(
      { error: 'Failed to execute task' },
      { status: 500 }
    );
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`protocol-parsing.md`** - 프로세스 출력 파싱 로직
2. **`../../agent-manager/docs/lifecycle/creation.md`** - 에이전트 생성 (중복 내용 동기화)
3. **`../api/tasks-api.md`** - Task 실행 API 명세
4. **`../security/path-validation.md`** - 작업 디렉토리 검증

### 이 문서를 참조하는 문서

1. **`../README.md`** - Features 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개발 가이드
3. **`sse-streaming.md`** - 프로세스 출력 스트리밍
4. **`task-management.md`** - Task 생명주기 관리

## 다음 단계

- **프로토콜 파싱**: `protocol-parsing.md` - 에이전트 출력 파싱
- **SSE 스트리밍**: `sse-streaming.md` - 실시간 로그 전송
- **에이전트 생명주기**: `../../agent-manager/docs/lifecycle/` - 상세 생명주기 관리

## 관련 문서

- **Agent Manager - Lifecycle**: `../../agent-manager/docs/lifecycle/creation.md`
- **SSE Streaming**: `sse-streaming.md`
- **Protocol Parsing**: `protocol-parsing.md`
- **Security**: `../security/path-validation.md`
