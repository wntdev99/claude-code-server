# Claude Code Server - Implementation Plan

## Context

Claude Code Server is a **greenfield project** currently at 0% implementation with 100% documentation complete. The project has:
- **596KB** of comprehensive technical documentation (ARCHITECTURE.md, WORKFLOWS.md, API.md, PROTOCOLS.md, etc.)
- **24 guide documents** for sub-agent execution
- **3-tier architecture** fully specified (Web Server, Agent Manager, Sub-Agent)
- **Zero source code** - no .ts/.tsx files, no package.json, no dependencies

This plan outlines the implementation strategy to build the entire system from scratch, following the documented architecture and delivering working software incrementally.

---

## Implementation Strategy

**Approach**: Bottom-up incremental development with MVP-first strategy

**Phases**: 8 phases over 16-20 weeks, each delivering working functionality

**Technology Stack**:
- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Monorepo**: pnpm workspaces
- **Real-time**: Server-Sent Events (SSE)
- **Process Management**: Node.js child_process for Claude Code CLI

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

### Goals
- Set up monorepo structure
- Configure build tooling
- Initialize database schema
- Create shared type definitions

### Deliverables

**Monorepo Setup**:
- `/package.json` - Root with pnpm workspaces
- `/pnpm-workspace.yaml` - Workspace configuration
- `/tsconfig.base.json` - Base TypeScript config

**Database Schema** (`/prisma/schema.prisma`):
```prisma
model Task {
  id              String   @id @default(cuid())
  title           String
  type            TaskType
  status          TaskStatus
  description     String
  currentPhase    Int?
  progress        Int      @default(0)
  workspace       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reviews         Review[]
  questions       Question[]
  checkpoints     Checkpoint[]
}

model Review {
  id          String       @id @default(cuid())
  taskId      String
  phase       Int
  status      ReviewStatus
  deliverables Json
  feedback    String?
  createdAt   DateTime     @default(now())
  task        Task         @relation(fields: [taskId], references: [id])
}

model Question {
  id          String   @id @default(cuid())
  taskId      String
  category    String
  question    String
  options     String[]
  answer      String?
  answeredAt  DateTime?
  createdAt   DateTime @default(now())
  task        Task     @relation(fields: [taskId], references: [id])
}

model Checkpoint {
  id        String   @id @default(cuid())
  taskId    String
  reason    String
  state     Json
  createdAt DateTime @default(now())
  task      Task     @relation(fields: [taskId], references: [id])
}

model Settings {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}

enum TaskType { create_app, modify_app, workflow, custom }
enum TaskStatus { draft, pending, in_progress, review, completed, failed }
enum ReviewStatus { pending, in_review, approved, changes_requested }
```

**Shared Types** (`/packages/shared/src/types/index.ts`):
- All TypeScript interfaces matching Prisma models
- Protocol types (USER_QUESTION, PHASE_COMPLETE, ERROR)
- Workflow types and constants

### Verification
```bash
pnpm install          # All packages install correctly
pnpm -r build         # TypeScript compiles without errors
pnpm db:migrate       # Database migrations run successfully
```

### Risk Mitigation
- Use proven pnpm workspace structure
- Test TypeScript path mapping early with simple imports

---

## Phase 2: Shared Utilities & Core Domain (Week 2-3)

### Goals
- Implement shared utilities (encryption, validation, formatting)
- Implement core domain entities (Task, Review, Question)
- Create repository interfaces with Prisma implementation

### Key Files

**Shared Utilities** (`/packages/shared/src/utils/`):
- `encryption.ts` - AES-256-CBC encryption for secrets
- `validation.ts` - Path validation, input sanitization
- `formatting.ts` - Token/cost formatting
- `constants.ts` - All constants from documentation

**Core Domain** (`/packages/core/src/`):
- `entities/Task.ts` - Task entity with business logic
- `entities/Review.ts` - Review entity
- `entities/Question.ts` - Question entity
- `repositories/TaskRepository.ts` - Interface + Prisma implementation
- `repositories/ReviewRepository.ts`
- `repositories/QuestionRepository.ts`

**Critical Implementation**:
```typescript
// packages/shared/src/utils/validation.ts
export function validatePath(filePath: string, workspaceRoot: string): boolean {
  const normalized = path.resolve(filePath);
  const root = path.resolve(workspaceRoot);

  // Prevent path traversal
  if (!normalized.startsWith(root)) {
    console.error(`Path traversal attempt: ${filePath}`);
    return false;
  }

  // Block sensitive files
  const sensitive = ['.env', 'id_rsa', 'credentials.json'];
  if (sensitive.includes(path.basename(filePath))) {
    return false;
  }

  return true;
}

// packages/shared/src/utils/encryption.ts
import crypto from 'crypto';

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encrypted: string): string {
  const [ivHex, encryptedData] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Verification
```bash
pnpm --filter shared test      # All utility tests pass
pnpm --filter core test        # Repository integration tests pass
```

---

## Phase 3: Tier 2 - Agent Manager Core (Week 3-5)

### Goals
- Implement Agent Manager process spawning
- Protocol parser for stdout/stderr
- Agent state machine
- Basic task queue

### Critical Files

**Agent Manager** (`/packages/agent-manager/src/`):
- `AgentManager.ts` - Main orchestrator (singleton)
- `AgentProcess.ts` - Wrapper for child_process
- `ProtocolParser.ts` - Parse agent stdout for protocols
- `StateMachine.ts` - Agent state transitions
- `Queue.ts` - Simple in-memory queue

**Key Implementation**:
```typescript
// AgentProcess.ts - Spawn Claude Code CLI
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class AgentProcess extends EventEmitter {
  private process: ChildProcess | null = null;

  async spawn(taskId: string, prompt: string, settings: Settings): Promise<void> {
    this.process = spawn('claude', ['chat'], {
      cwd: `/projects/${taskId}`,
      env: {
        ...process.env,
        CLAUDE_MODEL: settings.claude_model || 'claude-sonnet-4-5',
        // Optional integrations
        ...(settings.github_token && { GITHUB_TOKEN: settings.github_token }),
      }
    });

    this.process.stdout?.on('data', (data) => {
      this.emit('log', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.emit('error', data.toString());
    });

    this.process.on('exit', (code) => {
      this.emit('exit', code);
    });

    // Send initial prompt
    this.process.stdin?.write(prompt + '\n');
  }

  pause(): void {
    this.process?.kill('SIGTSTP');
  }

  resume(): void {
    this.process?.kill('SIGCONT');
  }

  terminate(): void {
    this.process?.kill('SIGTERM');
  }
}

// ProtocolParser.ts - Parse protocols from stdout
export class ProtocolParser {
  parse(output: string): Protocol | null {
    // USER_QUESTION
    const questionMatch = output.match(/\[USER_QUESTION\]([\s\S]*?)\[\/USER_QUESTION\]/);
    if (questionMatch) {
      return this.parseUserQuestion(questionMatch[1]);
    }

    // PHASE_COMPLETE
    if (output.includes('=== PHASE') && output.includes('COMPLETE ===')) {
      return this.parsePhaseComplete(output);
    }

    // ERROR
    const errorMatch = output.match(/\[ERROR\]([\s\S]*?)\[\/ERROR\]/);
    if (errorMatch) {
      return this.parseError(errorMatch[1]);
    }

    return null;
  }
}
```

### Verification
```bash
# Test agent spawning
node -e "
  const { AgentManager } = require('./packages/agent-manager/dist');
  const mgr = new AgentManager();
  mgr.executeTask('test-123').then(() => console.log('OK'));
"

# Protocol parsing tests
pnpm --filter agent-manager test
```

### Risk Mitigation
- Check Claude Code CLI installation in setup script
- Comprehensive protocol parsing tests
- Use robust process management

---

## Phase 4: Tier 1 - Web Server MVP (Week 5-8)

### Goals
- Next.js 14 App Router setup
- Basic UI (Task list, Create task, View logs)
- REST API endpoints
- SSE log streaming

### Key Files

**App Router** (`/packages/claude-code-server/app/`):
- `layout.tsx` - Root layout with providers
- `page.tsx` - Task list page
- `tasks/new/page.tsx` - Create task form
- `tasks/[id]/page.tsx` - Task detail with logs

**API Routes** (`/packages/claude-code-server/app/api/`):
- `tasks/route.ts` - GET, POST /api/tasks
- `tasks/[id]/route.ts` - GET, PATCH, DELETE
- `tasks/[id]/stream/route.ts` - SSE endpoint
- `tasks/[id]/execute/route.ts` - POST to start task

**Components** (`/packages/claude-code-server/components/`):
- `ui/` - shadcn/ui components (Button, Input, Card)
- `TaskCard.tsx` - Task list item
- `TaskForm.tsx` - Create task form
- `LogStream.tsx` - Real-time log viewer

**Critical Implementation**:
```typescript
// app/api/tasks/route.ts - Task CRUD
import { NextRequest, NextResponse } from 'next/server';
import { TaskRepository } from '@/core/repositories/TaskRepository';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['create_app', 'modify_app', 'workflow', 'custom']),
  description: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateTaskSchema.parse(body);

    const taskRepo = new TaskRepository();
    const task = await taskRepo.create(validated);

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}

// app/api/tasks/[id]/stream/route.ts - SSE streaming
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const agentManager = AgentManager.getInstance();
      const listener = (log: string) => {
        const data = `data: ${JSON.stringify({ type: 'log', content: log })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      agentManager.on(`log:${params.id}`, listener);

      req.signal.addEventListener('abort', () => {
        agentManager.off(`log:${params.id}`, listener);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// components/LogStream.tsx - Real-time log display
'use client';

export function LogStream({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs((prev) => [...prev, data.content]);
      }
    };

    return () => eventSource.close();
  }, [taskId]);

  return (
    <div className="log-container">
      {logs.map((log, i) => (
        <div key={i} className="log-line">{log}</div>
      ))}
    </div>
  );
}
```

### Verification
```bash
pnpm dev                       # Start dev server at :3000
# Open http://localhost:3000
# - Should see task list
# - Should be able to create task
# - Should see task detail page
```

---

## Phase 5: MVP Integration - "Custom" Workflow Only (Week 8-10)

### Goals
- End-to-end flow for simplest workflow (custom)
- Full integration of all 3 tiers
- Prove architecture works

### Scope
Focus on **custom workflow (Type-D)** only for MVP:
- User creates "custom" task
- Agent Manager spawns sub-agent
- Sub-agent executes autonomously (no phases)
- Logs stream to UI in real-time
- Task completes and shows result

**Minimal features**:
- ❌ No review gates (custom has no phases)
- ❌ No questions/dependencies
- ❌ No checkpoints yet
- ❌ No verification
- ✅ Basic task creation + execution + log streaming + completion

### Test Scenario
```
User Input:
- Title: "Explain how WebSockets work"
- Type: custom
- Description: "Provide a detailed explanation with examples"

Expected Flow:
1. Task created in database
2. Agent spawned with Claude Code CLI
3. Agent generates explanation
4. Logs stream to UI showing thinking process
5. Task marked complete
6. Result displayed in UI
```

### Verification
```bash
# E2E test
pnpm --filter claude-code-server e2e

# Manual test: Create custom task, watch it execute
```

### Success Criteria
- ✅ First working end-to-end demo
- ✅ All 3 tiers communicate correctly
- ✅ Logs visible in real-time
- ✅ Task completes successfully

---

## Phase 6: Phase-Based Workflows (Week 10-14)

### Goals
- Implement Phase 1-4 workflows (create_app, modify_app, workflow)
- Review gate system
- Verification system
- Deliverable collection

### Key Files

**Workflow Engine** (`/packages/agent-manager/src/`):
- `WorkflowEngine.ts` - Coordinates phase execution
- `PhaseExecutor.ts` - Executes single phase
- `DeliverableCollector.ts` - Scans workspace for files
- `VerificationAgent.ts` - Runs verification checks

**Critical Implementation**:
```typescript
// WorkflowEngine.ts - Phase execution coordinator
export class WorkflowEngine {
  async executePhase(task: Task, phase: number): Promise<void> {
    // 1. Get phase-specific prompt
    const prompt = this.getPhasePrompt(task.type, phase);

    // 2. Inject guide documents
    const guides = this.loadGuides(task.type, phase);
    const fullPrompt = `${prompt}\n\nGuides:\n${guides}`;

    // 3. Spawn agent
    const agent = new AgentProcess();
    await agent.spawn(task.id, fullPrompt, settings);

    // 4. Monitor for PHASE_COMPLETE
    agent.on('log', (log) => {
      const protocol = this.parser.parse(log);
      if (protocol?.type === 'PHASE_COMPLETE') {
        this.handlePhaseComplete(task, phase);
      }
    });
  }

  async handlePhaseComplete(task: Task, phase: number): Promise<void> {
    // 1. Pause agent
    agent.pause();

    // 2. Collect deliverables
    const deliverables = await this.collectDeliverables(task.id, phase);

    // 3. Run verification
    const result = await this.runVerification(task, phase, deliverables);

    if (!result.passed && result.attempts < 3) {
      // Auto-rework
      await this.triggerRework(task, result.feedback);
    } else {
      // 4. Create review
      await this.createReview(task, phase, deliverables, result);
    }
  }

  private loadGuides(type: TaskType, phase: number): string {
    const guideDir = this.getGuideDirectory(type, phase);
    // Read all .md files from /guide/planning/, /guide/design/, etc.
    const files = fs.readdirSync(guideDir);
    return files.map(f => fs.readFileSync(path.join(guideDir, f), 'utf-8')).join('\n\n');
  }
}

// DeliverableCollector.ts - Scan workspace for generated files
export class DeliverableCollector {
  async collect(taskId: string, phase: number): Promise<Deliverable[]> {
    const workspace = `/projects/${taskId}/`;
    const targetDir = this.getTargetDirectory(phase);

    // Phase 1: docs/planning/ (9 .md files expected)
    // Phase 2: docs/design/ (5 .md files expected)
    // Phase 3: src/ (code files)

    const files = await this.scanDirectory(path.join(workspace, targetDir));

    return files.map(file => ({
      path: file,
      content: fs.readFileSync(file, 'utf-8'),
      size: fs.statSync(file).size,
    }));
  }
}
```

### Verification
```bash
# Test create_app workflow
# 1. Create task with type=create_app
# 2. Execute Phase 1 (Planning)
# 3. Verify 9 planning docs generated
# 4. Review and approve
# 5. Execute Phase 2 (Design)
# 6. Verify 5 design docs generated
# etc.
```

---

## Phase 7: Advanced Features (Week 14-17)

### Goals
- Checkpoint system (save/restore every 10 min)
- Rate limiting handling (auto-pause/resume)
- Settings management UI
- Token usage tracking

### Key Files

**Checkpoint System** (`/packages/agent-manager/src/CheckpointManager.ts`):
```typescript
export class CheckpointManager {
  async create(task: Task, reason: string): Promise<Checkpoint> {
    const state = {
      conversationHistory: this.getConversationHistory(task.id),
      environment: this.getEnvironment(task.id),
      workspace: await this.scanWorkspace(task.id),
      currentPhase: task.currentPhase,
      progress: task.progress,
    };

    const checkpoint = await this.repo.save({
      taskId: task.id,
      reason,
      state,
    });

    // Save to filesystem
    fs.writeFileSync(
      `/projects/${task.id}/.checkpoints/checkpoint_${checkpoint.id}.json`,
      JSON.stringify(checkpoint, null, 2)
    );

    return checkpoint;
  }

  // Auto-checkpoint every 10 minutes
  startAutoCheckpoint(taskId: string): void {
    setInterval(async () => {
      const task = await this.taskRepo.findById(taskId);
      if (task.status === 'in_progress') {
        await this.create(task, 'interval');
      }
    }, 10 * 60 * 1000);
  }
}
```

**Rate Limit Detection** (`/packages/agent-manager/src/RateLimitDetector.ts`):
```typescript
export class RateLimitDetector {
  detect(error: string): RateLimitInfo | null {
    if (error.includes('rate_limit_error') || error.includes('429')) {
      const resetMatch = error.match(/reset at (\d+)/);
      return {
        detected: true,
        resetAt: resetMatch ? new Date(parseInt(resetMatch[1]) * 1000) : null,
      };
    }
    return null;
  }

  async handle(task: Task, info: RateLimitInfo): Promise<void> {
    // 1. Create checkpoint
    await this.checkpointManager.create(task, 'rate_limit');

    // 2. Pause agent
    await this.agentManager.pause(task.id);

    // 3. Schedule resume
    if (info.resetAt) {
      const delay = info.resetAt.getTime() - Date.now();
      setTimeout(() => {
        this.agentManager.resume(task.id);
      }, delay);
    }
  }
}
```

### Verification
```bash
# Test checkpoints
# 1. Start long-running task
# 2. Wait 10 minutes
# 3. Verify checkpoint created
# 4. Kill process
# 5. Verify restore from checkpoint works

# Test rate limiting (harder to test - requires hitting actual limits)
```

---

## Phase 8: Polish & Production Readiness (Week 17-20)

### Goals
- Error handling and edge cases
- Performance optimization
- Security hardening
- Deployment preparation

### Deliverables

**Error Handling**:
- Global error boundaries
- Graceful degradation for all features
- Comprehensive logging

**Security**:
- ✅ Input sanitization everywhere
- ✅ Secret encryption verified
- ✅ Path validation tests
- ✅ Rate limiting on API endpoints

**Production Checklist**:
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] API rate limiting configured
- [ ] Secrets encrypted at rest
- [ ] SSE connections stable under load
- [ ] Error monitoring setup (Sentry)
- [ ] Backup strategy for database
- [ ] CI/CD pipeline

### Deployment

**Docker Compose**:
```yaml
version: '3.8'
services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/claude_code_server
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    volumes:
      - ./projects:/app/projects
    depends_on: [db]

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: claude_code_server
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Verification
```bash
# Production readiness checks
pnpm build                     # Build succeeds
pnpm test                      # All tests pass
docker-compose up              # Runs in Docker
# Security scan
# Load testing
```

---

## Integration Architecture

### Tier 1 → Tier 2
**Method**: Direct function calls (same process)

```typescript
// Tier 1 calls Tier 2 directly
import { AgentManager } from '@/agent-manager';

const agentManager = AgentManager.getInstance();
await agentManager.executeTask(task.id);
```

**Why**: Simpler for MVP, lower latency, easier debugging

### Tier 2 → Tier 3
**Method**: Process spawning + stdout/stderr pipes

```typescript
const agent = spawn('claude', ['chat'], { cwd: workspace });
agent.stdout.on('data', (data) => {
  const protocol = parser.parse(data.toString());
});
```

### Real-time Updates
**Method**: EventEmitter + SSE

```typescript
// Tier 2 emits
agentManager.emit(`log:${taskId}`, logLine);

// Tier 1 subscribes via SSE
agentManager.on(`log:${taskId}`, (log) => {
  controller.enqueue(encodeSSE({ type: 'log', content: log }));
});
```

---

## Critical Dependencies

### Prerequisites
```bash
node --version     # v18+
pnpm --version     # v8+
claude --version   # Claude Code CLI
claude login       # Must be authenticated
```

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<32-byte-hex>
OUTPUT_DIRECTORY=/projects

# Optional
CLAUDE_MODEL=claude-sonnet-4-5
GITHUB_TOKEN=ghp_xxx
VERCEL_TOKEN=xxx
```

---

## Testing Strategy

### Unit Tests
```bash
# Shared utilities
pnpm --filter shared test

# Core domain
pnpm --filter core test
```

### Integration Tests
```bash
# Agent Manager
pnpm --filter agent-manager test
```

### E2E Tests (Playwright)
```bash
# Full user workflows
pnpm --filter claude-code-server e2e
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude CLI not installed | Check in setup script, provide install instructions |
| Protocol parsing fails | Comprehensive unit tests, fallback parsing |
| SSE connection drops | Implement reconnection logic, heartbeat |
| Process management issues | Use robust libraries, graceful shutdown |
| Rate limiting | Checkpoint system, automatic retry |

---

## Timeline Summary

**Total Duration**: 16-20 weeks (4-5 months)

- **Phase 1-2**: Foundation (Week 1-3)
- **Phase 3**: Agent Manager (Week 3-5)
- **Phase 4**: Web Server (Week 5-8)
- **Phase 5**: MVP Demo (Week 8-10) ⭐ **First working version**
- **Phase 6**: Full Workflows (Week 10-14)
- **Phase 7**: Advanced Features (Week 14-17)
- **Phase 8**: Production Ready (Week 17-20)

**Key Milestone**: Working end-to-end demo by Week 10

---

## Success Criteria

### Phase 5 MVP Success
- ✅ User can create custom task via web UI
- ✅ Agent executes and streams logs in real-time
- ✅ Task completes and result is visible
- ✅ All 3 tiers communicate correctly

### Final Success
- ✅ All 4 workflow types work (create_app, modify_app, workflow, custom)
- ✅ Review gates pause execution correctly
- ✅ Checkpoints save/restore agent state
- ✅ Rate limiting handled gracefully
- ✅ Production-ready deployment

---

## Next Steps After Plan Approval

1. **Set up development environment**
   ```bash
   mkdir claude-code-server
   cd claude-code-server
   pnpm init
   ```

2. **Create monorepo structure**
   - Initialize pnpm workspaces
   - Create package directories
   - Configure TypeScript

3. **Initialize database**
   - Set up Prisma
   - Define schema
   - Run first migration

4. **Begin Phase 1 implementation**
   - Start with shared types
   - Build incrementally
   - Test continuously
