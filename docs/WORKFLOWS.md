# Workflow Documentation

## Overview

Claude Code Server uses **phase-based workflows** to structure task execution. **CRITICAL: Each task type follows a COMPLETELY DIFFERENT workflow** with different phases, steps, deliverables, and agent behaviors.

**Four distinct workflow types**:
- **Phase-A (create_app)**: Full app development cycle - Planning → Design → Development → Testing
- **Phase-B (modify_app)**: Existing code modification - Analysis → Planning → Implementation → Testing
- **Phase-C (workflow)**: Workflow automation - Planning → Design → Development → Testing (workflow-focused)
- **Type-D (custom)**: Free-form conversation - No structured phases

**Sub-agents must identify the task type and follow the corresponding workflow exactly.**

## Workflow Type Comparison

| Aspect | Phase-A (create_app) | Phase-B (modify_app) | Phase-C (workflow) | Type-D (custom) |
|--------|---------------------|---------------------|-------------------|----------------|
| **Purpose** | Create new app from scratch | Modify existing app | Create workflow automation | Free-form tasks |
| **Phase 1** | Planning (9 docs) | Analysis (1 doc) | Planning (workflow reqs) | N/A (single phase) |
| **Phase 2** | Design (5 docs) | Planning (1 doc) | Design (workflow logic) | N/A |
| **Phase 3** | Development (code) | Implementation (code) | Development (code) | N/A |
| **Phase 4** | Testing | Testing | Testing | N/A |
| **Total Documents** | 14 documents | 2 documents | 2 documents | None |
| **Guide Documents** | All 24 guides | Autonomous (no guides) | Adapt Phase-A guides | None |
| **Starting Point** | Blank slate | Existing codebase | Blank slate | User prompt |
| **Code Changes** | Create new codebase | Modify existing code | Create workflow code | Varies |
| **Verification** | 3 verification guides | Custom verification | Custom verification | None |
| **Review Gates** | After each phase (4 gates) | After each phase (4 gates) | After each phase (4 gates) | None |
| **Key Challenge** | Complete planning & design | Preserve existing functionality | Integration & triggers | User satisfaction |
| **Example Task** | "Build a todo app with React" | "Add dark mode to existing app" | "Send Slack msg on GitHub PR" | "Explain WebSockets" |

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

### Sub-Agent Instructions for create_app (Phase-A)

**Phase 1: Planning (9 Steps)**

**What to do**:
1. Read ALL 9 planning guides in `/guide/planning/` (01_idea.md through 09_roadmap.md)
2. Generate 9 comprehensive planning documents in `docs/planning/`
3. Each document must be ≥500 characters with complete, specific content
4. NO placeholders like "TODO", "TBD", "[Insert X]", "Coming soon"
5. Ensure consistency across all documents (e.g., tech stack in 08_tech matches architecture in Phase 2)

**Critical requirements**:
- All 9 files must exist: `docs/planning/01_idea.md` through `09_roadmap.md`
- Each file must have proper sections as defined in guide documents
- Use specific examples, not generic descriptions
- Define clear target users, features, and business model

**Phase 2: Design (5 Steps)**

**What to do**:
1. Read ALL 5 design guides in `/guide/design/` (01_screen.md through 05_architecture.md)
2. Generate 5 detailed design documents in `docs/design/`
3. Create specific data models with field types (not just entity names)
4. Design complete API specs with methods, paths, request/response schemas
5. Document system architecture with components and data flow

**Critical requirements**:
- All 5 files must exist: `docs/design/01_screen.md` through `05_architecture.md`
- Data models must include: entity names, fields, types, relationships
- API specs must include: HTTP method, path, request body, response, status codes
- Architecture must be feasible and match the tech stack from Phase 1

**Phase 3: Development (6 Steps)**

**What to do**:
1. Read ALL 6 development guides in `/guide/development/` (01_setup.md through 06_deploy.md)
2. Create complete, working codebase following the design from Phase 2
3. Implement all features defined in Phase 1 planning documents
4. Write tests (unit, integration, or e2e as appropriate)
5. Create deployment configuration
6. Write comprehensive README.md with setup instructions

**Critical requirements**:
- Project structure matches the tech stack (e.g., Next.js structure for Next.js project)
- All key files present: package.json, .gitignore, README.md, config files
- Tests included with passing status
- No hardcoded secrets (use .env with .env.example)
- .env file must be in .gitignore
- README includes: installation steps, how to run, how to test

**Phase 4: Testing**

**What to do**:
1. Verification agent runs automated checks
2. If verification passes, user review is created
3. If verification fails, agent reworks (max 3 attempts)
4. Final validation before task completion

---

### 2. modify_app - Existing Application Modification

**Purpose**: Modify, enhance, or fix existing applications

**Workflow**: 4-Phase-B

```
Phase 1: Analysis (분석) - Understand current state
    ↓
Phase 2: Planning (계획) - Plan modifications
    ↓
Phase 3: Implementation (구현) - Execute changes
    ↓
Phase 4: Testing (검증) - Verify changes
```

#### Phase 1: Analysis (3 Steps)

**Purpose**: Thoroughly understand the existing codebase before making any changes

| Step | Task | Details |
|------|------|---------|
| 1 | **Codebase Analysis** | Read and understand existing code structure, patterns, architecture |
| 2 | **Dependency Analysis** | Identify dependencies, external services, database schemas |
| 3 | **Impact Analysis** | Assess which components will be affected by the requested changes |

**Deliverable**: `docs/analysis/current_state.md`

**Document must include**:
- Project structure overview
- Key components and their responsibilities
- Data models and database schema
- API endpoints (if applicable)
- External dependencies and services
- Current implementation patterns
- Areas to be modified
- Potential impact on other components

**Verification Criteria**:
- ✅ Complete codebase structure documented
- ✅ All relevant files and components identified
- ✅ Dependencies clearly listed
- ✅ Impact assessment is specific and accurate
- ✅ Document ≥1000 characters

#### Phase 2: Planning (4 Steps)

**Purpose**: Create a detailed plan for modifications with risk assessment

| Step | Task | Details |
|------|------|---------|
| 1 | **Requirements Definition** | Define exactly what needs to change and why |
| 2 | **Modification Plan** | Plan specific code changes, file by file |
| 3 | **Risk Assessment** | Identify risks and mitigation strategies |
| 4 | **Testing Strategy** | Plan how to verify changes work and don't break existing features |

**Deliverable**: `docs/planning/modification_plan.md`

**Document must include**:
- Clear requirements (what to add/modify/remove)
- Detailed modification plan:
  - Files to be created
  - Files to be modified (with specific changes)
  - Files to be deleted
- Step-by-step implementation approach
- Risk assessment:
  - Breaking changes risks
  - Performance impact
  - Security considerations
  - Backward compatibility
- Testing strategy:
  - Which existing tests must pass
  - New tests to be written
  - Manual testing scenarios

**Verification Criteria**:
- ✅ Requirements clearly defined
- ✅ File-level change plan provided
- ✅ Risks identified with mitigation strategies
- ✅ Testing strategy is comprehensive
- ✅ Document ≥800 characters

#### Phase 3: Implementation (6 Steps)

**Purpose**: Carefully implement planned changes while preserving existing functionality

| Step | Task | Details |
|------|------|---------|
| 1 | **Code Modification** | Implement the planned changes to existing files |
| 2 | **Refactoring** | Improve code quality if needed (without changing behavior) |
| 3 | **Documentation Update** | Update inline comments, README, and other docs |
| 4 | **Dependency Update** | Update package.json, requirements.txt, etc. if needed |
| 5 | **Configuration Update** | Update config files (.env.example, configs, etc.) |
| 6 | **Build Verification** | Ensure project builds without errors |

**Deliverable**: Modified codebase

**Critical requirements**:
- Preserve existing functionality (no unintended breaking changes)
- Follow existing code style and patterns
- Update all affected imports and references
- Keep existing tests passing (unless intentionally changed)
- Add new tests for new functionality
- Update documentation to reflect changes
- If new dependencies added, document them
- If config changes needed, update .env.example

**Verification Criteria**:
- ✅ All planned changes implemented
- ✅ Existing tests still pass (or properly updated)
- ✅ New tests added for new functionality
- ✅ Code builds without errors
- ✅ Documentation updated
- ✅ No hardcoded secrets added
- ✅ Code style matches existing patterns

#### Phase 4: Testing (3 Steps)

**Purpose**: Verify modifications work correctly and don't introduce regressions

| Step | Task | Details |
|------|------|---------|
| 1 | **Run Existing Tests** | Ensure all existing tests pass (no regressions) |
| 2 | **Add New Tests** | Write and run tests for new functionality |
| 3 | **Manual Testing** | Manually verify changes work as expected |

**Deliverable**: Test results and verification report

**Testing checklist**:
- [ ] All existing unit tests pass
- [ ] All existing integration tests pass
- [ ] All existing e2e tests pass (if applicable)
- [ ] New tests written for new features
- [ ] New tests pass
- [ ] Manual testing performed:
  - [ ] New functionality works
  - [ ] Existing functionality not broken
  - [ ] Edge cases handled
  - [ ] Error handling works
- [ ] No console errors
- [ ] Performance acceptable

**Verification Criteria**:
- ✅ Test results documented
- ✅ All tests passing (or failures explained)
- ✅ Manual testing scenarios executed
- ✅ No regressions identified

### Sub-Agent Instructions for modify_app (Phase-B)

**CRITICAL DIFFERENCES from create_app**:
- Start with EXISTING codebase (not blank slate)
- NO planning guides to read (analyze autonomously)
- Focus on PRESERVATION of existing functionality
- Smaller, focused deliverables (2 docs instead of 14)

**Phase 1: Analysis - What to do**:
1. Request access to existing codebase (may trigger dependency request for file access)
2. Read and understand the entire project structure
3. Identify key components, data models, APIs
4. Document current state thoroughly in `docs/analysis/current_state.md`
5. Identify exactly which parts need to be modified

**DO NOT**:
- Make any code changes yet
- Skip analysis phase
- Assume how things work without reading code

**Phase 2: Planning - What to do**:
1. Define clear requirements for what needs to change
2. Create file-by-file modification plan
3. Assess risks (breaking changes, dependencies, performance)
4. Plan testing strategy (existing tests + new tests)
5. Document everything in `docs/planning/modification_plan.md`

**DO NOT**:
- Start implementing without a plan
- Ignore risks and backward compatibility
- Forget to plan for testing

**Phase 3: Implementation - What to do**:
1. Follow the modification plan exactly
2. Make changes incrementally (one component at a time)
3. Preserve existing code style and patterns
4. Update all related files (imports, configs, docs)
5. Ensure project builds after each change
6. Write tests for new functionality

**DO NOT**:
- Make unplanned changes
- Break existing functionality
- Ignore existing code style
- Forget to update documentation
- Add hardcoded secrets

**Phase 4: Testing - What to do**:
1. Run all existing tests and verify they pass
2. Run new tests for new functionality
3. Perform manual testing of changed features
4. Document test results
5. Verify no regressions introduced

**DO NOT**:
- Skip testing existing functionality
- Assume existing tests are sufficient for new features
- Ignore test failures

---

### 3. workflow - Workflow Automation

**Purpose**: Create automated workflows and integrations

**Workflow**: 4-Phase-C

```
Phase 1: Planning (기획) - Define workflow requirements
    ↓
Phase 2: Design (설계) - Design workflow logic
    ↓
Phase 3: Development (개발) - Implement workflow
    ↓
Phase 4: Testing (테스트) - Test workflow execution
```

**Workflow-Specific Focus**:
- **Triggers**: Schedule (cron), webhook, manual, event-based
- **Steps**: Actions, conditions, loops, parallel execution
- **Integrations**: External services (Slack, GitHub, email, databases)
- **Error Handling**: Retries, fallbacks, notifications
- **State Management**: Workflow state, data passing between steps

#### Phase 1: Planning (Workflow Requirements)

**Purpose**: Define comprehensive workflow requirements including triggers and integrations

**Deliverable**: `docs/planning/workflow_requirements.md`

**Document must include**:

1. **Workflow Overview**:
   - Name and purpose
   - What problem it solves
   - Expected outcomes

2. **Trigger Definition**:
   - **Type**: schedule | webhook | manual | event
   - **Configuration**:
     - Schedule: Cron expression (e.g., `0 9 * * 1-5` for weekdays at 9am)
     - Webhook: Expected payload structure, authentication
     - Manual: Input parameters
     - Event: Event source and filters

3. **Workflow Steps** (high-level):
   - Step 1: Action name and purpose
   - Step 2: Action name and purpose
   - ...
   - Conditions and branching logic
   - Loop/iteration requirements

4. **External Integrations**:
   - Service 1: Purpose, API used, authentication method
   - Service 2: Purpose, API used, authentication method
   - ...

5. **Data Requirements**:
   - Input data (from trigger)
   - Data passed between steps
   - Output data (result)

6. **Error Handling Requirements**:
   - Retry strategies
   - Fallback behaviors
   - Error notifications

7. **Success Criteria**:
   - How to determine workflow succeeded
   - Expected execution time
   - Performance requirements

**Verification Criteria**:
- ✅ Trigger type and config clearly defined
- ✅ All workflow steps listed
- ✅ External integrations identified
- ✅ Error handling strategy specified
- ✅ Document ≥800 characters

#### Phase 2: Design (Workflow Logic)

**Purpose**: Design detailed workflow logic with step-by-step execution plan

**Deliverable**: `docs/design/workflow_design.md`

**Document must include**:

1. **Workflow Diagram** (text-based or mermaid):
```
Trigger → Step 1 → Condition → Step 2A
                            └→ Step 2B → Step 3 → End
```

2. **Step Definitions** (detailed):

For each step:
```
Step N: [Name]
  Purpose: What this step does
  Input: Data received from previous step
  Action: Specific action to perform
  Integration: External service API call (if any)
  Output: Data produced for next step
  Error Handling: What happens if this step fails
  Retry: Retry count and delay
```

3. **Condition Logic**:
   - If/else conditions
   - Switch cases
   - Filtering logic

4. **Loop Logic** (if applicable):
   - Iteration over arrays
   - While loop conditions
   - Break/continue criteria

5. **Data Flow**:
   - Data structure at each step
   - Data transformations
   - Variables and state

6. **Integration Specifications**:

For each integration:
```
Service: [Name]
  API Endpoint: [URL]
  Method: GET/POST/PUT/DELETE
  Authentication: API key / OAuth / Basic
  Request: [Structure]
  Response: [Structure]
  Rate Limits: [Limits]
  Error Codes: [Codes and meanings]
```

7. **State Management**:
   - Workflow state structure
   - State persistence (if needed)
   - State cleanup

**Verification Criteria**:
- ✅ Workflow diagram provided
- ✅ All steps defined in detail
- ✅ Conditions and loops specified
- ✅ Data flow documented
- ✅ Integration specs complete
- ✅ Document ≥1000 characters

#### Phase 3: Development (Workflow Implementation)

**Purpose**: Implement the workflow with all triggers, steps, and integrations

**Deliverable**: Complete workflow codebase

**Implementation must include**:

1. **Project Structure**:
```
workflow-project/
├── src/
│   ├── triggers/
│   │   ├── schedule.js       # Schedule trigger handler
│   │   ├── webhook.js        # Webhook trigger handler
│   │   └── manual.js         # Manual trigger handler
│   ├── steps/
│   │   ├── step1.js          # Each workflow step
│   │   ├── step2.js
│   │   └── ...
│   ├── integrations/
│   │   ├── slack.js          # External service clients
│   │   ├── github.js
│   │   └── ...
│   ├── utils/
│   │   ├── error-handler.js  # Error handling utilities
│   │   └── retry.js          # Retry logic
│   └── workflow.js           # Main workflow orchestrator
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end workflow tests
├── config/
│   ├── workflow.config.js    # Workflow configuration
│   └── integrations.config.js
├── .env.example              # Environment variable template
├── package.json
└── README.md
```

2. **Trigger Implementation**:
   - Schedule: Cron job setup
   - Webhook: HTTP endpoint with validation
   - Manual: CLI or API endpoint
   - Event: Event listener and handler

3. **Step Implementation**:
   - Each step as a separate function/class
   - Input validation
   - Action execution
   - Output generation
   - Error handling with retries

4. **Integration Clients**:
   - API client for each external service
   - Authentication handling
   - Request/response transformation
   - Error handling
   - Rate limit handling

5. **Workflow Orchestrator**:
   - Execute steps in correct order
   - Handle conditions and branching
   - Manage data flow between steps
   - Handle errors and retries
   - Log execution progress

6. **Configuration**:
   - Workflow settings (timeouts, retries, etc.)
   - Integration credentials (via env vars)
   - Environment-specific configs

7. **Tests**:
   - Unit tests for each step
   - Integration tests for external services (with mocks)
   - End-to-end workflow tests
   - Error scenario tests

**Verification Criteria**:
- ✅ All triggers implemented
- ✅ All steps implemented
- ✅ All integrations working
- ✅ Error handling with retries
- ✅ Tests included and passing
- ✅ Configuration via env vars
- ✅ No hardcoded credentials
- ✅ README with setup and usage instructions

#### Phase 4: Testing (Workflow Execution)

**Purpose**: Test all trigger types, workflow steps, and error scenarios

**Deliverable**: Test results and execution logs

**Testing checklist**:

1. **Trigger Testing**:
   - [ ] Schedule trigger fires at correct times
   - [ ] Webhook receives and validates payloads correctly
   - [ ] Manual trigger accepts correct inputs
   - [ ] Event trigger listens and responds to events

2. **Step Testing**:
   - [ ] Each step executes correctly in isolation
   - [ ] Steps handle inputs correctly
   - [ ] Steps produce expected outputs
   - [ ] Conditions and branching work correctly
   - [ ] Loops iterate correctly

3. **Integration Testing**:
   - [ ] External service calls succeed
   - [ ] Authentication works
   - [ ] Request/response handling correct
   - [ ] Rate limits respected
   - [ ] API errors handled gracefully

4. **End-to-End Testing**:
   - [ ] Complete workflow executes successfully
   - [ ] Data flows correctly between steps
   - [ ] Final output is correct
   - [ ] Execution time acceptable

5. **Error Scenario Testing**:
   - [ ] Step failures trigger retries
   - [ ] Max retries exceeded triggers fallback
   - [ ] Network errors handled
   - [ ] Invalid inputs rejected
   - [ ] Error notifications sent

6. **Performance Testing**:
   - [ ] Workflow completes within expected time
   - [ ] No memory leaks
   - [ ] Resource usage acceptable

**Verification Criteria**:
- ✅ All tests documented and executed
- ✅ All tests passing (or failures explained)
- ✅ Error scenarios tested
- ✅ Execution logs captured
- ✅ Performance acceptable

### Sub-Agent Instructions for workflow (Phase-C)

**CRITICAL DIFFERENCES from create_app and modify_app**:
- Focus on **automation and integration** (not full app)
- Trigger-driven execution (not user-driven UI)
- External service integrations are CRITICAL
- Error handling and retries are ESSENTIAL
- Smaller codebase but more complex orchestration

**Phase 1: Planning - What to do**:
1. Clearly define the workflow trigger (schedule/webhook/manual/event)
2. Break down the workflow into discrete steps
3. Identify ALL external services needed
4. Plan error handling and retry strategies
5. Document in `docs/planning/workflow_requirements.md`

**DO NOT**:
- Create vague step definitions
- Forget to specify trigger configuration
- Ignore error handling
- Miss external service requirements

**Phase 2: Design - What to do**:
1. Create workflow diagram showing all steps and conditions
2. Define each step in detail (input, action, output, errors)
3. Specify API calls for each integration
4. Design data flow between steps
5. Document in `docs/design/workflow_design.md`

**DO NOT**:
- Skip workflow diagram
- Leave integration specs incomplete
- Ignore data transformation requirements
- Forget about state management

**Phase 3: Development - What to do**:
1. Create proper project structure (triggers, steps, integrations)
2. Implement trigger handlers
3. Implement each workflow step
4. Create integration clients with error handling
5. Build workflow orchestrator
6. Write comprehensive tests
7. Document setup and usage in README

**DO NOT**:
- Hardcode credentials (use env vars)
- Skip error handling and retries
- Forget integration tests
- Ignore rate limits for external APIs
- Create monolithic code (separate concerns)

**Phase 4: Testing - What to do**:
1. Test each trigger type
2. Test each step individually
3. Test all integrations (with mocks if needed)
4. Run end-to-end workflow tests
5. Test error scenarios and retries
6. Document all test results

**DO NOT**:
- Skip testing error scenarios
- Forget to test all trigger types
- Ignore integration testing
- Assume external APIs are always available

---

### 4. custom - Free-form Conversation

**Purpose**: Handle miscellaneous tasks that don't fit structured workflows

**Workflow**: Type-D (No structured phases)

```
User prompt → Agent response → Iterative conversation → Completion
```

**Characteristics**:
- No fixed phases or deliverables
- No guide documents to follow
- No formal verification or review gates
- Agent uses autonomous decision-making
- Conversational, iterative approach

**Use Cases**:
- Q&A and explanations ("Explain how WebSockets work")
- Code review ("Review this code for security issues")
- Debugging help ("Why is this error happening?")
- Quick tasks ("Write a regex to validate email")
- Research ("Find best practices for React state management")
- Comparisons ("Compare REST vs GraphQL")

**Sub-Agent Instructions for custom (Type-D)**:

**What to do**:
1. Read and understand the user's request
2. Respond naturally and helpfully
3. If clarification needed, ask questions
4. Provide thorough, accurate answers
5. If code is needed, generate it
6. If research is needed, explain findings
7. Signal completion when task is done

**DO NOT**:
- Try to follow Phase-A/B/C workflows
- Create formal deliverable documents
- Wait for review gates
- Request dependencies unless truly needed
- Over-structure the response

**How to signal completion**:
- Simply state "Task completed" or similar
- No formal phase completion protocol needed
- Agent can continue conversation if user has follow-up questions

**Examples**:

Example 1: Explanation request
```
User: "Explain how JWT authentication works"
Agent: [Provides detailed explanation]
Agent: "I've explained JWT authentication including structure, signing, and verification. Is there anything specific you'd like me to elaborate on?"
```

Example 2: Code generation
```
User: "Write a function to debounce API calls"
Agent: [Generates debounce function with explanation]
Agent: "Here's a debounce function implementation. Would you like me to explain how it works or modify it for your specific use case?"
```

Example 3: Debugging help
```
User: "Why am I getting 'Cannot read property of undefined'?"
Agent: "This error occurs when... [explanation]"
Agent: "To fix this, you can... [solutions]"
Agent: "Would you like me to review your code to identify the exact cause?"
```

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

### Automated Verification (Workflow-Specific)

**CRITICAL**: Verification criteria differ based on workflow type. The verification agent must identify the task type and apply the correct criteria.

### Verification for Phase-A (create_app)

After each phase completion, verification agent checks:

**Phase 1 (Planning) - 9 Documents**:
- ✅ All 9 files exist: `docs/planning/01_idea.md` through `09_roadmap.md`
- ✅ Each document ≥500 characters
- ✅ No placeholders: `[TODO]`, `[TBD]`, `[Insert X]`, `Coming soon`, `To be defined`
- ✅ Section completeness (all sections from guide filled)
- ✅ Information consistency:
  - Tech stack consistent between 08_tech.md and future phases
  - Features in 07_features.md align with product scope in 06_product.md
  - Target users consistent between 03_persona.md and other docs
- ✅ Proper markdown formatting
- ✅ Specific content (not generic templates)

**Phase 2 (Design) - 5 Documents**:
- ✅ All 5 files exist: `docs/design/01_screen.md` through `05_architecture.md`
- ✅ Each document ≥500 characters
- ✅ Data model defined with specifics:
  - Entity names listed
  - Fields with types (string, number, boolean, etc.)
  - Relationships documented
- ✅ API specs complete:
  - HTTP methods (GET, POST, PUT, DELETE)
  - Paths (e.g., `/api/users/:id`)
  - Request body structure
  - Response structure
  - Status codes
- ✅ Architecture diagram or detailed description present
- ✅ Designs are specific and feasible (not vague)
- ✅ Consistency with Phase 1:
  - Tech stack matches 08_tech.md
  - Features match 07_features.md

**Phase 3 (Development) - Codebase**:
- ✅ Project structure correct for chosen tech stack
- ✅ Key files present:
  - `package.json` (Node.js) or equivalent
  - `.gitignore`
  - `README.md`
  - Configuration files
- ✅ Tests included (unit, integration, or e2e)
- ✅ Tests are passing
- ✅ `.env` listed in `.gitignore`
- ✅ `.env.example` provided (if env vars needed)
- ✅ No hardcoded secrets (API keys, passwords, tokens)
- ✅ README includes:
  - Project description
  - Installation steps
  - How to run
  - How to test
  - Environment variables needed
- ✅ Code quality:
  - No syntax errors
  - No obvious bugs
  - Proper error handling
  - Comments where needed

### Verification for Phase-B (modify_app)

**Phase 1 (Analysis) - 1 Document**:
- ✅ File exists: `docs/analysis/current_state.md`
- ✅ Document ≥1000 characters
- ✅ Project structure documented
- ✅ Key components identified
- ✅ Dependencies listed
- ✅ Impact assessment provided
- ✅ Areas to modify clearly identified
- ✅ Analysis is accurate (verified against actual codebase)

**Phase 2 (Planning) - 1 Document**:
- ✅ File exists: `docs/planning/modification_plan.md`
- ✅ Document ≥800 characters
- ✅ Requirements clearly defined
- ✅ File-level change plan provided:
  - Files to create (with purpose)
  - Files to modify (with changes)
  - Files to delete (with reason)
- ✅ Risk assessment included
- ✅ Testing strategy defined
- ✅ Plan is realistic and specific

**Phase 3 (Implementation) - Modified Code**:
- ✅ All planned changes implemented
- ✅ Existing functionality preserved (no unintended breaking changes)
- ✅ Code style matches existing patterns
- ✅ All imports and references updated
- ✅ Documentation updated to reflect changes
- ✅ New dependencies documented (if any)
- ✅ Configuration files updated (if needed)
- ✅ `.env.example` updated (if new env vars added)
- ✅ No hardcoded secrets
- ✅ Project builds without errors

**Phase 4 (Testing) - Test Results**:
- ✅ Test results documented
- ✅ All existing tests still pass (or updated appropriately)
- ✅ New tests added for new functionality
- ✅ New tests pass
- ✅ Manual testing documented
- ✅ No regressions identified

### Verification for Phase-C (workflow)

**Phase 1 (Planning) - Workflow Requirements**:
- ✅ File exists: `docs/planning/workflow_requirements.md`
- ✅ Document ≥800 characters
- ✅ Workflow overview provided
- ✅ Trigger type and configuration defined
- ✅ Workflow steps listed (high-level)
- ✅ External integrations identified
- ✅ Error handling strategy specified
- ✅ Success criteria defined
- ✅ Requirements are specific and actionable

**Phase 2 (Design) - Workflow Logic**:
- ✅ File exists: `docs/design/workflow_design.md`
- ✅ Document ≥1000 characters
- ✅ Workflow diagram provided (text or mermaid)
- ✅ All steps defined in detail:
  - Input, action, output
  - Error handling, retries
- ✅ Conditions and branching logic specified
- ✅ Data flow documented
- ✅ Integration specifications complete:
  - API endpoints, methods
  - Authentication methods
  - Request/response structures
- ✅ State management defined (if needed)
- ✅ Design is feasible and complete

**Phase 3 (Development) - Workflow Code**:
- ✅ Project structure appropriate for workflow
- ✅ Trigger handlers implemented (schedule/webhook/manual/event)
- ✅ All workflow steps implemented
- ✅ Integration clients implemented
- ✅ Error handling with retries
- ✅ Configuration via env vars (no hardcoded credentials)
- ✅ Tests included:
  - Unit tests for steps
  - Integration tests for external services
  - End-to-end workflow tests
- ✅ Tests passing
- ✅ README with setup and usage instructions
- ✅ `.env.example` provided
- ✅ Code builds and runs without errors

**Phase 4 (Testing) - Workflow Execution**:
- ✅ All trigger types tested
- ✅ All steps tested individually
- ✅ All integrations tested
- ✅ End-to-end workflow tested
- ✅ Error scenarios tested
- ✅ Test results documented
- ✅ All tests passing
- ✅ Performance acceptable

### Verification for Type-D (custom)

**No formal verification** - custom tasks have no structured deliverables or phases.

Quality assessed by:
- User satisfaction with response
- Accuracy of information provided
- Helpfulness of answer
- Completeness of solution

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
