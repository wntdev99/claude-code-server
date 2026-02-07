# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Server transforms the Claude Code CLI into a web-based agent management platform. Users submit development tasks through a browser, and autonomous Claude Code agents execute them following structured phase-based workflows with real-time progress tracking and interactive communication.

## Architecture

This is a **3-tier monorepo architecture**:

```
┌─────────────────────────────────────────────┐
│         Tier 1: Web Server                  │
│    packages/claude-code-server/             │
│    - Next.js 14 App Router                  │
│    - REST APIs & SSE streaming              │
│    - UI with shadcn/ui                      │
└──────────────┬──────────────────────────────┘
               │ Process Management & IPC
┌──────────────▼──────────────────────────────┐
│         Tier 2: Agent Manager               │
│    packages/agent-manager/                  │
│    - Claude Code process lifecycle          │
│    - Protocol parsing & state tracking      │
│    - Checkpoint system                      │
└──────────────┬──────────────────────────────┘
               │ Task Delegation
┌──────────────▼──────────────────────────────┐
│         Tier 3: Sub-Agent                   │
│    packages/sub-agent/                      │
│    - Task execution via child_process       │
│    - Reads 24 guide documents in /guide/    │
│    - Generates deliverables                 │
└─────────────────────────────────────────────┘
```

### Key Directories

- **`/packages/`**: Monorepo packages
  - `claude-code-server/`: Web server (Tier 1) - has its own CLAUDE.md
  - `agent-manager/`: Agent orchestration (Tier 2) - has its own CLAUDE.md
  - `sub-agent/`: Task executor (Tier 3) - has its own CLAUDE.md
  - `core/`: Shared domain entities and business logic
  - `shared/`: Common utilities and types
- **`/apps/web/`**: Next.js frontend application
- **`/guide/`**: 24 structured guide documents that sub-agents reference during execution
  - `planning/`: 9 guides for Phase 1 (planning)
  - `design/`: 5 guides for Phase 2 (design)
  - `development/`: 6 guides for Phase 3 (development)
  - `verification/`: 3 guides for automated verification
  - `review/`: 1 guide for review process
- **`/docs/`**: Project documentation
  - `ARCHITECTURE.md`: Detailed 3-tier architecture
  - `FEATURES.md`: Comprehensive feature specification
  - `WORKFLOWS.md`: Phase-based workflow documentation
  - `API.md`: REST API reference
  - `DEVELOPMENT.md`: Development setup guide

## Development Commands

Since this is a monorepo without package.json at root yet, navigate to specific packages:

```bash
# Web Server (Tier 1)
cd packages/claude-code-server
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm test             # Run tests

# Agent Manager (Tier 2)
cd packages/agent-manager
npm run build        # Build TypeScript
npm test             # Run tests
npm run watch        # Watch mode for development

# Sub-Agent (Tier 3)
cd packages/sub-agent
npm run build        # Build TypeScript
npm test             # Run tests
```

## Core Concepts

### 1. Task Types & Workflows

Four task types with distinct workflows:

- **`create_app`**: New app creation → Planning (9 steps) → Design (5 steps) → Development (6 steps) → Testing
- **`modify_app`**: Existing app modification → Analysis → Planning → Implementation → Testing
- **`workflow`**: Workflow automation → Planning → Design → Development → Testing
- **`custom`**: Free-form conversation with prompt-based execution

### 2. Phase-Based Execution

Sub-agents execute tasks in phases. Each phase:
1. Sub-agent reads guide documents from `/guide/[phase]/`
2. Generates deliverables (markdown docs in Phase 1-2, code in Phase 3)
3. Signals completion with `=== PHASE N COMPLETE ===`
4. Agent Manager pauses sub-agent
5. System runs verification (separate agent checks deliverables)
6. Creates review for user approval
7. On approval, proceeds to next phase

### 3. Platform-Agent Communication Protocols

Sub-agents communicate with the platform via structured text protocols in stdout:

**Dependency Request:**
```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file | permission
name: OPENAI_API_KEY
description: Required for OpenAI API calls
required: true
[/DEPENDENCY_REQUEST]
```

**User Question:**
```
[USER_QUESTION]
category: business | clarification | choice | confirmation
question: What revenue model do you prefer?
options:
  - Subscription
  - Freemium
  - Ad-based
[/USER_QUESTION]
```

**Phase Completion:**
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
...
```

**Error Reporting:**
```
[ERROR]
type: recoverable | fatal
message: Rate limit exceeded
details: API rate limit hit, will retry after cooldown
recovery: pause_and_retry | checkpoint_and_fail
[/ERROR]
```

The Agent Manager parses these protocols in real-time and coordinates appropriate responses (pausing agents, requesting user input, injecting dependencies, handling errors).

### 4. Review Gate System

After each phase completion:
1. Deliverables auto-collected
2. Verification agent validates quality (checks file existence, content length, no placeholders)
3. If verification fails: auto-rework (max 3 attempts)
4. If passes: create review for user
5. User reviews via web UI
6. User approves → next phase starts
7. User requests changes → agent reworks with feedback

### 5. Real-time Features

- **SSE Streaming**: Live agent logs streamed to browser via Server-Sent Events
- **Agent Status**: Current phase, step, progress percentage tracked in real-time
- **Token Usage**: Input/output tokens and costs monitored
- **Rate Limiting**: Auto-pause/resume when hitting Claude API limits
- **Checkpoints**: Agent state saved periodically for recovery

## Layer-Specific Guidelines

### When Working on Tier 1 (Web Server)

Read `packages/claude-code-server/CLAUDE.md` for detailed guidance. Key points:
- Next.js 14 App Router with Server Components
- API routes in `app/api/`
- SSE endpoint for log streaming
- Zustand for client state management
- Security: path validation, input sanitization, secret encryption
- Process management via Node.js `child_process`

### When Working on Tier 2 (Agent Manager)

Read `packages/agent-manager/CLAUDE.md` for detailed guidance. Key points:
- Spawn/manage Claude Code processes
- Parse stdout for protocol messages
- Maintain agent state (idle, running, waiting_review, paused, completed, failed)
- Queue management and work distribution
- Checkpoint creation (every 10 minutes, on rate limit, on error, on phase complete)
- Signal handling (SIGTSTP for pause, SIGCONT for resume)

### When Working on Tier 3 (Sub-Agent)

Read `packages/sub-agent/CLAUDE.md` for detailed guidance. Key points:
- Execute as Claude Code CLI instance via `child_process`
- Read and follow guide documents in `/guide/`
- Generate high-quality deliverables (no placeholders, complete content)
- Use communication protocols for dependencies and questions
- Work autonomously within phase structure
- Signal phase completion clearly

## Important Files to Reference

Before implementing features, read relevant documentation:

- **Architecture changes**: `docs/ARCHITECTURE.md`
- **New features**: `docs/FEATURES.md` (comprehensive 982-line spec)
- **API endpoints**: `docs/API.md`
- **Workflow logic**: `docs/WORKFLOWS.md`
- **Development setup**: `docs/DEVELOPMENT.md`

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **State**: Zustand (client), Prisma (database)
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Runtime**: Node.js with `child_process` for agent spawning
- **Real-time**: Server-Sent Events (SSE)
- **Agent Runtime**: Claude Code CLI instances

## Security Considerations

- **Path Validation**: All file paths must be validated to prevent traversal attacks
- **Input Sanitization**: User inputs sanitized to prevent injection
- **Secret Encryption**: API keys and env vars encrypted at rest
- **Rate Limiting**: Applied to all API endpoints
- **Process Isolation**: Each sub-agent runs in isolated process

## Monorepo Structure

This is a multi-package monorepo. Each package (`claude-code-server`, `agent-manager`, `sub-agent`, `core`, `shared`) can be developed independently but shares common types and utilities.

Shared packages:
- **`core`**: Domain entities (Task, Phase, Review, Dependency, Question) and use cases
- **`shared`**: Common utilities (validation, encryption, formatting, constants)

## Guide Documents

The 24 guide documents in `/guide/` are critical to sub-agent execution. They provide step-by-step instructions for:
- **Planning** (9 guides): Market analysis, personas, features, tech stack, etc.
- **Design** (5 guides): Screen design, data models, API specs, architecture
- **Development** (6 guides): Project setup, data layer, business logic, UI, testing, deployment
- **Verification** (3 guides): Quality criteria for each phase
- **Review** (1 guide): Review process instructions

Sub-agents read these guides at runtime to understand what to produce.

## Working with Multiple Layers

When implementing features that span multiple tiers:

1. **Start with the protocol definition** (if adding new communication)
2. **Implement in Sub-Agent** (Tier 3) - what the agent outputs
3. **Implement in Agent Manager** (Tier 2) - parsing and handling
4. **Implement in Web Server** (Tier 1) - API and UI

Example: Adding a new dependency type
1. Define protocol format in `docs/FEATURES.md`
2. Sub-agent outputs the new dependency request format
3. Agent Manager adds parser for the new type
4. Web Server adds UI for the new dependency input

## Common Pitfalls

- **Don't spawn agents directly from Web Server**: Always go through Agent Manager
- **Don't store secrets in plaintext**: Use encryption utilities from `shared` package
- **Don't assume guide documents exist**: Sub-agents should gracefully handle missing guides
- **Don't parse agent output with regex**: Use robust protocol parsers in Agent Manager
- **Don't block SSE streams**: Keep connections alive with heartbeat events
- **Don't hardcode phase logic**: Use phase definitions from workflow documentation

## Getting Started for New Contributors

1. Read `README.md` for project overview
2. Read `docs/ARCHITECTURE.md` to understand 3-tier structure
3. Read `docs/WORKFLOWS.md` to understand phase-based execution
4. Pick a tier to work on and read its `CLAUDE.md`
5. Reference guide documents in `/guide/` to understand what sub-agents produce
6. Review protocol definitions in `docs/FEATURES.md` section D

## Environment Setup

**Prerequisites**:
- Claude Code CLI installed and authenticated (`claude login`)
- Node.js 18+ installed

Required environment variables (create `.env` file):
```bash
DATABASE_URL=file:./dev.db  # SQLite for dev
NODE_ENV=development

# Optional: Claude Code CLI settings
CLAUDE_MODEL=claude-sonnet-4-5  # Default model
CLAUDE_MAX_TOKENS=8000          # Max tokens per request
```

For production:
- Use PostgreSQL instead of SQLite
- Set up proper secret management
- Configure rate limiting and monitoring

**Note**: Claude Code CLI uses its own authentication system. No API key is required in environment variables.
