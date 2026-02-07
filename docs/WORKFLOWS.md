# Workflow Documentation

## Overview

Claude Code Server uses **phase-based workflows** to structure task execution. Each task type follows a specific workflow with defined phases, steps, and deliverables.

## Task Type Workflows

### 1. create_app - New Application Development

**Purpose**: Create new applications from scratch

**Workflow**: 4-Phase-A

```
Phase 1: Planning (기획) - 9 steps
    ↓
Phase 2: Design (설계) - 5 steps
    ↓
Phase 3: Development (개발) - 6 steps
    ↓
Phase 4: Testing (테스트) - Validation
```

#### Phase 1: Planning (9 Steps)

| Step | Guide Document | Deliverable | Purpose |
|------|----------------|-------------|---------|
| 1 | `/guide/planning/01_idea.md` | `docs/planning/01_idea.md` | Define core idea, problem, solution |
| 2 | `/guide/planning/02_market.md` | `docs/planning/02_market.md` | Analyze market, competitors, opportunities |
| 3 | `/guide/planning/03_persona.md` | `docs/planning/03_persona.md` | Define target user personas |
| 4 | `/guide/planning/04_user_journey.md` | `docs/planning/04_user_journey.md` | Map user journeys and touchpoints |
| 5 | `/guide/planning/05_business_model.md` | `docs/planning/05_business_model.md` | Define business model and revenue |
| 6 | `/guide/planning/06_product.md` | `docs/planning/06_product.md` | Define product scope and requirements |
| 7 | `/guide/planning/07_features.md` | `docs/planning/07_features.md` | Specify features and priorities |
| 8 | `/guide/planning/08_tech.md` | `docs/planning/08_tech.md` | Select technology stack |
| 9 | `/guide/planning/09_roadmap.md` | `docs/planning/09_roadmap.md` | Create development roadmap |

**Verification**: `/guide/verification/phase1_verification.md`

**Criteria**:
- ✅ All 9 documents exist
- ✅ Each document ≥500 characters
- ✅ No placeholders
- ✅ Consistent information
- ✅ Proper formatting

#### Phase 2: Design (5 Steps)

| Step | Guide Document | Deliverable | Purpose |
|------|----------------|-------------|---------|
| 1 | `/guide/design/01_screen.md` | `docs/design/01_screen.md` | Design screens and wireframes |
| 2 | `/guide/design/02_data_model.md` | `docs/design/02_data_model.md` | Define data models and schemas |
| 3 | `/guide/design/03_task_flow.md` | `docs/design/03_task_flow.md` | Map task flows and interactions |
| 4 | `/guide/design/04_api.md` | `docs/design/04_api.md` | Design API endpoints and specs |
| 5 | `/guide/design/05_architecture.md` | `docs/design/05_architecture.md` | Define system architecture |

**Verification**: `/guide/verification/phase2_verification.md`

**Criteria**:
- ✅ All 5 documents exist
- ✅ Data model clearly defined
- ✅ API specs complete
- ✅ Architecture documented
- ✅ Feasible designs

#### Phase 3: Development (6 Steps)

| Step | Guide Document | Deliverable | Purpose |
|------|----------------|-------------|---------|
| 1 | `/guide/development/01_setup.md` | Project structure | Initialize project and dependencies |
| 2 | `/guide/development/02_data.md` | Database/models | Implement data layer |
| 3 | `/guide/development/03_logic.md` | Business logic | Implement core functionality |
| 4 | `/guide/development/04_ui.md` | UI components | Implement user interface |
| 5 | `/guide/development/05_testing.md` | Tests | Write tests |
| 6 | `/guide/development/06_deploy.md` | Deployment config | Prepare for deployment |

**Verification**: `/guide/verification/phase3_verification.md`

**Criteria**:
- ✅ Correct project structure
- ✅ All necessary files present
- ✅ Tests included
- ✅ No hardcoded secrets
- ✅ README with instructions

#### Phase 4: Testing

- Automated verification using verification guides
- Quality assurance checks
- Final validation before completion

---

### 2. modify_app - Existing Application Modification

**Purpose**: Modify, enhance, or fix existing applications

**Workflow**: 4-Phase-B

```
Phase 1: Analysis - Understand current state
    ↓
Phase 2: Planning - Plan modifications
    ↓
Phase 3: Implementation - Execute changes
    ↓
Phase 4: Testing - Verify changes
```

#### Phase 1: Analysis (3 Steps)

1. **Codebase Analysis**: Read and understand existing code
2. **Dependency Analysis**: Identify dependencies and constraints
3. **Impact Analysis**: Assess impact of changes

**Deliverable**: `docs/analysis/current_state.md`

#### Phase 2: Planning (4 Steps)

1. **Requirements Definition**: Define what needs to change
2. **Modification Plan**: Plan specific changes
3. **Risk Assessment**: Identify risks and mitigation
4. **Testing Strategy**: Plan how to verify changes

**Deliverable**: `docs/planning/modification_plan.md`

#### Phase 3: Implementation (6 Steps)

1. **Code Modification**: Implement changes
2. **Refactoring**: Improve code quality if needed
3. **Documentation Update**: Update docs
4. **Dependency Update**: Update dependencies if needed
5. **Configuration Update**: Update configs
6. **Build Verification**: Ensure project builds

**Deliverable**: Modified codebase

#### Phase 4: Testing (3 Steps)

1. **Run Existing Tests**: Ensure no regressions
2. **Add New Tests**: Test new functionality
3. **Manual Testing**: Verify changes work

**Deliverable**: Test results

---

### 3. workflow - Workflow Automation

**Purpose**: Create automated workflows and integrations

**Workflow**: 4-Phase-C

```
Phase 1: Planning - Define workflow requirements
    ↓
Phase 2: Design - Design workflow logic
    ↓
Phase 3: Development - Implement workflow
    ↓
Phase 4: Testing - Test workflow execution
```

Similar to `create_app` but focused on workflow-specific concerns:
- Triggers (schedule, webhook, manual, event)
- Steps (actions, conditions, loops)
- Integrations (external services)
- Error handling and retries

---

### 4. custom - Free-form Conversation

**Purpose**: Handle miscellaneous tasks that don't fit structured workflows

**Workflow**: Single-phase autonomous execution

```
User prompt → Agent response → Iterative conversation
```

No fixed phases - agent responds naturally to user requests.

---

## Review Gate System

After each phase completion (except custom tasks), a **review gate** is triggered:

```
Phase Completion
    ↓
Automatic Deliverable Collection
    ↓
Verification Check (auto)
    ├─ Pass → Create Review
    └─ Fail → Auto-rework (max 3 attempts)
           ├─ Success → Create Review
           └─ Still Fail → Notify user
    ↓
User Review (Web UI)
    ├─ Approve → Next Phase
    └─ Request Changes → Rework
           ↓
           Re-verify → Re-review
```

### Review Process

1. **Agent signals completion**: `=== PHASE N COMPLETE ===`
2. **Platform pauses agent**
3. **Verification agent runs** (separate Claude Code instance)
4. **Verification report generated**
5. **If failed**: Auto-rework (max 3 attempts)
6. **If passed**: Create review for user
7. **User reviews** deliverables via web UI
8. **User approves or requests changes**
9. **If approved**: Agent proceeds to next phase
10. **If changes requested**: Agent addresses feedback and re-submits

### Review UI Features

- View all deliverables (documents, code files)
- Syntax highlighting for code
- Markdown rendering for docs
- File-level comments
- Line-level feedback
- Overall approval/rejection
- Feedback submission

---

## Verification System

### Automated Verification

After phase completion, a verification agent checks:

**Phase 1 (Planning)**:
- Document existence (all 9 files)
- Minimum length (≥500 chars each)
- No placeholders (`[TODO]`, `[Insert X]`)
- Section completeness
- Information consistency

**Phase 2 (Design)**:
- Document existence (all 5 files)
- Data model defined with types
- API specs include methods, paths, request/response
- Architecture diagram or description present
- Designs are specific and feasible

**Phase 3 (Development)**:
- Project structure correct
- Key files present (package.json, etc.)
- Tests included
- `.env` in `.gitignore`
- No hardcoded secrets
- README with setup instructions

### Auto-Rework

If verification fails:

```
Attempt 1: Rework
    ├─ Success → Pass
    └─ Fail → Attempt 2: Rework
           ├─ Success → Pass
           └─ Fail → Attempt 3: Rework
                  ├─ Success → Pass
                  └─ Fail → Notify user (manual intervention)
```

Each rework attempt:
1. Agent receives verification report
2. Agent addresses failed criteria
3. Agent regenerates/fixes deliverables
4. Re-verification runs

---

## Dependency Handling

When agent needs external resources:

```
Agent outputs [DEPENDENCY_REQUEST]
    ↓
Platform detects protocol
    ↓
Agent pauses (SIGTSTP)
    ↓
Checkpoint created
    ↓
User notified (SSE + UI)
    ↓
User provides dependency value
    ↓
Value encrypted and stored
    ↓
Environment variable injected
    ↓
Agent resumes (SIGCONT)
    ↓
Agent continues with dependency available
```

### Dependency Types

- **api_key**: API keys (e.g., OPENAI_API_KEY)
- **env_variable**: Environment variables (e.g., DATABASE_URL)
- **service**: External services (e.g., Redis, PostgreSQL)
- **file**: Files needed (e.g., logo.png, config.json)
- **permission**: Permissions (e.g., docker access)
- **package**: System packages (e.g., ffmpeg)

---

## Question Handling

When agent needs clarification:

```
Agent outputs [USER_QUESTION]
    ↓
Platform detects protocol
    ↓
Agent pauses
    ↓
User notified
    ↓
User answers question
    ↓
Answer sent to agent
    ↓
Agent resumes
    ↓
Agent uses answer to proceed
```

### Question Categories

- **business**: Business decisions (pricing, features, target market)
- **clarification**: Unclear requirements
- **choice**: Multiple valid approaches
- **confirmation**: Confirm major decisions

---

## Checkpoint System

Checkpoints save agent state for recovery:

### Checkpoint Triggers

1. **Auto**: Periodic (every 10 minutes)
2. **Rate Limit**: When API rate limit hit
3. **Manual**: User-initiated pause
4. **Error**: When error occurs
5. **Phase Complete**: After each phase

### Checkpoint Contents

- Conversation history (full context)
- Current phase and step
- Progress percentage
- Environment state
- Pending actions
- Token usage

### Recovery

On resume:
1. Restore conversation history
2. Reinject environment variables
3. Resume from last checkpoint
4. Continue execution

---

## Progress Tracking

Progress calculated as:

```typescript
progress = (
  (completedPhases * 100 / totalPhases) +
  (currentStepProgress * 100 / totalSteps / totalPhases)
) / 100
```

**Example** (create_app at Phase 2, Step 3 of 5):
```
Phase 1: Complete (25%)
Phase 2: In progress (3/5 steps = 15%)
Phase 3: Pending (0%)
Phase 4: Pending (0%)

Total: 25% + 15% = 40%
```

### Real-time Updates

Progress updates sent via SSE:
- Phase started/completed
- Step started/completed
- Document created
- Action performed

---

## Error Handling

### Error Types

1. **Execution Error**: Agent encounters error during execution
2. **Verification Error**: Deliverables fail verification
3. **Rate Limit Error**: API rate limit exceeded
4. **System Error**: Platform or infrastructure error

### Error Recovery

```
Error detected
    ↓
Create checkpoint
    ↓
Pause agent
    ↓
Log error details
    ↓
Notify user
    ↓
Attempt recovery (if possible)
    ├─ Success → Resume
    └─ Fail → Manual intervention
```

---

## State Machine

### Task States

```
draft → pending → in_progress → review → completed
                      ↓
                   failed
```

### Agent States

```
idle → running → waiting_review → running → completed
         ↓            ↓
    waiting_*      paused
         ↓
     running
```

---

## Best Practices

### For Sub-Agents

1. **Read guides before each step**
2. **Follow templates strictly**
3. **Generate complete deliverables** (no placeholders)
4. **Request dependencies early**
5. **Ask clarifying questions when genuinely needed**
6. **Signal progress clearly**
7. **Verify own work before completion**

### For Users

1. **Provide clear task descriptions**
2. **Respond to dependency requests promptly**
3. **Review deliverables thoroughly**
4. **Provide actionable feedback**
5. **Approve phases only when satisfied**
6. **Monitor progress via SSE stream**

### For Platform Operators

1. **Monitor token usage**
2. **Handle rate limits gracefully**
3. **Create checkpoints regularly**
4. **Log all events**
5. **Clean up completed tasks**
6. **Archive deliverables**

---

## Reference Documents

- **Feature Specification**: `FEATURES.md`
- **Architecture**: `ARCHITECTURE.md`
- **API Reference**: `API.md`
- **Planning Guides**: `/guide/planning/*.md`
- **Design Guides**: `/guide/design/*.md`
- **Development Guides**: `/guide/development/*.md`
- **Verification Guides**: `/guide/verification/*.md`
