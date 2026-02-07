# Sub-Agent

## Overview

The `sub-agent` package represents the task execution layer. Sub-agents are Claude Code instances that execute user tasks by following phase-based workflows, referencing guide documents, and communicating via structured protocols.

## Responsibilities

### Core Functions

1. **Task Execution**: Execute tasks assigned by agent manager following workflows
2. **Guide Reference**: Consult guide documents for each phase and step
3. **Protocol Communication**: Use structured protocols to request dependencies and ask questions
4. **Deliverable Generation**: Produce high-quality documents and code
5. **Autonomous Decision Making**: Make technical decisions independently when appropriate
6. **Progress Signaling**: Signal phase completion and status updates

## Task Types

### 1. create_app
- **Purpose**: Create new applications
- **Workflow**: Planning (9 steps) → Design (5 steps) → Development (6 steps) → Testing
- **Deliverables**: 14 planning/design documents + working code project

### 2. modify_app
- **Purpose**: Modify existing applications
- **Workflow**: Analysis → Planning → Implementation → Testing
- **Deliverables**: Analysis documents + modified code + tests

### 3. workflow
- **Purpose**: Workflow automation
- **Workflow**: Planning → Design → Development → Testing
- **Deliverables**: Workflow definition + implementation + tests

### 4. custom
- **Purpose**: Free-form conversation
- **Workflow**: Prompt-based autonomous execution
- **Deliverables**: Varies based on user request

## Communication Protocols

### Dependency Request Protocol
```
[DEPENDENCY_REQUEST]
type: api_key | env_variable | service | file | permission
name: OPENAI_API_KEY
description: Required for OpenAI API calls
required: true
[/DEPENDENCY_REQUEST]
```

### User Question Protocol
```
[USER_QUESTION]
category: business | clarification | choice | confirmation
question: What revenue model do you prefer?
options:
  - Subscription
  - Freemium
  - Ad-based
default: Freemium
required: false
[/USER_QUESTION]
```

### Phase Completion Signal
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- ...
```

### Error Protocol
```
[ERROR]
type: missing_file | execution_failed | validation_error
message: Unable to find package.json
details: Expected at /project/package.json
[/ERROR]
```

## Guide Documents

Sub-agents reference 24 guide documents:

### Planning Guides (9)
- `/guide/planning/01_idea.md` - Idea definition
- `/guide/planning/02_market.md` - Market analysis
- `/guide/planning/03_persona.md` - User personas
- `/guide/planning/04_user_journey.md` - User journeys
- `/guide/planning/05_business_model.md` - Business model
- `/guide/planning/06_product.md` - Product definition
- `/guide/planning/07_features.md` - Feature specification
- `/guide/planning/08_tech.md` - Tech stack
- `/guide/planning/09_roadmap.md` - Roadmap

### Design Guides (5)
- `/guide/design/01_screen.md` - Screen design
- `/guide/design/02_data_model.md` - Data model
- `/guide/design/03_task_flow.md` - Task flow
- `/guide/design/04_api.md` - API design
- `/guide/design/05_architecture.md` - Architecture

### Development Guides (6)
- `/guide/development/01_setup.md` - Project setup
- `/guide/development/02_data.md` - Data layer
- `/guide/development/03_logic.md` - Business logic
- `/guide/development/04_ui.md` - UI implementation
- `/guide/development/05_testing.md` - Testing
- `/guide/development/06_deploy.md` - Deployment

### Review & Verification (4)
- `/guide/review/01_review_gate.md` - Review process
- `/guide/verification/phase1_verification.md` - Phase 1 criteria
- `/guide/verification/phase2_verification.md` - Phase 2 criteria
- `/guide/verification/phase3_verification.md` - Phase 3 criteria

## Deliverable Requirements

### Documents
- **Minimum**: 500 characters of meaningful content
- **Format**: Markdown with clear structure
- **Quality**: No placeholders, specific information, proper formatting
- **Completeness**: All required sections from guide templates

### Code
- **Structure**: Standard project organization
- **Quality**: Following best practices and conventions
- **Security**: No hardcoded secrets, proper `.gitignore`
- **Documentation**: README with setup instructions
- **Testing**: Tests for critical functionality

## Verification Criteria

### Phase 1 (Planning)
- ✅ All 9 documents exist
- ✅ Each document ≥500 characters
- ✅ No placeholders or TODOs
- ✅ Consistent information
- ✅ Proper markdown formatting

### Phase 2 (Design)
- ✅ All 5 documents exist
- ✅ Data model clearly defined
- ✅ API specs complete
- ✅ Architecture documented
- ✅ Feasible and clear designs

### Phase 3 (Development)
- ✅ Correct project structure
- ✅ All necessary files present
- ✅ Tests included
- ✅ `.env` in `.gitignore`
- ✅ No hardcoded secrets
- ✅ README with instructions

## Autonomous Execution Principles

### Make Independent Decisions
- Implementation details
- Design choices (within modern standards)
- Technical approaches
- Code organization
- Testing strategies

### Ask Questions For
- Business logic and priorities
- Ambiguous requirements
- Major architectural decisions
- User-specific preferences
- Data privacy considerations

### Never Ask About
- Information already provided
- Industry standards
- Technical decisions within your expertise
- Obvious better approaches

## Typical Execution Flow

```
1. Receive task assignment from agent manager
2. Determine task type and workflow
3. For each phase:
   a. Read phase overview guide
   b. For each step:
      - Read step guide
      - Request dependencies if needed
      - Ask questions if needed
      - Generate deliverable
      - Self-verify completeness
   c. Signal phase completion
   d. Wait for review approval
   e. If approved: next phase
   f. If changes: address feedback
4. Complete task
```

## Runtime Environment

Sub-agents run as Claude Code processes:
- **Command**: `claude --yes --output-dir <dir> --context <guide>`
- **Working Directory**: Task-specific directory
- **Environment**: Injected dependencies and settings
- **Context**: Loaded with sub-agent CLAUDE.md guide

## Related Components

- **Agent Manager**: `/packages/agent-manager` - Orchestration and management
- **Web Server**: `/packages/claude-code-server` - API and UI
- **Guides**: `/guide/*` - Reference documentation

## Development Guide

See `CLAUDE.md` in this directory for comprehensive execution guide including:
- Task type workflows
- Guide document usage
- Communication protocols
- Deliverable generation rules
- Verification criteria
- Autonomous execution guidelines
- Best practices and examples

## Common Issues

### Issue: Incomplete documents
**Solution**: Review minimum character requirement (500) and ensure all sections from guide template are included

### Issue: Generic content
**Solution**: Provide specific, tailored information rather than generic templates

### Issue: Placeholders left in documents
**Solution**: Replace all `[TODO]`, `[Insert X]` placeholders with actual content

### Issue: Hardcoded secrets in code
**Solution**: Use environment variables, add `.env` to `.gitignore`

### Issue: Asking unnecessary questions
**Solution**: Make technical decisions independently, only ask for business/preference decisions

## Documentation

- **Execution Guide**: `CLAUDE.md`
- **Guide Documents**: `/guide/*`
- **Feature Specification**: `/docs/FEATURES.md`
- **Workflow Details**: `/docs/WORKFLOWS.md`
