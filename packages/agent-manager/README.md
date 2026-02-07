# Agent Manager

## Overview

The `agent-manager` package is the orchestration layer that manages Claude Code agent processes. It handles agent lifecycle, work assignment, state tracking, token management, checkpoints, and protocol communication.

## Responsibilities

### Core Functions

1. **Lifecycle Management**: Create, start, pause, resume, cancel, and terminate agent processes
2. **Work Distribution**: Assign tasks to agents based on type, priority, and dependencies
3. **State Tracking**: Monitor and report agent status, phase progress, and current actions
4. **Token Management**: Track token usage, calculate costs, handle rate limits
5. **Checkpoint System**: Save and restore agent state for recovery
6. **Protocol Handling**: Parse and respond to agent communication protocols
7. **Queue Management**: Manage task queues with priority and dependency handling

## Key Interfaces

```typescript
// Agent Status
interface AgentStatus {
  taskId: string;
  status: 'idle' | 'running' | 'waiting_review' | 'waiting_dependency' |
          'waiting_question' | 'paused' | 'completed' | 'failed';
  currentPhase: number | null;
  currentStep: string | null;
  progress: number;
  tokensUsed: number;
  lastUpdate: string;
}

// Checkpoint
interface TaskCheckpoint {
  taskId: string;
  checkpointId: string;
  reason: 'auto' | 'rate_limit' | 'manual' | 'error';
  executionState: {
    conversationHistory: ConversationEntry[];
    currentPhase: number | null;
    progress: number;
  };
  resumeContext: {
    pendingActions: string[];
    environmentState: Record<string, unknown>;
  };
}

// Queue Entry
interface QueuedTask {
  taskId: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'queued' | 'waiting_rate_limit' | 'ready' | 'executing';
  dependsOn: string[];
}
```

## Agent Lifecycle

```
idle → running → [waiting_*] → completed
                      ↓
                   paused → running
                      ↓
                   failed
```

### Lifecycle Operations

- **Create**: Spawn new Claude Code process
- **Start**: Send initial task prompt
- **Pause**: Suspend execution (SIGTSTP)
- **Resume**: Continue execution (SIGCONT)
- **Cancel**: Gracefully terminate
- **Terminate**: Force kill (SIGKILL)

## Protocol Detection

The agent manager parses sub-agent output to detect:

1. **Dependency Requests**: `[DEPENDENCY_REQUEST]...[/DEPENDENCY_REQUEST]`
2. **User Questions**: `[USER_QUESTION]...[/USER_QUESTION]`
3. **Phase Completion**: `=== PHASE N COMPLETE ===`
4. **Errors**: `[ERROR]...[/ERROR]`
5. **Token Usage**: Output parsing for token metrics

## Token Tracking

Tracks four token types:
- `inputTokens`: Input tokens consumed
- `outputTokens`: Output tokens generated
- `cacheCreationInputTokens`: Prompt cache creation
- `cacheReadInputTokens`: Prompt cache reads

Calculates costs based on Claude pricing:
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- Cache Creation: $3.75 / 1M tokens
- Cache Read: $0.30 / 1M tokens

## Rate Limit Handling

When rate limit detected:
1. Create checkpoint (save state)
2. Pause agent process
3. Update status to `waiting_rate_limit`
4. Schedule auto-resume after reset time
5. Notify user

## Checkpoint System

**Auto-checkpoints** created on:
- Rate limit hit
- Error occurred
- Manual pause
- Phase completion

**Checkpoint contains**:
- Full conversation history
- Current phase and step
- Environment state
- Pending actions

**Recovery**:
- Restore conversation context
- Reinject environment variables
- Resume from last checkpoint

## Queue Management

Priority-based task queue:
- **Critical**: User-blocked tasks
- **High**: Time-sensitive tasks
- **Normal**: Regular tasks
- **Low**: Background tasks

Queue features:
- FIFO within priority levels
- Dependency checking
- Rate limit awareness
- Auto-retry on failure

## Dependencies

```json
{
  "node": ">=18.0.0",
  "child_process": "built-in",
  "fs": "built-in"
}
```

## Usage

```typescript
// Create and start agent
const agent = await createSubAgent(task);
await startTask(task.id);

// Monitor status
const status = getAgentStatus(task.id);

// Handle protocol events
onDependencyRequest(task.id, async (request) => {
  await pauseAgent(task.id, 'Waiting for dependency');
  notifyUser(task.id, { type: 'dependency_required', data: request });
});

// Provide dependency and resume
await provideDependency(task.id, dependencyId, value);
await resumeAgent(task.id);
```

## Related Components

- **Web Server**: `/packages/claude-code-server` - API gateway and UI
- **Sub-Agent**: `/packages/sub-agent` - Task execution layer
- **Core**: `/packages/core` - Shared domain logic

## Development Guide

See `CLAUDE.md` in this directory for comprehensive guide including:
- Lifecycle management patterns
- Work assignment protocols
- State tracking implementation
- Token management
- Checkpoint system design
- Protocol parsing logic
- Queue management algorithms

## Best Practices

1. **Always checkpoint** before pausing or terminating
2. **Parse protocols strictly** - validate all extracted data
3. **Monitor tokens continuously** to prevent rate limits
4. **Handle errors gracefully** with recovery attempts
5. **Log comprehensively** for debugging and auditing
6. **Update status frequently** to keep UI responsive
7. **Clean up resources** - close handles, terminate processes

## Documentation

- **Operation Guide**: `CLAUDE.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **Features**: `/docs/FEATURES.md`
- **Protocols**: `/docs/FEATURES.md` (Section D)
