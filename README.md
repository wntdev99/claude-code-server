# Claude Code Server

**Transform Claude Code CLI into a web-based agent management platform**

## Overview

Claude Code Server enables users to submit complex development tasks through a web browser, where Claude Code agents execute them autonomously with comprehensive progress tracking and interactive user communication.

### Core Value Proposition

- **Web-based Task Management**: Submit tasks via browser instead of CLI
- **Autonomous Agent Execution**: Claude Code agents work independently following structured workflows
- **Progress Tracking**: Real-time monitoring of phase progress, steps, and agent status
- **Interactive Communication**: Agents request dependencies, ask clarifying questions, and await approvals
- **Quality Assurance**: Built-in review gates and automated verification systems

## Architecture

This platform follows a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                         User (Browser)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/SSE
┌────────────────────────▼────────────────────────────────────┐
│                   Web Server Layer                          │
│              (claude-code-server)                           │
│  - Next.js Application                                      │
│  - API Routes (Tasks, Reviews, Dependencies, Questions)     │
│  - SSE Streaming (Real-time logs)                           │
│  - UI Components (shadcn/ui)                                │
└────────────────────────┬────────────────────────────────────┘
                         │ Process Management
┌────────────────────────▼────────────────────────────────────┐
│                  Agent Manager Layer                        │
│                  (agent-manager)                            │
│  - Claude Code Process Lifecycle Management                 │
│  - Work Assignment & Distribution                           │
│  - State & Queue Management                                 │
│  - Token Tracking & Rate Limit Handling                     │
│  - Checkpoint System                                        │
└────────────────────────┬────────────────────────────────────┘
                         │ Task Delegation
┌────────────────────────▼────────────────────────────────────┐
│                   Sub-Agent Layer                           │
│                    (sub-agent)                              │
│  - Task Execution Following Phase-based Workflows           │
│  - Guide Document Reference (24 guides)                     │
│  - Protocol Communication (Dependencies, Questions)         │
│  - Deliverable Generation                                   │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Task Types (4 Types)

| Type | Purpose | Workflow |
|------|---------|----------|
| **create_app** | Create new app/web projects | Planning → Design → Development → Testing (4 Phase-A) |
| **modify_app** | Modify existing apps | Analysis → Planning → Implementation → Testing (4 Phase-B) |
| **workflow** | Workflow automation | Planning → Design → Development → Testing (4 Phase-C) |
| **custom** | Free-form conversation | Prompt-based autonomous execution |

### 2. Phase-Based Workflow System

**Phase 1: Planning (기획)** - 9 steps
- Idea definition, market analysis, persona, user journey, business model, product definition, features, tech stack, roadmap
- **Deliverables**: `docs/planning/*.md` (9 documents)

**Phase 2: Design (설계)** - 5 steps
- Screen design, data model, task flow, API design, architecture
- **Deliverables**: `docs/design/*.md` (5 documents)

**Phase 3: Development (개발)** - 6 steps
- Project setup, data layer, business logic, UI implementation, testing, deployment prep
- **Deliverables**: Working code project

**Phase 4: Testing (테스트)** - Validation & QA
- Automated testing, verification, quality assurance

### 3. Review Gate System

After each phase completion:
1. **Auto-collect deliverables** (documents, code)
2. **User reviews** via web UI
3. **Approval** → Proceed to next phase
4. **Change requests** → Rework and re-review

### 4. Platform-Agent Communication Protocols

**Dependency Requests**
```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file | permission
name: OPENAI_API_KEY
description: Required for OpenAI API calls
required: true
[/DEPENDENCY_REQUEST]
```

**User Questions**
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

**Phase Completion Signals**
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
...
```

**Error Reporting**
```
[ERROR]
type: recoverable | fatal
message: Rate limit exceeded
details: API rate limit hit, will retry after cooldown
recovery: pause_and_retry | checkpoint_and_fail
[/ERROR]
```

### 5. Verification System

- **Automatic verification** after each phase
- **Separate verification agent** checks deliverables
- **Pass** → Proceed to review gate
- **Fail** → Auto-rework (max 3 attempts)

### 6. Real-time Features

- **SSE Log Streaming**: Live agent output
- **Agent Status Tracking**: Current action, phase, step, progress
- **Token Usage Tracking**: Input/output tokens, costs
- **Rate Limit Handling**: Auto-pause and resume

## Project Structure

```
claude-code-server/
├── apps/
│   └── web/                      # Next.js web application
│
├── packages/
│   ├── claude-code-server/       # 🌐 Web server package
│   │   └── CLAUDE.md             # Web server development guide
│   ├── agent-manager/            # 🤖 Agent orchestration layer
│   │   └── CLAUDE.md             # Agent manager operation guide
│   ├── sub-agent/                # ⚙️ Task execution layer
│   │   └── CLAUDE.md             # Sub-agent execution guide
│   ├── core/                     # Shared domain logic
│   └── shared/                   # Common utilities
│
├── guide/                        # 📚 Agent guide documents (24 files)
│   ├── planning/                 # (9 guides)
│   ├── design/                   # (5 guides)
│   ├── development/              # (6 guides)
│   ├── review/                   # (1 guide)
│   └── verification/             # (3 guides)
│
├── docs/                         # 📖 Project documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── FEATURES.md               # Comprehensive specification
│   ├── API.md                    # API documentation
│   ├── WORKFLOWS.md              # Workflow documentation
│   └── DEVELOPMENT.md            # Development guide
│
└── README.md                     # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Claude Code CLI installed and authenticated
- Git

**Install Claude Code CLI**:
```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Authenticate
claude login
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-server.git
cd claude-code-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env (Claude Code CLI auth is separate, no API key needed)

# Run the development server
npm run dev
```

### Usage

1. **Open the web app**: Navigate to `http://localhost:3000`
2. **Create a task**: Click "New Task" and fill in the form
3. **Select task type**: Choose from create_app, modify_app, workflow, or custom
4. **Submit**: The agent will start executing automatically
5. **Monitor progress**: Watch real-time logs and phase progress
6. **Respond to prompts**: Answer questions and provide dependencies when requested
7. **Review deliverables**: Approve or request changes at review gates

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Scheduling**: node-cron
- **Agent Runtime**: Claude Code CLI via child_process
- **Real-time Communication**: Server-Sent Events (SSE)

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Detailed system architecture and component interaction
- **[FEATURES.md](docs/FEATURES.md)**: Comprehensive feature specification (982 lines)
- **[API.md](docs/API.md)**: Complete API reference
- **[WORKFLOWS.md](docs/WORKFLOWS.md)**: Phase-based workflow documentation
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)**: Development environment setup

## Key Differentiators

1. **Structured 3-Phase Workflow**: Planning → Design → Development with clear deliverables
2. **24 Guide Documents**: Detailed guidance ensures consistent quality
3. **Platform-Agent Protocol**: Automated dependency and question handling
4. **Review Gate System**: Phase-by-phase user approval for quality control
5. **Verification System**: Automated quality checks with auto-rework

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Issues](https://github.com/yourusername/claude-code-server/issues)
- Documentation: [docs/](docs/)

---

**Built with Claude Code** - Transforming AI-powered development into a managed platform experience.
