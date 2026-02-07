# 디버깅

## 개요

Claude Code Server 개발 중 발생하는 문제를 디버깅하는 방법을 설명합니다.

## 일반적인 문제 해결

### 1. 서버가 시작되지 않음

**증상**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결**:
```bash
# 포트 사용 중인 프로세스 찾기
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### 2. 데이터베이스 연결 오류

**증상**:
```
PrismaClientInitializationError: Can't reach database server
```

**해결**:
```bash
# DATABASE_URL 확인
echo $DATABASE_URL

# SQLite 파일 권한 확인
ls -la prisma/dev.db

# 데이터베이스 리셋
rm prisma/dev.db
npx prisma migrate dev
```

### 3. Claude Code CLI 인증 오류

**증상**:
```
Error: Claude CLI not authenticated
```

**해결**:
```bash
# 인증 상태 확인
claude auth status

# 재인증
claude login

# 환경 변수 확인
echo $CLAUDE_API_KEY  # (비어있어야 함 - CLI가 자체 관리)
```

### 4. 에이전트 프로세스가 시작되지 않음

**증상**:
```
Failed to spawn agent process
```

**해결**:
```bash
# Claude CLI 설치 확인
which claude
claude --version

# 작업 디렉토리 권한 확인
ls -la /tmp/claude-projects

# 디렉토리 생성
mkdir -p /tmp/claude-projects
chmod 755 /tmp/claude-projects
```

## 로깅

### 서버 로그

```typescript
// lib/utils/logger.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export function log(level: LogLevel, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${level.toUpperCase()}] ${timestamp} - ${message}`, meta || '');
}

// 사용
log(LogLevel.INFO, 'Server started', { port: 3000 });
log(LogLevel.ERROR, 'Failed to create agent', { taskId, error });
```

### 에이전트 로그

```typescript
// lib/agent/executor.ts
export function createAgent(config: AgentConfig) {
  const agent = spawn('claude', args, options);

  // stdout 로깅
  agent.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[AGENT ${config.taskId}] ${output}`);

    // 파일에도 저장
    fs.appendFileSync(
      `/tmp/claude-projects/${config.taskId}/agent.log`,
      output
    );
  });

  // stderr 로깅
  agent.stderr?.on('data', (data) => {
    const error = data.toString();
    console.error(`[AGENT ${config.taskId} ERROR] ${error}`);
  });

  return agent;
}
```

### 구조화된 로깅

```typescript
// lib/utils/structured-logger.ts
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: {
    taskId?: string;
    userId?: string;
    requestId?: string;
  };
  metadata?: any;
}

export function logStructured(entry: Omit<LogEntry, 'timestamp'>) {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(fullEntry));
}

// 사용
logStructured({
  level: 'info',
  message: 'Task created',
  context: { taskId: 'task_123', userId: 'user_456' },
  metadata: { type: 'create_app' },
});
```

## 디버거 사용

### VS Code 디버거 설정

**`.vscode/launch.json`**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

### 브레이크포인트 사용

```typescript
// API route에서 디버깅
export async function POST(request: NextRequest) {
  const body = await request.json();

  // 여기에 브레이크포인트 설정
  debugger; // 또는 VS Code에서 라인 클릭

  const task = await createTask(body);
  return NextResponse.json({ task });
}
```

### 조건부 브레이크포인트

VS Code에서:
1. 브레이크포인트 우클릭
2. "Edit Breakpoint..."
3. 조건 입력: `taskId === 'task_123'`

## Chrome DevTools

### Next.js 디버깅

```bash
# Node.js 디버그 모드로 실행
NODE_OPTIONS='--inspect' npm run dev
```

Chrome에서:
1. `chrome://inspect` 접속
2. "Open dedicated DevTools for Node" 클릭
3. Sources 탭에서 파일 열기
4. 브레이크포인트 설정

### React DevTools

```bash
# React DevTools 확장 설치
# Chrome Web Store에서 "React Developer Tools" 검색 및 설치
```

사용:
1. 브라우저에서 페이지 열기
2. F12 (개발자 도구)
3. "Components" 또는 "Profiler" 탭

## 성능 프로파일링

### Node.js 프로파일링

```bash
# CPU 프로파일링
node --prof dist/server.js

# 프로파일 분석
node --prof-process isolate-*.log > processed.txt
```

### React 프로파일링

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

## 네트워크 디버깅

### API 요청 로깅

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const start = Date.now();

  const response = NextResponse.next();

  const duration = Date.now() - start;
  console.log(`${request.method} ${request.url} - ${duration}ms`);

  return response;
}
```

### SSE 디버깅

```typescript
// lib/sse/debug.ts
export function debugSSE(taskId: string) {
  const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

  eventSource.onopen = () => {
    console.log('[SSE] Connection opened');
  };

  eventSource.onmessage = (event) => {
    console.log('[SSE] Message received:', event.data);
  };

  eventSource.onerror = (error) => {
    console.error('[SSE] Error:', error);
  };

  return eventSource;
}
```

## 데이터베이스 디버깅

### Prisma 쿼리 로깅

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// 쿼리 로깅
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
});

export default prisma;
```

### Prisma Studio

```bash
# GUI로 데이터베이스 확인
npx prisma studio
```

## 에러 추적

### 에러 바운더리

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);

    // 에러 리포팅 서비스에 전송
    // reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 글로벌 에러 핸들러

```typescript
// lib/error-handler.ts
export function setupGlobalErrorHandlers() {
  // Unhandled Promise Rejection
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Uncaught Exception
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);

    // 프로세스 종료 전 정리
    gracefulShutdown();
  });
}

function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  // DB 연결 종료
  prisma.$disconnect();

  // 서버 종료
  process.exit(1);
}
```

## 메모리 누수 디버깅

### 힙 스냅샷

```bash
# 힙 스냅샷 생성
node --expose-gc --inspect dist/server.js
```

Chrome DevTools에서:
1. Memory 탭
2. "Take heap snapshot"
3. 시간 경과 후 다시 스냅샷
4. 비교 분석

### 메모리 모니터링

```typescript
// lib/monitoring/memory.ts
export function monitorMemory() {
  setInterval(() => {
    const usage = process.memoryUsage();

    console.log({
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
  }, 60000); // 1분마다
}
```

## 원격 디버깅

### SSH를 통한 원격 디버깅

```bash
# 서버에서 디버그 모드로 실행
NODE_OPTIONS='--inspect=0.0.0.0:9229' npm start

# 로컬에서 포트 포워딩
ssh -L 9229:localhost:9229 user@server

# Chrome DevTools 연결
chrome://inspect
```

## 디버깅 체크리스트

문제 발생 시:

- [ ] 에러 메시지 전체 확인
- [ ] 스택 트레이스 분석
- [ ] 로그 파일 확인
- [ ] 환경 변수 확인
- [ ] 데이터베이스 상태 확인
- [ ] 네트워크 요청 확인
- [ ] 브라우저 콘솔 확인
- [ ] 서버 콘솔 확인
- [ ] 최근 코드 변경 사항 리뷰
- [ ] 의존성 버전 확인

## 유용한 도구

### 1. 로그 뷰어

```bash
# 실시간 로그 모니터링
tail -f logs/app.log

# 에러만 필터링
tail -f logs/app.log | grep ERROR

# 특정 Task 로그
tail -f logs/app.log | grep task_123
```

### 2. curl을 이용한 API 테스트

```bash
# Task 생성
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Debug Task",
    "type": "custom",
    "description": "Testing API"
  }'

# Task 조회
curl http://localhost:3000/api/tasks/task_123

# SSE 연결 테스트
curl -N http://localhost:3000/api/tasks/task_123/stream
```

### 3. 데이터베이스 쿼리

```bash
# SQLite CLI
sqlite3 prisma/dev.db

# 테이블 목록
.tables

# 쿼리 실행
SELECT * FROM tasks WHERE id = 'task_123';
```

## 관련 문서

- **Setup**: `setup.md` - 개발 환경 설정
- **Testing**: `testing.md` - 테스트 작성
- **Conventions**: `conventions.md` - 코딩 규칙
- **Monitoring**: `../features/monitoring.md`
