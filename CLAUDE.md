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
- **`/docs/`**: Project documentation (see Documentation Structure below)

## Documentation Structure

The `/docs/` directory contains comprehensive documentation organized by topic:

**Start Here**:
- `QUICK_START.md` - Fast onboarding (read this first!)
- `README.md` - Documentation index

**Core Documentation** (essential reading):
- `ARCHITECTURE.md` - 3-tier system architecture
- `WORKFLOWS.md` - Phase-based workflow details
- `FEATURES.md` - Complete feature specification
- `API.md` - REST API reference
- `DEVELOPMENT.md` - Development setup

**Reference Documentation** (use as needed):
- `GLOSSARY.md` - Terms and definitions
- `PROTOCOLS.md` - Platform-agent communication protocols
- `STATE_MACHINE.md` - Agent state transitions
- `DIAGRAMS.md` - System diagrams and flows

**System-Specific** (deep dives):
- `SETTINGS_SYSTEM.md` - Settings and optional integrations (✅ Recommended)
- `CHECKPOINT_SYSTEM.md` - Session save/restore mechanisms
- `RATE_LIMITING.md` - Rate limit detection and handling
- `TROUBLESHOOTING.md` - Common issues and solutions
- `DEPENDENCY_SYSTEM.md` - ⚠️ **DEPRECATED** (use Settings system instead)

**Quick Reference**:
- When stuck: Check `TROUBLESHOOTING.md` for solutions
- Terms: Check `GLOSSARY.md` for definitions
- Settings: Check `SETTINGS_SYSTEM.md` for optional integrations
- ⚠️ Do NOT use `DEPENDENCY_SYSTEM.md` (deprecated)

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

**IMPORTANT**: Each task type follows a DIFFERENT workflow with different phases and deliverables. Sub-agents must follow the specific workflow for the task type.

#### Workflow Phase-A: `create_app` (New Application Development)

**Purpose**: Create new applications from scratch

**Phases**:
```
Phase 1: Planning (기획) - 9 steps
  → Deliverables: 9 planning documents in docs/planning/
  → Guide: /guide/planning/*.md
  → Verification: /guide/verification/phase1_verification.md
    ↓
Phase 2: Design (설계) - 5 steps
  → Deliverables: 5 design documents in docs/design/
  → Guide: /guide/design/*.md
  → Verification: /guide/verification/phase2_verification.md
    ↓
Phase 3: Development (개발) - 6 steps
  → Deliverables: Complete working codebase
  → Guide: /guide/development/*.md
  → Verification: /guide/verification/phase3_verification.md
    ↓
Phase 4: Testing (테스트)
  → Final validation and quality assurance
```

**Sub-agent instructions for create_app**:
- Read all planning guides (01_idea through 09_roadmap) for Phase 1
- Generate 9 comprehensive planning documents (≥500 chars each, no placeholders)
- Read all design guides (01_screen through 05_architecture) for Phase 2
- Generate 5 detailed design documents with specific data models and API specs
- Read all development guides (01_setup through 06_deploy) for Phase 3
- Generate complete, working codebase with tests and deployment config

#### Workflow Phase-B: `modify_app` (Existing Application Modification)

**Purpose**: Modify, enhance, or fix existing applications

**Phases**:
```
Phase 1: Analysis (분석) - 3 steps
  → Deliverables: docs/analysis/current_state.md
  → Steps: Codebase analysis, Dependency analysis, Impact analysis
    ↓
Phase 2: Planning (계획) - 4 steps
  → Deliverables: docs/planning/modification_plan.md
  → Steps: Requirements definition, Modification plan, Risk assessment, Testing strategy
    ↓
Phase 3: Implementation (구현) - 6 steps
  → Deliverables: Modified codebase
  → Steps: Code modification, Refactoring, Docs update, Dependency update, Config update, Build verification
    ↓
Phase 4: Testing (검증) - 3 steps
  → Deliverables: Test results
  → Steps: Run existing tests, Add new tests, Manual testing
```

**Sub-agent instructions for modify_app**:
- Phase 1: Thoroughly analyze existing codebase, identify all dependencies and constraints
- Phase 2: Create detailed modification plan with risk assessment
- Phase 3: Implement changes carefully, ensure no breaking changes to existing functionality
- Phase 4: Verify all existing tests pass, add tests for new functionality

#### Workflow Phase-C: `workflow` (Workflow Automation)

**Purpose**: Create automated workflows and integrations

**Phases**:
```
Phase 1: Planning (기획) - Workflow-specific planning
  → Deliverables: docs/planning/workflow_requirements.md
  → Focus: Triggers, integrations, error handling, scheduling
    ↓
Phase 2: Design (설계) - Workflow logic design
  → Deliverables: docs/design/workflow_design.md
  → Focus: Step definitions, conditions, loops, state management
    ↓
Phase 3: Development (개발) - Workflow implementation
  → Deliverables: Workflow code with integrations
  → Focus: Trigger implementation, action handlers, integration connectors
    ↓
Phase 4: Testing (테스트) - Workflow execution testing
  → Deliverables: Test results and execution logs
  → Focus: Trigger testing, end-to-end workflow testing, error scenarios
```

**Sub-agent instructions for workflow**:
- Phase 1: Define workflow requirements including triggers (schedule, webhook, manual, event)
- Phase 2: Design workflow logic with clear steps, conditions, and error handling
- Phase 3: Implement workflow with external service integrations
- Phase 4: Test all trigger types and error scenarios

#### Workflow Type-D: `custom` (Free-form Conversation)

**Purpose**: Handle miscellaneous tasks that don't fit structured workflows

**Phases**: Single-phase autonomous execution
```
User prompt → Agent response → Iterative conversation
```

**Sub-agent instructions for custom**:
- No fixed phases - respond naturally to user requests
- Use autonomous decision-making
- No formal deliverables required
- Signal completion when task is done

### 2. Phase-Based Execution Process

**All workflow types (except custom) follow this review process after each phase**:

1. **Agent signals completion**: `=== PHASE N COMPLETE ===`
2. **Platform pauses agent** (Agent Manager sends SIGTSTP)
3. **Verification agent runs** (separate Claude Code instance checks deliverables)
4. **Verification report generated** (checks completeness, quality, no placeholders)
5. **If verification fails**: Auto-rework (max 3 attempts with feedback)
6. **If verification passes**: Create review for user via web UI
7. **User reviews** deliverables (documents, code files)
8. **User approves or requests changes** (with feedback comments)
9. **If approved**: Agent proceeds to next phase
10. **If changes requested**: Agent addresses feedback and re-submits for re-verification

See `/docs/WORKFLOWS.md` for detailed workflow documentation and verification criteria per phase.

### 3. Platform-Agent Communication Protocols

Sub-agents communicate with the platform via structured text protocols in stdout:

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
- **Identify task type** and follow the correct workflow (Phase-A/B/C/D)
- Read and follow **task-type-specific guide documents** in `/guide/`
- Generate high-quality deliverables (no placeholders, complete content)
- Use communication protocols for dependencies and questions
- Work autonomously within the specific phase structure for the task type
- Signal phase completion clearly

**Critical**: Sub-agents MUST follow different instructions based on task type:
- **create_app** (Phase-A): Read planning/design/development guides, generate all planning docs → design docs → complete codebase
- **modify_app** (Phase-B): Analyze existing code → plan modifications → implement changes → test
- **workflow** (Phase-C): Define workflow requirements → design workflow logic → implement with integrations → test execution
- **custom** (Type-D): No fixed phases, respond naturally to user requests

## Important Files to Reference

Before implementing features, read relevant documentation:

### Core Documentation
- **Architecture changes**: `docs/ARCHITECTURE.md` - 3-tier system architecture
- **New features**: `docs/FEATURES.md` - Comprehensive feature specification
- **API endpoints**: `docs/API.md` - REST API reference
- **Workflow logic**: `docs/WORKFLOWS.md` - Phase-based workflow details
- **Development setup**: `docs/DEVELOPMENT.md` - Environment setup guide

### Reference Documentation
- **Quick Start**: `docs/QUICK_START.md` - Fast onboarding guide
- **Glossary**: `docs/GLOSSARY.md` - Terms and definitions
- **Protocols**: `docs/PROTOCOLS.md` - Platform-agent communication protocols
- **State Machine**: `docs/STATE_MACHINE.md` - Agent state transitions
- **Diagrams**: `docs/DIAGRAMS.md` - System diagrams and flows

### System-Specific Documentation
- **Settings System**: `docs/SETTINGS_SYSTEM.md` - Settings and optional integrations (✅ Recommended)
- **Checkpoint System**: `docs/CHECKPOINT_SYSTEM.md` - Session save/restore
- **Rate Limiting**: `docs/RATE_LIMITING.md` - Rate limit handling
- **Troubleshooting**: `docs/TROUBLESHOOTING.md` - Common issues and solutions
- **Dependency System**: `docs/DEPENDENCY_SYSTEM.md` - ⚠️ **DEPRECATED** (use Settings instead)

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

The 24 guide documents in `/guide/` are critical to sub-agent execution. **⚠️ IMPORTANT: Different workflow types use DIFFERENT guides. Do not confuse them.**

### 📋 Guide Usage by Workflow Type

| Workflow Type | Phase | Guides Used | Location |
|--------------|-------|-------------|----------|
| **Phase-A (create_app)** | Phase 1: Planning | 9 planning guides | `/guide/planning/` |
| | Phase 2: Design | 5 design guides | `/guide/design/` |
| | Phase 3: Development | 6 development guides | `/guide/development/` |
| | Verification | 3 verification guides | `/guide/verification/` |
| **Phase-B (modify_app)** | Phase 1: Analysis | ❌ No guides (autonomous) | - |
| | Phase 2-4 | ⚠️ Adapt Phase-A guides | `/guide/` (selective) |
| **Phase-C (workflow)** | All phases | ⚠️ Adapt Phase-A guides | `/guide/` (selective) |
| **Type-D (custom)** | N/A | ❌ No guides | - |

### Guides for Phase-A (create_app) ONLY

⚠️ **These guides apply ONLY to Phase-A (create_app) workflow.** Do not use them directly for modify_app or workflow tasks.

#### Planning Guides (Phase 1 - 9 documents)

| Guide | File | Purpose | Usage Context |
|-------|------|---------|---------------|
| 01. Idea | `/guide/planning/01_idea.md` | Define app concept and vision | Phase 1 Planning |
| 02. Market | `/guide/planning/02_market.md` | Market research and analysis | Phase 1 Planning |
| 03. Persona | `/guide/planning/03_persona.md` | Target user personas | Phase 1 Planning |
| 04. User Journey | `/guide/planning/04_user_journey.md` | User flows and scenarios | Phase 1 Planning |
| 05. Business Model | `/guide/planning/05_business_model.md` | Revenue and monetization | Phase 1 Planning |
| 06. Product | `/guide/planning/06_product.md` | Product specification | Phase 1 Planning |
| 07. Features | `/guide/planning/07_features.md` | Feature list and priorities | Phase 1 Planning |
| 08. Tech Stack | `/guide/planning/08_tech.md` | Technology decisions | Phase 1 Planning |
| 09. Roadmap | `/guide/planning/09_roadmap.md` | Development roadmap | Phase 1 Planning |

**Deliverables**: 9 planning documents in `docs/planning/` (each ≥500 chars, no placeholders)

#### Design Guides (Phase 2 - 5 documents)

| Guide | File | Purpose | Usage Context |
|-------|------|---------|---------------|
| 01. Screen Flow | `/guide/design/01_screen.md` | UI/UX screen designs | Phase 2 Design |
| 02. Data Model | `/guide/design/02_data_model.md` | Database schema | Phase 2 Design |
| 03. Task Flow | `/guide/design/03_task_flow.md` | Business logic flows | Phase 2 Design |
| 04. API Design | `/guide/design/04_api.md` | API endpoints and contracts | Phase 2 Design |
| 05. Architecture | `/guide/design/05_architecture.md` | System architecture | Phase 2 Design |

**Deliverables**: 5 design documents in `docs/design/` with specific data models and API specs

#### Development Guides (Phase 3 - 6 documents)

| Guide | File | Purpose | Usage Context |
|-------|------|---------|---------------|
| 01. Setup | `/guide/development/01_setup.md` | Project initialization | Phase 3 Development |
| 02. Data Layer | `/guide/development/02_data.md` | Database implementation | Phase 3 Development |
| 03. Business Logic | `/guide/development/03_logic.md` | Core logic implementation | Phase 3 Development |
| 04. UI Layer | `/guide/development/04_ui.md` | Frontend implementation | Phase 3 Development |
| 05. Testing | `/guide/development/05_testing.md` | Test suite creation | Phase 3 Development |
| 06. Deployment | `/guide/development/06_deploy.md` | Deployment configuration | Phase 3 Development |

**Deliverables**: Complete working codebase in `src/`

#### Verification Guides (3 documents)

| Guide | File | Used By | Purpose |
|-------|------|---------|---------|
| Phase 1 Verification | `/guide/verification/phase1_verification.md` | Verification Agent | Validate Phase 1 planning docs |
| Phase 2 Verification | `/guide/verification/phase2_verification.md` | Verification Agent | Validate Phase 2 design docs |
| Phase 3 Verification | `/guide/verification/phase3_verification.md` | Verification Agent | Validate Phase 3 codebase |

### Guides for Phase-B (modify_app)

⚠️ **Phase-B does NOT use planning/design guides directly.** Sub-agents analyze existing code autonomously.

#### Guide Usage Strategy

- **Phase 1 (Analysis)**: ❌ No guides - autonomous codebase analysis
- **Phase 2-4**: ⚠️ Selectively adapt Phase-A guides for modification context
  - Refer to development guides for coding standards
  - Skip planning/design guides (code already exists)
  - Focus on preserving existing functionality

### Guides for Phase-C (workflow)

⚠️ **Phase-C adapts Phase-A guides for workflow/automation context.**

#### Guide Usage Strategy

- **Phase 1 (Planning)**: Adapt planning guides focusing on:
  - Trigger definitions (schedule, webhook, manual, event)
  - Integration requirements (external services)
  - Error handling strategies
- **Phase 2 (Design)**: Adapt design guides focusing on:
  - Workflow step logic (actions, conditions, loops)
  - State management
  - Integration patterns
- **Phase 3 (Development)**: Use development guides with workflow focus

**Note**: Workflow-specific guide documents are planned but not yet created. Use Phase-A guides as reference.

### Guides for Type-D (custom)

❌ **No guides required.** Type-D agents respond naturally to user prompts without structured deliverables.

---

### ⚠️ Important Warnings

1. **Do NOT confuse workflow types**:
   - Phase-A guides are designed for **creating new apps from scratch**
   - Phase-B agents **analyze existing code** and don't need planning guides
   - Phase-C agents **adapt guides for automation**, not full app development
   - Type-D agents **don't use guides at all**

2. **Do NOT apply all guides to all workflows**:
   - ❌ Wrong: Using 9 planning guides for modify_app
   - ✅ Right: modify_app does autonomous analysis

3. **Do NOT assume guides are mandatory for all phases**:
   - Phase-A: All 23 guides (9 planning + 5 design + 6 development + 3 verification)
   - Phase-B: Selective adaptation (mainly development guides)
   - Phase-C: Selective adaptation (focus on workflow concerns)
   - Type-D: None

### Cross-Reference: When to Use Each Workflow

See the "Workflow Type Comparison" table below for quick reference on:
- Which guides apply to each workflow type
- What deliverables are expected
- When to use each workflow type

## Workflow Type Comparison

**Quick reference for understanding the differences between workflow types**:

| Aspect | Phase-A (create_app) | Phase-B (modify_app) | Phase-C (workflow) | Type-D (custom) |
|--------|---------------------|---------------------|-------------------|----------------|
| **Purpose** | Create new app from scratch | Modify existing app | Create workflow automation | Free-form tasks |
| **Phase 1** | Planning (9 docs) | Analysis (1 doc) | Planning (workflow reqs) | N/A (single phase) |
| **Phase 2** | Design (5 docs) | Planning (1 doc) | Design (workflow logic) | N/A |
| **Phase 3** | Development (code) | Implementation (code) | Development (code) | N/A |
| **Phase 4** | **Verification** (Verification Agent) | **Testing** (Sub-Agent직접) | **Testing** (Sub-Agent 직접) | N/A |
| **Main Guides** | /guide/planning/, /guide/design/, /guide/development/ | Autonomous analysis, adapt Phase-A guides | Adapt Phase-A guides for workflows | None |
| **Deliverables** | 14 docs + codebase | 2 docs + modified code | 2 docs + workflow code | Varies |
| **Starting Point** | Blank slate | Existing codebase | Blank slate (workflow-focused) | User prompt |
| **Verification** | 3 verification guides (automated) | Sub-Agent manual testing | Sub-Agent manual testing | None |
| **Review Gates** | After each phase | After each phase | After each phase | None |
| **Key Focus** | Complete app (planning, design, implementation) | Careful modification (no breaking changes) | Automation (triggers, integrations) | User satisfaction |

**When to use each type**:
- **create_app**: "Build a todo app with React and Node.js"
- **modify_app**: "Add dark mode to the existing app"
- **workflow**: "Create a workflow that sends Slack notifications on GitHub events"
- **custom**: "Explain how WebSockets work" or "Debug this error message"

## Working with Multiple Layers

When implementing features that span multiple tiers:

1. **Start with the protocol definition** (if adding new communication)
2. **Implement in Sub-Agent** (Tier 3) - what the agent outputs
3. **Implement in Agent Manager** (Tier 2) - parsing and handling
4. **Implement in Web Server** (Tier 1) - API and UI

Example: Adding a new optional integration
1. Add integration to Settings schema in `docs/SETTINGS_SYSTEM.md`
2. Update `docs/FEATURES.md` Optional Integrations section
3. Update Sub-agent guide to document integration usage
4. Agent Manager passes settings to sub-agent on spawn (via environment variables)
5. Web Server adds Settings UI for the new integration

## Common Pitfalls

### Platform-Level Pitfalls
- **Don't spawn agents directly from Web Server**: Always go through Agent Manager
- **Don't store secrets in plaintext**: Use encryption utilities from `shared` package
- **Don't parse agent output with regex**: Use robust protocol parsers in Agent Manager
- **Don't block SSE streams**: Keep connections alive with heartbeat events
- **Don't hardcode phase logic**: Use phase definitions from workflow documentation
- **Don't use DEPENDENCY_REQUEST protocol**: This is deprecated. Use Settings system instead (see `docs/SETTINGS_SYSTEM.md`)

### Sub-Agent Pitfalls (Workflow-Specific)
- **Don't use wrong workflow guides**:
  - create_app uses all planning/design/development guides
  - modify_app analyzes existing code, doesn't use planning guides
  - workflow adapts guides for automation context
  - custom doesn't use guides at all
- **Don't mix workflow types**: Each task type has distinct phases and deliverables
- **Don't skip guides**: Sub-agents must read appropriate guides for their workflow type before each phase
- **Don't assume guide documents exist**: Sub-agents should gracefully handle missing guides (especially for Phase-B and Phase-C)
- **Don't create generic deliverables**:
  - Phase-A needs 9 planning + 5 design docs + complete codebase
  - Phase-B needs analysis doc + modification plan + modified code
  - Phase-C needs workflow requirements + workflow design + workflow code
  - Type-D has no fixed deliverables
- **Don't ignore existing code**: Phase-B (modify_app) must analyze and preserve existing functionality

## Getting Started for New Contributors

### Fast Track (Recommended)
1. **Quick Start**: Read `docs/QUICK_START.md` for rapid onboarding
2. **Choose Your Path**:
   - Working on Web Server (Tier 1)? → `packages/claude-code-server/CLAUDE.md`
   - Working on Agent Manager (Tier 2)? → `packages/agent-manager/CLAUDE.md`
   - Working on Sub-Agent (Tier 3)? → `packages/sub-agent/CLAUDE.md`
3. **Reference as Needed**: Use `docs/GLOSSARY.md` and `docs/TROUBLESHOOTING.md`

### Deep Dive (Comprehensive)
1. Read `README.md` for project overview
2. Read `docs/ARCHITECTURE.md` to understand 3-tier structure
3. Read `docs/WORKFLOWS.md` to understand phase-based execution
4. Read `docs/PROTOCOLS.md` to understand platform-agent communication
5. Read `docs/STATE_MACHINE.md` to understand agent lifecycle
6. Pick a tier to work on and read its `CLAUDE.md`
7. Reference guide documents in `/guide/` to understand what sub-agents produce

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
