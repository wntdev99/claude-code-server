# Claude Code Server

## Overview

The `claude-code-server` package provides the web server layer for the Claude Code Server. It serves the Next.js application, exposes REST APIs, manages Claude Code agent processes, and streams real-time updates to clients.

## Responsibilities

### Core Functions

1. **API Gateway**: Expose REST APIs for tasks, reviews, dependencies, questions, and settings
2. **Process Management**: Spawn and manage Claude Code agent processes via `child_process`
3. **Real-time Streaming**: Stream agent logs and events to clients using Server-Sent Events (SSE)
4. **Security**: Validate inputs, prevent path traversal and prompt injection, encrypt sensitive data
5. **Data Persistence**: Store tasks, reviews, and other data in database

### Key Interfaces

```typescript
// Task Management
interface Task {
  id: string;
  title: string;
  type: 'create_app' | 'modify_app' | 'workflow' | 'custom';
  status: 'draft' | 'pending' | 'in_progress' | 'review' | 'completed' | 'failed';
  description: string;
  currentPhase: number | null;
  progress: number;
}

// Agent Status
interface AgentStatus {
  taskId: string;
  status: 'idle' | 'running' | 'waiting_review' | 'paused' | 'completed' | 'failed';
  currentPhase: number | null;
  progress: number;
  tokensUsed: number;
}

// SSE Event
type SSEEvent =
  | { type: 'log'; data: { message: string } }
  | { type: 'phase_update'; data: { phase: number } }
  | { type: 'dependency_request'; data: DependencyRequest }
  | { type: 'user_question'; data: UserQuestion }
  | { type: 'complete'; data: { success: boolean } };
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js
- **Process Management**: `child_process`
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **State Management**: Zustand (client)
- **Real-time**: Server-Sent Events (SSE)

## Key APIs

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `GET /api/tasks/[id]` - Get task
- `POST /api/tasks/[id]/execute` - Execute task
- `POST /api/tasks/[id]/pause` - Pause task
- `GET /api/tasks/[id]/stream` - SSE log stream

### Reviews
- `GET /api/tasks/[id]/reviews` - List reviews
- `PATCH /api/reviews/[id]/approve` - Approve review
- `PATCH /api/reviews/[id]/request-changes` - Request changes

### Dependencies
- `GET /api/tasks/[id]/dependencies` - List dependencies
- `POST /api/dependencies/[id]/provide` - Provide dependency

### Questions
- `GET /api/tasks/[id]/questions` - List questions
- `POST /api/questions/[id]/answer` - Answer question

## Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "zustand": "^4.0.0",
  "prisma": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "@radix-ui/react-*": "latest"
}
```

## Usage

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Related Components

- **Web App**: `/apps/web` - Frontend application
- **Agent Manager**: `/packages/agent-manager` - Agent orchestration
- **Core**: `/packages/core` - Shared domain logic
- **Shared**: `/packages/shared` - Common utilities

## Development Guide

See `CLAUDE.md` in this directory for comprehensive development guide including:
- Next.js conventions
- API route patterns
- SSE implementation
- Agent process management
- Security requirements
- Protocol parsing

## Security Considerations

1. **Path Validation**: Validate all file paths to prevent traversal attacks
2. **Input Sanitization**: Sanitize all user inputs to prevent injection
3. **Secret Encryption**: Encrypt API keys and sensitive environment variables
4. **Rate Limiting**: Implement rate limiting on API endpoints
5. **CORS**: Configure CORS to allow only trusted origins

## Documentation

- **Development Guide**: `CLAUDE.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **API Reference**: `/docs/API.md`
- **Features**: `/docs/FEATURES.md`
