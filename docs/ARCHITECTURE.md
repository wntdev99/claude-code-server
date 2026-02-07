# System Architecture

## Overview

Claude Code Server is a web-based agent management system built on a **3-tier architecture** that transforms Claude Code CLI into a platform where users can submit tasks via browser and have Claude Code agents execute them automatically with comprehensive progress tracking and user interaction.

## 3-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│                      (Web Browser)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/SSE
┌────────────────────────────▼────────────────────────────────────┐
│                    TIER 1: WEB SERVER                           │
│                  (claude-code-server)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js Application (App Router)                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  UI Pages  │  │ API Routes │  │ SSE Stream │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │                                                           │  │
│  │  Features:                                                │  │
│  │  - Task CRUD operations                                  │  │
│  │  - Real-time log streaming (SSE)                         │  │
│  │  - Review UI (approve/reject)                            │  │
│  │  - Dependency provision interface                        │  │
│  │  - User question response interface                      │  │
│  │  - Settings management                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Process Spawning & IPC
┌────────────────────────────▼────────────────────────────────────┐
│                  TIER 2: AGENT MANAGER                          │
│                    (agent-manager)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent Orchestration Engine                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │Lifecycle │  │  Queue   │  │ Protocol │  │ Token   │ │  │
│  │  │  Mgmt    │  │  Mgmt    │  │  Parser  │  │ Tracker │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  │                                                           │  │
│  │  Responsibilities:                                        │  │
│  │  - Spawn/manage Claude Code processes                    │  │
│  │  - Assign work to sub-agents                             │  │
│  │  - Parse agent output for protocols                      │  │
│  │  - Track state & progress                                │  │
│  │  - Handle rate limits & checkpoints                      │  │
│  │  - Manage task queue                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Task Assignment & Monitoring
┌────────────────────────────▼────────────────────────────────────┐
│                  TIER 3: SUB-AGENT                              │
│                     (sub-agent)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Claude Code Agent Instances                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │   Planning   │  │    Design    │  │  Development  │  │  │
│  │  │   Executor   │  │   Executor   │  │   Executor    │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │  │
│  │                                                           │  │
│  │  Responsibilities:                                        │  │
│  │  - Execute tasks following phase workflows               │  │
│  │  - Reference guide documents                             │  │
│  │  - Generate deliverables (docs + code)                   │  │
│  │  - Communicate via protocols                             │  │
│  │  - Make autonomous decisions                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Reads: /guide/* (24 guide documents)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Task Creation & Execution

```
User (Browser)
    │
    │ POST /api/tasks { title, type, description }
    ↓
Web Server (claude-code-server)
    │ 1. Validate input
    │ 2. Save to database
    │ 3. Notify agent manager
    ↓
Agent Manager
    │ 1. Add to queue
    │ 2. When ready, spawn Claude Code process
    │ 3. Send initial prompt to sub-agent
    ↓
Sub-Agent (Claude Code)
    │ 1. Read guide documents
    │ 2. Execute phase-based workflow
    │ 3. Generate deliverables
    │ 4. Output logs and protocol messages
    ↑
Agent Manager
    │ 1. Parse output
    │ 2. Detect protocols (dependencies, questions, completion)
    │ 3. Update status
    │ 4. Forward events to web server
    ↑
Web Server
    │ 1. Stream events to user (SSE)
    │ 2. Display in UI
    ↑
User (Browser)
    │ Views real-time logs and progress
```

### 2. Dependency Request Flow

```
Sub-Agent
    │ Output: [DEPENDENCY_REQUEST]...[/DEPENDENCY_REQUEST]
    ↓
Agent Manager
    │ 1. Parse dependency request
    │ 2. Pause agent (SIGTSTP)
    │ 3. Create checkpoint
    │ 4. Notify web server
    ↓
Web Server
    │ 1. Store dependency request
    │ 2. Send SSE event to user
    │ 3. Display dependency form
    ↓
User (Browser)
    │ 1. See dependency request
    │ 2. Provide value (e.g., API key)
    │ 3. POST /api/dependencies/{id}/provide
    ↓
Web Server
    │ 1. Encrypt and store value
    │ 2. Notify agent manager
    ↓
Agent Manager
    │ 1. Inject dependency into agent env
    │ 2. Resume agent (SIGCONT)
    ↓
Sub-Agent
    │ Continues execution with dependency available
```

### 3. Phase Completion & Review Flow

```
Sub-Agent
    │ Output: === PHASE 1 COMPLETE ===
    ↓
Agent Manager
    │ 1. Parse completion signal
    │ 2. Pause agent
    │ 3. Create review
    │ 4. Notify web server
    ↓
Web Server
    │ 1. Collect deliverables
    │ 2. Create review record
    │ 3. Send SSE event
    │ 4. Display review UI
    ↓
User (Browser)
    │ 1. Review deliverables
    │ 2. Approve or request changes
    │ 3. PATCH /api/reviews/{id}/approve
    ↓
Web Server
    │ 1. Update review status
    │ 2. Notify agent manager
    ↓
Agent Manager
    │ 1. If approved: resume agent with next phase prompt
    │ 2. If changes: resume agent with feedback
    ↓
Sub-Agent
    │ Continues to next phase or reworks current phase
```

## Data Flow Architecture

### Event-Driven Architecture

The platform uses an **event-sourcing** approach for state management:

```
Domain Event → Event Store → State Reconstruction
```

**Domain Events**:
- `TaskCreated`
- `TaskStarted`
- `PhaseStarted`
- `PhaseCompleted`
- `ReviewCreated`
- `ReviewApproved`
- `DependencyRequested`
- `DependencyProvided`
- `QuestionAsked`
- `QuestionAnswered`
- `TaskCompleted`
- `TaskFailed`

**Benefits**:
1. **Audit Trail**: Complete history of all state changes
2. **Time Travel**: Reconstruct state at any point in time
3. **Debugging**: Replay events to reproduce issues
4. **Analytics**: Analyze patterns and trends

### State Storage

```
┌─────────────────────────────────────────┐
│         Database Layer                  │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ Events Table │  │ Snapshots Table│  │
│  └──────────────┘  └────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Tables:                         │  │
│  │  - tasks                         │  │
│  │  - phases                        │  │
│  │  - reviews                       │  │
│  │  - dependencies                  │  │
│  │  - questions                     │  │
│  │  - checkpoints                   │  │
│  │  - events                        │  │
│  │  - usage_metrics                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Development**: SQLite (embedded)
**Production**: PostgreSQL (scalable)

## Communication Protocols

### 1. HTTP/REST APIs

```
Web Server exposes RESTful APIs:

Tasks:
  POST   /api/tasks              - Create task
  GET    /api/tasks              - List tasks
  GET    /api/tasks/[id]         - Get task
  PATCH  /api/tasks/[id]         - Update task
  DELETE /api/tasks/[id]         - Delete task
  POST   /api/tasks/[id]/execute - Execute task
  POST   /api/tasks/[id]/pause   - Pause task
  POST   /api/tasks/[id]/resume  - Resume task

Reviews:
  GET    /api/tasks/[id]/reviews           - List reviews
  POST   /api/tasks/[id]/reviews           - Create review
  PATCH  /api/reviews/[id]/approve         - Approve
  PATCH  /api/reviews/[id]/request-changes - Request changes

Dependencies:
  GET    /api/tasks/[id]/dependencies      - List
  POST   /api/dependencies/[id]/provide    - Provide

Questions:
  GET    /api/tasks/[id]/questions         - List
  POST   /api/questions/[id]/answer        - Answer
```

### 2. Server-Sent Events (SSE)

```
Web Server streams real-time updates:

GET /api/tasks/[id]/stream

Event types:
  - log: Agent output
  - phase_update: Phase status change
  - step_update: Step progress
  - dependency_request: Dependency needed
  - user_question: Question from agent
  - review_required: Phase review needed
  - complete: Task completed
  - error: Error occurred
```

### 3. Platform-Agent Protocols

Structured text protocols for agent communication:

**Dependency Request**:
```
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for AI features
required: true
[/DEPENDENCY_REQUEST]
```

**User Question**:
```
[USER_QUESTION]
category: business
question: What pricing model?
options: [Subscription, Freemium, Ad-based]
[/USER_QUESTION]
```

**Phase Completion**:
```
=== PHASE N COMPLETE ===
```

**Error**:
```
[ERROR]
type: execution_failed
message: Build failed
[/ERROR]
```

## Technology Stack

### Frontend (Tier 1)
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **State**: Zustand
- **Real-time**: EventSource (SSE)

### Backend (Tier 1 & 2)
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Process Management**: child_process
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Scheduling**: node-cron

### Agent Runtime (Tier 3)
- **Engine**: Claude Code CLI
- **Model**: Claude Sonnet 4.5
- **Context**: Loaded with CLAUDE.md guides
- **Tools**: Full Claude Code tool suite

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Web Server  │  │ Web Server  │  │ Web Server  │
│  Instance 1 │  │  Instance 2 │  │  Instance 3 │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼────────┐
                │  Load Balancer │
                └───────┬────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
│   Agent     │  │   Agent    │  │   Agent     │
│  Manager 1  │  │  Manager 2 │  │  Manager 3  │
└─────────────┘  └────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼────────┐
                │   PostgreSQL   │
                │   (Primary)    │
                └────────────────┘
```

### Queue Management

For high concurrency, implement distributed queue:
- **Technology**: Redis + Bull
- **Features**: Priority queues, retry logic, rate limiting
- **Benefits**: Multiple agent managers can consume from shared queue

### Rate Limit Handling

**Checkpoint System**:
1. Save agent state before rate limit
2. Queue for later execution
3. Auto-resume after reset time

**Token Budgeting**:
1. Track token usage per task
2. Predict costs before execution
3. Pause when approaching limits

## Security Architecture

### 1. Input Validation

```typescript
// Path traversal prevention
validatePath(userPath, baseDir)

// Prompt injection defense
sanitizePrompt(userInput)

// SQL injection prevention (via Prisma ORM)
```

### 2. Secret Management

```typescript
// Encrypt API keys & secrets
encryptSecret(value) // AES-256-CBC

// Store encrypted in database
// Decrypt only at runtime

// Never log secrets
```

### 3. Process Isolation

```typescript
// Each agent runs in isolated process
// Limited filesystem access
// Sandboxed environment
// Resource limits (memory, CPU)
```

### 4. Authentication & Authorization

```typescript
// User authentication (optional)
// API key authentication
// Role-based access control
// Rate limiting per user
```

## Deployment Architecture

### Development
```
Local Machine
├── Next.js Dev Server (Port 3000)
├── SQLite Database (./prisma/dev.db)
└── Agent Processes (spawned on demand)
```

### Production
```
Cloud Infrastructure (AWS/GCP/Azure)
├── Next.js App (Vercel/Railway/Docker)
│   └── Auto-scaling based on load
├── PostgreSQL (Managed Service)
│   └── Replicas for read scaling
├── Redis (Session & Queue)
└── S3/Cloud Storage (Deliverables)
```

## Monitoring & Observability

### Metrics
- Task success/failure rates
- Average execution time per phase
- Token usage & costs
- Rate limit incidents
- Agent uptime & health

### Logging
- Structured logs (JSON)
- Log levels (debug, info, warn, error)
- Correlation IDs for request tracing
- Agent output logs (preserved)

### Alerting
- Task failures
- Rate limit exceeded
- High costs
- System errors

## Future Enhancements

1. **Multi-tenant Support**: Separate workspaces for teams
2. **Custom Workflows**: User-defined phase structures
3. **Plugin System**: Extensible integrations
4. **Advanced Analytics**: Usage patterns, cost optimization
5. **Distributed Execution**: Agent manager clustering
6. **Real-time Collaboration**: Multiple users on same task

## Reference Documents

- **Feature Specification**: `FEATURES.md`
- **API Documentation**: `API.md`
- **Workflow Details**: `WORKFLOWS.md`
- **Development Guide**: `DEVELOPMENT.md`
- **Web Server Guide**: `/packages/claude-code-server/CLAUDE.md`
- **Agent Manager Guide**: `/packages/agent-manager/CLAUDE.md`
- **Sub-Agent Guide**: `/packages/sub-agent/CLAUDE.md`
