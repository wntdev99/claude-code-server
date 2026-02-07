# Shared

## Overview

The `shared` package contains common utilities, helpers, and types used across all packages in the Claude Code Server.

## Responsibilities

1. **Common Types**: Shared TypeScript types and interfaces
2. **Utilities**: Generic utility functions
3. **Constants**: Shared constants and configurations
4. **Helpers**: Common helper functions
5. **Validators**: Shared validation logic

## Structure

```
packages/shared/
├── types/              # Common types
│   ├── index.ts
│   ├── api.ts
│   └── events.ts
│
├── utils/              # Utility functions
│   ├── validation.ts
│   ├── formatting.ts
│   ├── encryption.ts
│   └── path.ts
│
├── constants/          # Constants
│   ├── index.ts
│   ├── task-types.ts
│   └── status.ts
│
└── config/             # Configuration
    └── index.ts
```

## Common Utilities

### Validation
```typescript
// Path validation
export function validatePath(userPath: string, baseDir: string): boolean;

// Input sanitization
export function sanitizeInput(input: string): string;

// Prompt sanitization
export function sanitizePrompt(prompt: string): string;
```

### Encryption
```typescript
// Secret encryption
export function encryptSecret(value: string): string;

// Secret decryption
export function decryptSecret(encrypted: string): string;
```

### Formatting
```typescript
// Date formatting
export function formatDate(date: Date): string;

// Token count formatting
export function formatTokenCount(count: number): string;

// Cost formatting
export function formatCost(cost: number): string;
```

### Path Utilities
```typescript
// Resolve safe path
export function resolveSafePath(base: string, relative: string): string;

// Check path safety
export function isPathSafe(path: string, base: string): boolean;
```

## Common Types

### API Types
```typescript
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Event Types
```typescript
export interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: string;
}
```

## Constants

```typescript
export const TASK_TYPES = {
  CREATE_APP: 'create_app',
  MODIFY_APP: 'modify_app',
  WORKFLOW: 'workflow',
  CUSTOM: 'custom',
} as const;

export const TASK_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const AGENT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  WAITING_REVIEW: 'waiting_review',
  WAITING_DEPENDENCY: 'waiting_dependency',
  WAITING_QUESTION: 'waiting_question',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
```

## Usage

```typescript
import { validatePath, sanitizeInput, TASK_TYPES } from '@claude-platform/shared';

// Validation
if (!validatePath(userPath, baseDir)) {
  throw new Error('Invalid path');
}

// Sanitization
const safe = sanitizeInput(userInput);

// Constants
const taskType = TASK_TYPES.CREATE_APP;
```

## Related Components

All packages use shared utilities:
- **Web Server**: Validation, encryption, formatting
- **Agent Manager**: Path utilities, constants
- **Core**: Common types
- **Storage**: Validation, types

## Documentation

- **Architecture**: `/docs/ARCHITECTURE.md`
- **Development**: `/docs/DEVELOPMENT.md`
