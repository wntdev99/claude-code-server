# Troubleshooting Guide (문제 해결 가이드)

이 문서는 Claude Code Server 사용 중 발생할 수 있는 일반적인 문제와 해결 방법을 제공합니다.

---

## 📋 빠른 진단

### 문제 카테고리

| 증상 | 가능한 원인 | 섹션 |
|------|------------|------|
| Agent가 시작되지 않음 | Claude Code CLI, 권한, 환경 | [Agent 시작 문제](#agent-시작-문제) |
| Phase가 완료되지 않음 | 가이드 참조, 산출물 생성 | [Phase 완료 문제](#phase-완료-문제) |
| 검증이 계속 실패 | 산출물 품질, 플레이스홀더 | [검증 실패 문제](#검증-실패-문제) |
| 의존성이 주입되지 않음 | 환경 변수, 프로세스 재시작 | [의존성 문제](#의존성-문제) |
| SSE 연결이 끊김 | 네트워크, 프록시, 타임아웃 | [SSE 연결 문제](#sse-연결-문제) |
| Rate Limit 자주 발생 | Token 사용량, 최적화 | [Rate Limit 문제](#rate-limit-문제) |
| Checkpoint 복구 실패 | 파일 손상, 권한 | [Checkpoint 문제](#checkpoint-문제) |
| DB Lock 에러 | SQLite 동시성 | [데이터베이스 문제](#데이터베이스-문제) |

---

## Agent 시작 문제

### ❌ "Agent가 시작되지 않습니다"

#### 증상
```
Task 실행 버튼 클릭 → "Starting agent..." → 멈춤
로그: "Failed to spawn agent process"
```

#### 원인 및 해결

**1. Claude Code CLI 미설치**

```bash
# 확인
claude --version

# 에러 발생 시 설치
npm install -g @anthropic-ai/claude-code
```

**2. Claude Code CLI 미인증**

```bash
# 확인
claude login --check

# 인증
claude login
```

브라우저에서 로그인 완료 후 터미널 확인

**3. 작업 디렉토리 권한 문제**

```bash
# 확인
ls -la /projects/

# 권한 수정
chmod 755 /projects/
```

**4. Node.js 버전 불일치**

```bash
# 확인
node --version  # v18.0.0 이상 필요

# nvm 사용 시
nvm install 18
nvm use 18
```

---

### ❌ "Agent가 즉시 종료됩니다"

#### 증상
```
Agent 시작 → 1초 후 종료
상태: failed
```

#### 원인 및 해결

**1. 초기 프롬프트 에러**

```bash
# 로그 확인
cat /projects/{task-id}/.logs/agent.log | tail -20
```

프롬프트 형식 오류가 있다면 수정 필요

**2. Working directory 미존재**

```typescript
// Agent Manager에서 확인
const workspaceExists = await fs.exists(`/projects/${taskId}/`);
if (!workspaceExists) {
  await createWorkspace(taskId);
}
```

**3. 메모리 부족**

```bash
# 메모리 확인
free -h

# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

---

## Phase 완료 문제

### ❌ "Phase가 완료되지 않습니다"

#### 증상
```
Phase 1 실행 중... (30분 이상)
산출물 일부만 생성됨
=== PHASE 1 COMPLETE === 출력 안됨
```

#### 원인 및 해결

**1. 가이드 문서 읽기 실패**

```bash
# 가이드 문서 존재 확인
ls -l guide/planning/

# 권한 확인
chmod -R 644 guide/
```

**2. 산출물 생성 실패**

Sub-Agent 로그 확인:
```bash
tail -f /projects/{task-id}/.logs/agent.log | grep "ERROR"
```

파일 쓰기 권한 확인:
```bash
ls -ld /projects/{task-id}/docs/planning/
chmod 755 /projects/{task-id}/docs/planning/
```

**3. Agent가 무한 루프 또는 응답 없음 (Hang)**

**타임아웃 정책** (Phase별):

| Phase | 타임아웃 | 설명 |
|-------|---------|------|
| **Phase 1 (Planning)** | 45분 | 9개 기획 문서 생성 |
| **Phase 2 (Design)** | 60분 | 5개 설계 문서 생성 |
| **Phase 3 (Development)** | 120분 | 코드 작성 및 테스트 |
| **Phase 4 (Testing)** | 30분 | 검증 및 테스트 실행 |
| **Type-D (Custom)** | 20분 | 단일 질문/답변 |

**감지 메커니즘**:

```typescript
// Agent Manager에서 Phase별 타임아웃 설정
const PHASE_TIMEOUTS = {
  1: 45 * 60 * 1000,  // 45분
  2: 60 * 60 * 1000,  // 60분
  3: 120 * 60 * 1000, // 120분
  4: 30 * 60 * 1000,  // 30분
  custom: 20 * 60 * 1000, // 20분
};

function startPhaseTimeout(taskId: string, phase: number) {
  const timeout = PHASE_TIMEOUTS[phase] || PHASE_TIMEOUTS[1];

  const timerId = setTimeout(async () => {
    const agent = await getAgent(taskId);

    if (agent.currentPhase === phase && !agent.phaseCompleted) {
      console.error(`⏱️ Phase ${phase} timeout (${timeout / 60000} minutes)`);

      // 1. Create checkpoint
      await createCheckpoint(taskId, 'phase_timeout');

      // 2. Pause agent
      await pauseAgent(taskId);

      // 3. Notify user
      await notifyUser({
        type: 'warning',
        message: `Phase ${phase} is taking longer than expected (>${timeout / 60000} min). Agent paused. Please review logs.`,
        action: 'review_logs',
        taskId,
      });

      // 4. Log details
      await logPhaseTimeout(taskId, phase, timeout);
    }
  }, timeout);

  // Store timer ID for cleanup
  agentTimers.set(taskId, timerId);
}
```

**복구 절차**:

1. **로그 확인**: `tail -f /projects/{task-id}/.logs/agent.log`
2. **문제 진단**:
   - Agent가 멈춘 지점 확인
   - 마지막 출력 메시지 확인
   - 에러 메시지 있는지 검토
3. **수동 개입**:
   - 사용자가 로그를 검토하고 결정
   - 옵션 1: Agent 재개 (계속 실행)
   - 옵션 2: Agent 재시작 (최근 checkpoint부터)
   - 옵션 3: Task 취소 (작업 중단)

**4. Phase 완료 신호 누락**

Sub-Agent가 `=== PHASE N COMPLETE ===`를 출력하지 않음

가이드 문서 확인:
- `/guide/[phase]/` 문서에서 완료 신호 출력 지시 확인
- Phase completion protocol 명시 확인

**5. Agent가 비정상 종료 (Phase 완료 신호 없이)**

**증상**:
```
Agent 실행 중 → 갑자기 프로세스 종료
Phase N 진행 중이었으나 "=== PHASE N COMPLETE ===" 출력 없음
Task 상태가 "in_progress"에서 멈춤
```

**처리 규칙**:

```typescript
// Agent Manager에서 exit 이벤트 처리
agentProcess.on('exit', async (code, signal) => {
  const agent = await getAgent(taskId);

  if (!agent.phaseCompleted) {
    console.error(`⚠️ Agent exited without completing phase ${agent.currentPhase}`);

    // 1. Create partial checkpoint
    await createCheckpoint(taskId, 'incomplete_exit', {
      phase: agent.currentPhase,
      exitCode: code,
      signal,
      lastOutput: agent.lastOutput,
    });

    // 2. Mark as incomplete
    await updateTaskStatus(taskId, 'failed', {
      reason: 'agent_incomplete_exit',
      phase: agent.currentPhase,
      exitCode: code,
    });

    // 3. Notify user with recovery options
    await notifyUser({
      type: 'error',
      message: `Agent exited unexpectedly during Phase ${agent.currentPhase}. Checkpoint saved.`,
      actions: [
        { label: 'Resume from Checkpoint', action: 'resume' },
        { label: 'Restart Phase', action: 'restart_phase' },
        { label: 'Review Logs', action: 'view_logs' },
      ],
    });
  }
});
```

**복구 옵션**:
1. **Resume from Checkpoint**: 마지막 checkpoint부터 재개
2. **Restart Phase**: 현재 Phase를 처음부터 다시 시작
3. **Manual Intervention**: 로그를 검토하고 수동 수정 후 재개

---

## 검증 실패 문제

### ❌ "검증이 계속 실패합니다"

#### 증상
```
Phase 1 완료 → 검증 실행 → 실패
자동 재작업 3회 → 모두 실패
```

#### 원인 및 해결

**1. 파일 개수 부족**

```bash
# Phase 1 기획 문서 확인 (9개 필요)
ls -l /projects/{task-id}/docs/planning/

# 실제 개수
ls /projects/{task-id}/docs/planning/ | wc -l
```

**해결**: Sub-Agent에게 누락된 파일 생성 지시

**2. 문서 길이 부족**

검증 기준: 각 문서 ≥500자

```bash
# 각 문서 글자 수 확인
for file in /projects/{task-id}/docs/planning/*.md; do
  echo "$file: $(wc -m < "$file") characters"
done
```

**해결**: 짧은 문서를 더 상세하게 작성

**3. 플레이스홀더 존재**

```bash
# 플레이스홀더 검색
grep -r "\[TODO\]" /projects/{task-id}/docs/
grep -r "\[Insert" /projects/{task-id}/docs/
grep -r "\.\.\." /projects/{task-id}/docs/
```

**해결**: 모든 플레이스홀더를 실제 내용으로 대체

**4. 검증 Agent 에러**

```bash
# 검증 Agent 로그 확인
cat /projects/{task-id}/.logs/verification.log
```

검증 Agent 자체에 문제가 있다면 수동 검증 필요

---

## 의존성 문제

### ❌ "의존성이 주입되지 않습니다"

#### 증상
```
의존성 제공 → Agent 재개 → Agent가 환경 변수 찾지 못함
Error: OPENAI_API_KEY is not defined
```

#### 원인 및 해결

**1. 환경 변수 주입 실패**

Agent Manager 로그 확인:
```bash
grep "Environment variable injected" logs/agent-manager.log
```

주입 성공 로그가 없다면 Agent Manager 재시작

**2. Agent 프로세스 재시작 필요**

환경 변수는 프로세스 생성 시 전달됨. 기존 프로세스에는 주입 불가.

```typescript
// Agent Manager에서 처리
async function injectDependency(taskId: string, name: string, value: string) {
  // 1. Agent 종료
  await terminateAgent(taskId);

  // 2. Checkpoint 로드
  const checkpoint = await loadLatestCheckpoint(taskId);

  // 3. 새 환경 변수 추가
  const newEnv = {
    ...checkpoint.environment.variables,
    [name]: value,
  };

  // 4. Agent 재생성
  const agent = await createAgent({
    taskId,
    taskType: checkpoint.task.type,
    workingDir: checkpoint.workspace.path,
    env: newEnv, // ← 새 환경 변수
  });

  // 5. 대화 히스토리 복원
  await restoreConversationHistory(agent, checkpoint.conversationHistory);
}
```

**3. 암호화/복호화 에러**

```bash
# ENCRYPTION_KEY 확인
echo $ENCRYPTION_KEY

# 32바이트 hex 형식인지 확인 (64자)
echo -n $ENCRYPTION_KEY | wc -c  # 64 출력되어야 함
```

잘못된 경우 새 키 생성:
```bash
openssl rand -hex 32
```

---

## SSE 연결 문제

### ❌ "실시간 로그가 표시되지 않습니다"

#### 증상
```
Task 실행 → 로그 창 비어있음
브라우저 개발자 도구: "EventSource failed"
```

#### 원인 및 해결

**1. SSE 엔드포인트 연결 실패**

브라우저 개발자 도구 > Network 탭:
```
Request URL: http://localhost:3000/api/tasks/{id}/stream
Status: 404 또는 500
```

**해결**:
```bash
# API route 확인
ls -l app/api/tasks/[id]/stream/route.ts

# 서버 재시작
npm run dev
```

**2. Reverse Proxy 타임아웃**

Nginx, Apache 등 사용 시 SSE 타임아웃 설정:

```nginx
# nginx.conf
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_read_timeout 3600s;  # 1시간
    proxy_buffering off;       # 버퍼링 비활성화
}
```

**3. 브라우저 연결 제한**

```javascript
// 클라이언트에서 재연결 로직
const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

eventSource.onerror = (error) => {
  console.error('SSE error:', error);

  // 3초 후 재연결
  setTimeout(() => {
    eventSource.close();
    connectSSE(); // 재연결 함수
  }, 3000);
};
```

**4. Keep-Alive 설정**

```typescript
// SSE endpoint (route.ts)
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat (30초마다)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## Rate Limit 문제

### ❌ "Rate Limit이 자주 발생합니다"

#### 증상
```
Task 실행 중 → Rate limit 경고 → 일시중지 반복
진행이 매우 느림
```

#### 원인 및 해결

**1. Token 사용량 확인**

```bash
# Task의 Token 사용량 조회
curl http://localhost:3000/api/tasks/{id} | jq '.data.task.tokensUsed'
```

**2. Prompt 최적화**

긴 프롬프트를 짧게:
```typescript
// ❌ 비효율적
const prompt = `
Read the entire guide document below:
${guideDocument} // 10,000 characters

Now generate a planning document...
`;

// ✅ 효율적 (Prompt Caching 활용)
const prompt = `
Reference guide: /guide/planning/01_idea.md (cached)
Generate planning document...
`;
```

**3. 모델 변경**

Claude Haiku는 더 저렴하고 빠름:
```typescript
// .env
CLAUDE_MODEL=claude-haiku-4-5  // Sonnet 대신 Haiku

// Token 가격 비교:
// Haiku: $0.25 input / $1.25 output (per 1M tokens)
// Sonnet: $3.00 input / $15.00 output
```

**4. 대화 히스토리 요약**

```typescript
// 20개 이상 메시지 시 요약
if (conversationHistory.length > 20) {
  const summary = await summarizeConversation(conversationHistory.slice(0, -10));
  conversationHistory = [
    { role: 'system', content: `Summary: ${summary}` },
    ...conversationHistory.slice(-10),
  ];
}
```

---

## Checkpoint 문제

### ❌ "Checkpoint에서 복구가 실패합니다"

#### 증상
```
시스템 재시작 → "Restoring from checkpoint..." → 실패
Task가 draft 상태로 돌아감
```

#### 원인 및 해결

**1. Checkpoint 파일 손상**

```bash
# Checkpoint 파일 확인
ls -l /projects/{task-id}/.checkpoints/

# JSON 유효성 검사
cat /projects/{task-id}/.checkpoints/latest.json | jq .

# 에러 발생 시 이전 Checkpoint 사용
ls -t /projects/{task-id}/.checkpoints/*.json | head -2
```

**2. Workspace 불일치**

```typescript
// Checkpoint와 실제 Workspace 비교
const checkpoint = await loadCheckpoint(taskId);
const actualFiles = await fs.readdir(`/projects/${taskId}/docs/planning/`);

const expectedFiles = checkpoint.workspace.deliverables
  .filter(f => f.startsWith('docs/planning/'));

// 누락된 파일이 있다면 복구 불가
if (expectedFiles.length !== actualFiles.length) {
  console.error('Workspace mismatch. Cannot restore.');
}
```

**3. 환경 변수 복호화 실패**

```bash
# ENCRYPTION_KEY 확인
echo $ENCRYPTION_KEY

# 키가 변경되었다면 이전 키로 복구
ENCRYPTION_KEY=<old-key> npm run dev
```

---

## 데이터베이스 문제

### ❌ "Database is locked"

#### 증상
```
Error: database is locked
SQLite 동시 쓰기 시도
```

#### 원인 및 해결

**1. 개발 환경에서 SQLite 사용**

SQLite는 동시성 제한이 있음

**임시 해결**:
```bash
# DB 재시작
rm prisma/dev.db
npx prisma migrate dev
```

**영구 해결** (PostgreSQL 사용):
```bash
# Docker로 PostgreSQL 실행
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# .env 수정
DATABASE_URL=postgresql://postgres:password@localhost:5432/claude_tasks

# 마이그레이션
npx prisma migrate dev
```

**2. 연결 풀 설정**

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // 연결 풀 설정
  pool_size = 10
  pool_timeout = 10
}
```

---

## 포트 충돌 문제

### ❌ "Port 3000 already in use"

#### 증상
```
npm run dev → Error: listen EADDRINUSE :::3000
```

#### 해결

**1. 포트 사용 프로세스 확인 및 종료**

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**2. 다른 포트 사용**

```bash
# .env
PORT=3001

# 또는 임시로
PORT=3001 npm run dev
```

---

## 성능 문제

### ❌ "Task 실행이 매우 느립니다"

#### 원인 및 해결

**1. 로그 과다 출력**

```typescript
// Agent Manager에서 로그 레벨 조정
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // 'debug' → 'info'

if (LOG_LEVEL === 'debug') {
  console.log(output); // 상세 로그
} else {
  // 중요한 로그만
  if (output.includes('[ERROR]') || output.includes('PHASE COMPLETE')) {
    console.log(output);
  }
}
```

**2. DB 쿼리 최적화**

```typescript
// ❌ N+1 쿼리 문제
const tasks = await db.task.findMany();
for (const task of tasks) {
  const reviews = await db.review.findMany({ where: { taskId: task.id } });
}

// ✅ Join으로 해결
const tasks = await db.task.findMany({
  include: {
    reviews: true,
  },
});
```

**3. 파일 시스템 캐싱**

```typescript
// 가이드 문서 캐싱
const guideCache = new Map<string, string>();

async function readGuide(path: string): Promise<string> {
  if (guideCache.has(path)) {
    return guideCache.get(path)!;
  }

  const content = await fs.readFile(path, 'utf-8');
  guideCache.set(path, content);
  return content;
}
```

---

## Agent Crash 타입별 처리

### 개요

Agent는 다양한 이유로 비정상 종료될 수 있습니다. 각 크래시 타입에 따라 적절한 복구 전략이 필요합니다.

### Crash 타입별 처리

#### 1. OOM (Out of Memory)

**원인**: Agent 프로세스가 메모리 제한 초과

**증상**:
```
Agent process exited with code: null
Signal: SIGKILL
Error: Killed
```

**감지**:
```typescript
// packages/agent-manager/src/ProcessManager.ts

agentProcess.on('exit', (code, signal) => {
  if (signal === 'SIGKILL' && code === null) {
    console.error('🔴 Agent killed by OOM');
    this.handleOOMCrash(taskId);
  }
});
```

**복구 전략**:

```typescript
async handleOOMCrash(taskId: string): Promise<void> {
  console.log('💾 Creating emergency checkpoint before OOM recovery');

  // 1. 마지막 알려진 상태에서 Checkpoint 생성 시도
  const lastKnownState = this.agentStates.get(taskId);
  if (lastKnownState) {
    await this.checkpointManager.createEmergencyCheckpoint(taskId, lastKnownState);
  }

  // 2. 메모리 제한 증가하여 재시작
  const memoryLimit = this.getMemoryLimit(taskId);
  const newLimit = Math.min(memoryLimit * 1.5, 8192); // 최대 8GB

  console.log(`📈 Increasing memory limit: ${memoryLimit}MB → ${newLimit}MB`);

  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'failed',
      error: 'OOM - Memory limit exceeded',
      metadata: {
        crashType: 'OOM',
        previousMemoryLimit: memoryLimit,
        newMemoryLimit: newLimit,
      },
    },
  });

  // 3. 사용자에게 알림 및 재시작 옵션 제공
  await this.notificationService.send({
    type: 'agent_oom',
    taskId,
    message: `Agent ran out of memory (${memoryLimit}MB). Restart with ${newLimit}MB?`,
    actions: [
      { label: 'Restart with more memory', action: 'restart_with_increased_memory' },
      { label: 'Cancel task', action: 'cancel_task' },
    ],
  });
}
```

**예방 조치**:
```typescript
// Agent 생성 시 메모리 제한 설정
const agentProcess = spawn('claude', args, {
  env: {
    ...process.env,
    NODE_OPTIONS: `--max-old-space-size=${memoryLimitMB}`,
  },
});

// 메모리 사용량 모니터링
setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > memoryLimitMB * 0.9 * 1024 * 1024) {
    console.warn('⚠️  Agent approaching memory limit');
    this.createCheckpoint(taskId); // 사전 Checkpoint
  }
}, 30000); // 30초마다
```

#### 2. Timeout (Phase 타임아웃)

**원인**: Phase가 예상 시간을 초과하여 실행

**증상**:
```
Phase 1 running for 3 hours (expected: 30 minutes)
```

**감지**:
```typescript
export class PhaseTimeoutMonitor {
  private timeouts = new Map<string, NodeJS.Timeout>();

  startPhaseTimer(taskId: string, phase: number, timeoutMs: number): void {
    const timeout = setTimeout(() => {
      this.handlePhaseTimeout(taskId, phase);
    }, timeoutMs);

    this.timeouts.set(`${taskId}:${phase}`, timeout);
  }

  private async handlePhaseTimeout(taskId: string, phase: number): Promise<void> {
    console.warn(`⏰ Phase ${phase} timeout for task ${taskId}`);

    // 1. Agent 일시중지
    await this.pauseAgent(taskId);

    // 2. Checkpoint 생성
    await this.checkpointManager.createCheckpoint(taskId, 'phase_timeout');

    // 3. 사용자에게 알림
    await this.notificationService.send({
      type: 'phase_timeout',
      taskId,
      phase,
      message: `Phase ${phase}가 예상 시간을 초과했습니다. 계속 실행하시겠습니까?`,
      actions: [
        { label: 'Continue (extend timeout)', action: 'extend_timeout' },
        { label: 'Stop and review', action: 'stop_for_review' },
        { label: 'Cancel task', action: 'cancel_task' },
      ],
    });

    // 4. DB 업데이트
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'paused',
        metadata: {
          pauseReason: 'phase_timeout',
          phase,
          duration: Date.now() - this.getPhaseStartTime(taskId, phase),
        },
      },
    });
  }
}
```

**Phase별 타임아웃 설정**:
```typescript
const PHASE_TIMEOUTS = {
  // Phase-A (create_app)
  'create_app': {
    1: 30 * 60 * 1000,  // Phase 1 (Planning): 30분
    2: 20 * 60 * 1000,  // Phase 2 (Design): 20분
    3: 60 * 60 * 1000,  // Phase 3 (Development): 60분
    4: 15 * 60 * 1000,  // Phase 4 (Testing): 15분
  },
  // Phase-B (modify_app)
  'modify_app': {
    1: 20 * 60 * 1000,  // Phase 1 (Analysis): 20분
    2: 15 * 60 * 1000,  // Phase 2 (Planning): 15분
    3: 45 * 60 * 1000,  // Phase 3 (Implementation): 45분
    4: 15 * 60 * 1000,  // Phase 4 (Testing): 15분
  },
  // Phase-C (workflow)
  'workflow': {
    1: 15 * 60 * 1000,
    2: 15 * 60 * 1000,
    3: 30 * 60 * 1000,
    4: 10 * 60 * 1000,
  },
};

function getPhaseTimeout(taskType: string, phase: number): number {
  return PHASE_TIMEOUTS[taskType]?.[phase] || 30 * 60 * 1000; // 기본 30분
}
```

**사용자 응답 처리**:
```typescript
// API: POST /api/tasks/:id/timeout-action
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  const taskId = params.id;

  switch (action) {
    case 'extend_timeout':
      // 타임아웃 연장 (2배)
      const currentTimeout = getPhaseTimeout(task.type, task.currentPhase);
      phaseTimeoutMonitor.startPhaseTimer(taskId, task.currentPhase, currentTimeout * 2);
      await resumeAgent(taskId);
      break;

    case 'stop_for_review':
      // 현재 상태에서 리뷰 생성
      await createReviewFromCurrentState(taskId);
      break;

    case 'cancel_task':
      await cancelTask(taskId);
      break;
  }

  return Response.json({ success: true });
}
```

#### 3. SIGKILL (강제 종료)

**원인**: 시스템 또는 사용자가 프로세스 강제 종료

**증상**:
```
Agent process killed with SIGKILL
No graceful shutdown
```

**복구**:
```typescript
agentProcess.on('exit', (code, signal) => {
  if (signal === 'SIGKILL') {
    console.error('💀 Agent killed forcefully (SIGKILL)');

    // 마지막 Checkpoint에서 복구
    this.recoverFromLastCheckpoint(taskId);

    // 사용자에게 알림
    this.notifyForcefulTermination(taskId);
  }
});

async recoverFromLastCheckpoint(taskId: string): Promise<void> {
  const lastCheckpoint = await this.checkpointManager.getLatestCheckpoint(taskId);

  if (!lastCheckpoint) {
    console.error('❌ No checkpoint found for recovery');
    await this.failTask(taskId, 'No checkpoint available for recovery');
    return;
  }

  console.log(`♻️  Recovering from checkpoint: ${lastCheckpoint.id}`);

  // Checkpoint에서 복구
  await this.checkpointManager.restoreFromCheckpoint(taskId, lastCheckpoint.id);
}
```

#### 4. Segmentation Fault

**원인**: C++ 네이티브 모듈 오류 (드물지만 발생 가능)

**증상**:
```
Segmentation fault (core dumped)
```

**처리**:
```typescript
agentProcess.on('exit', (code, signal) => {
  if (signal === 'SIGSEGV') {
    console.error('💥 Segmentation fault detected');

    // 코어 덤프 수집 (디버깅용)
    this.collectCoreDump(taskId);

    // 복구 시도
    this.attemptRecovery(taskId, 'segfault');

    // 관리자에게 알림
    this.notifyAdmins({
      type: 'segfault',
      taskId,
      message: 'Critical: Segmentation fault occurred',
    });
  }
});
```

### 통합 Crash 핸들러

```typescript
export class CrashHandler {
  async handleCrash(
    taskId: string,
    exitCode: number | null,
    signal: string | null
  ): Promise<void> {
    console.error(`🔴 Agent crashed: code=${exitCode}, signal=${signal}`);

    // Crash 타입 식별
    const crashType = this.identifyCrashType(exitCode, signal);

    // Checkpoint 생성 시도
    await this.createEmergencyCheckpoint(taskId);

    // 타입별 처리
    switch (crashType) {
      case 'OOM':
        await this.handleOOMCrash(taskId);
        break;
      case 'TIMEOUT':
        await this.handleTimeoutCrash(taskId);
        break;
      case 'SIGKILL':
        await this.handleSigkillCrash(taskId);
        break;
      case 'SEGFAULT':
        await this.handleSegfaultCrash(taskId);
        break;
      default:
        await this.handleUnknownCrash(taskId, exitCode, signal);
    }

    // 통계 수집
    this.recordCrashMetrics(crashType);
  }

  private identifyCrashType(
    exitCode: number | null,
    signal: string | null
  ): string {
    if (signal === 'SIGKILL' && exitCode === null) return 'OOM';
    if (signal === 'SIGKILL') return 'SIGKILL';
    if (signal === 'SIGSEGV') return 'SEGFAULT';
    if (exitCode === 124) return 'TIMEOUT'; // timeout 명령어 사용 시
    return 'UNKNOWN';
  }
}
```

---

## 추가 도움받기

### 로그 수집

문제 보고 시 다음 로그 첨부:

```bash
# 1. Agent 로그
cat /projects/{task-id}/.logs/agent.log > logs.txt

# 2. 서버 로그
npm run dev 2>&1 | tee server.log

# 3. 시스템 정보
node --version >> logs.txt
npm --version >> logs.txt
claude --version >> logs.txt
uname -a >> logs.txt
```

### GitHub Issues

[github.com/wntdev99/claude-code-server/issues](https://github.com/wntdev99/claude-code-server/issues)

---

## 관련 문서

- **Quick Start**: `/docs/QUICK_START.md`
- **개발 가이드**: `/docs/DEVELOPMENT.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **API 문서**: `/docs/API.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.1
