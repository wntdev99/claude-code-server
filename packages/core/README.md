# Core

## Overview

The `core` package contains shared domain logic, entities, use cases, and business rules used across the Claude Code Server.

## Responsibilities

1. **Domain Entities**: Define core entities (Task, Phase, Review, etc.)
2. **Business Logic**: Implement domain-specific business rules
3. **Use Cases**: Provide application use cases (CreateTask, ExecuteTask, etc.)
4. **Domain Events**: Define and handle domain events
5. **Repository Interfaces**: Define data access interfaces

## Structure

```
packages/core/
├── entities/           # Domain entities
│   ├── Task.ts
│   ├── Phase.ts
│   ├── Review.ts
│   ├── Dependency.ts
│   └── Question.ts
│
├── use-cases/          # Application use cases
│   ├── CreateTask.ts
│   ├── ExecuteTask.ts
│   ├── ReviewPhase.ts
│   └── ProvideDependency.ts
│
├── repositories/       # Repository interfaces
│   ├── TaskRepository.ts
│   ├── ReviewRepository.ts
│   └── DependencyRepository.ts
│
├── events/             # Domain events
│   ├── TaskCreated.ts
│   ├── PhaseCompleted.ts
│   └── ReviewApproved.ts
│
└── types/              # Shared types
    └── index.ts
```

## Key Entities

### Task
```typescript
interface Task {
  id: string;
  title: string;
  type: 'create_app' | 'modify_app' | 'workflow' | 'custom';
  status: 'draft' | 'pending' | 'in_progress' | 'review' | 'completed' | 'failed';
  description: string;
  currentPhase: number | null;
  progress: number;
}
```

### Phase
```typescript
interface Phase {
  id: string;
  taskId: string;
  phaseNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  steps: Step[];
}
```

### Review
```typescript
interface Review {
  id: string;
  taskId: string;
  phase: number;
  status: 'pending' | 'approved' | 'changes_requested';
  deliverables: string[];
  feedback?: string;
}
```

## Usage

```typescript
import { CreateTask, Task } from '@claude-platform/core';

// Use case
const createTask = new CreateTask(taskRepository);
const task = await createTask.execute({
  title: 'Build Todo App',
  type: 'create_app',
  description: '...',
});

// Entity
const task: Task = {
  id: '123',
  title: 'Build Todo App',
  type: 'create_app',
  status: 'pending',
  description: '...',
  currentPhase: null,
  progress: 0,
};
```

## Domain Events

Event-sourcing architecture support:

```typescript
type DomainEvent =
  | TaskCreated
  | TaskStarted
  | PhaseStarted
  | PhaseCompleted
  | ReviewCreated
  | ReviewApproved
  | DependencyRequested
  | DependencyProvided
  | QuestionAsked
  | QuestionAnswered
  | TaskCompleted
  | TaskFailed;
```

## Related Components

- **Web Server**: Uses core types and use cases
- **Agent Manager**: Uses core entities
- **Storage**: Implements repository interfaces

## Documentation

- **Architecture**: `/docs/ARCHITECTURE.md`
- **Features**: `/docs/FEATURES.md`
