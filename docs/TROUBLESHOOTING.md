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

**3. Agent가 무한 루프**

```typescript
// Agent Manager에서 타임아웃 설정
const PHASE_TIMEOUT = 30 * 60 * 1000; // 30분

setTimeout(() => {
  if (agent.currentPhase === phase && !agent.phaseCompleted) {
    console.error(`Phase ${phase} timeout`);
    pauseAgent(taskId);
    notifyUser({
      type: 'warning',
      message: `Phase ${phase} is taking longer than expected. Please check logs.`,
    });
  }
}, PHASE_TIMEOUT);
```

**4. Phase 완료 신호 누락**

Sub-Agent가 `=== PHASE N COMPLETE ===`를 출력하지 않음

가이드 문서 확인:
- `/guide/[phase]/` 문서에서 완료 신호 출력 지시 확인
- Phase completion protocol 명시 확인

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
**버전**: 1.0
