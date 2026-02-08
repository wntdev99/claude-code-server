// ============================================================
// Enums (matching Prisma schema values)
// ============================================================

export const TaskType = {
  CREATE_APP: 'create_app',
  MODIFY_APP: 'modify_app',
  WORKFLOW: 'workflow',
  CUSTOM: 'custom',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ReviewStatus = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const AgentState = {
  IDLE: 'idle',
  RUNNING: 'running',
  WAITING_REVIEW: 'waiting_review',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type AgentState = (typeof AgentState)[keyof typeof AgentState];

export const QuestionCategory = {
  BUSINESS: 'business',
  CLARIFICATION: 'clarification',
  CHOICE: 'choice',
  CONFIRMATION: 'confirmation',
} as const;
export type QuestionCategory =
  (typeof QuestionCategory)[keyof typeof QuestionCategory];

export const CheckpointReason = {
  INTERVAL: 'interval',
  RATE_LIMIT: 'rate_limit',
  ERROR: 'error',
  MANUAL: 'manual',
  PHASE_COMPLETE: 'phase_complete',
} as const;
export type CheckpointReason =
  (typeof CheckpointReason)[keyof typeof CheckpointReason];

export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

// ============================================================
// Domain Interfaces (matching Prisma models)
// ============================================================

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  description: string;
  currentPhase: number | null;
  progress: number;
  workspace: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  taskId: string;
  phase: number;
  status: ReviewStatus;
  deliverables: string; // JSON string of Deliverable[]
  feedback: string | null;
  createdAt: Date;
}

export interface Question {
  id: string;
  taskId: string;
  category: QuestionCategory;
  question: string;
  options: string; // JSON string of string[]
  answer: string | null;
  answeredAt: Date | null;
  createdAt: Date;
}

export interface Checkpoint {
  id: string;
  taskId: string;
  reason: CheckpointReason;
  state: string; // JSON string of CheckpointState
  createdAt: Date;
}

export interface Log {
  id: string;
  taskId: string;
  level: LogLevel;
  message: string;
  metadata: string | null; // JSON string
  createdAt: Date;
}

export interface Settings {
  key: string;
  value: string; // encrypted for sensitive values
  updatedAt: Date;
}

// ============================================================
// Protocol Types (CLAUDE.md - Platform-Agent Communication)
// ============================================================

export const ProtocolType = {
  USER_QUESTION: 'USER_QUESTION',
  PHASE_COMPLETE: 'PHASE_COMPLETE',
  ERROR: 'ERROR',
  LOG: 'LOG',
} as const;
export type ProtocolType = (typeof ProtocolType)[keyof typeof ProtocolType];

export interface UserQuestionProtocol {
  type: typeof ProtocolType.USER_QUESTION;
  category: QuestionCategory;
  question: string;
  options: string[];
  defaultOption?: string;
  required: boolean;
}

export interface PhaseCompleteProtocol {
  type: typeof ProtocolType.PHASE_COMPLETE;
  phase: number;
  phaseName: string;
  documents: string[];
}

export const ErrorSeverity = {
  RECOVERABLE: 'recoverable',
  FATAL: 'fatal',
} as const;
export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export const ErrorRecovery = {
  PAUSE_AND_RETRY: 'pause_and_retry',
  CHECKPOINT_AND_FAIL: 'checkpoint_and_fail',
} as const;
export type ErrorRecovery =
  (typeof ErrorRecovery)[keyof typeof ErrorRecovery];

export interface ErrorProtocol {
  type: typeof ProtocolType.ERROR;
  severity: ErrorSeverity;
  message: string;
  details: string;
  recovery: ErrorRecovery;
}

export type Protocol =
  | UserQuestionProtocol
  | PhaseCompleteProtocol
  | ErrorProtocol;

// ============================================================
// SSE Event Types (docs/API.md - /api/tasks/{id}/stream)
// ============================================================

export const SSEEventType = {
  LOG: 'log',
  PHASE_UPDATE: 'phase_update',
  STEP_UPDATE: 'step_update',
  USER_QUESTION: 'user_question',
  REVIEW_REQUIRED: 'review_required',
  COMPLETE: 'complete',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
} as const;
export type SSEEventType = (typeof SSEEventType)[keyof typeof SSEEventType];

export interface SSEEvent {
  type: SSEEventType;
  content: unknown;
  timestamp: string;
}

// ============================================================
// API Types (docs/API.md)
// ============================================================

export interface CreateTaskInput {
  title: string;
  type: TaskType;
  description: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface AnswerQuestionInput {
  answer: string;
}

export interface ReviewDecisionInput {
  feedback?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Record<string, unknown>[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Workflow Types (CLAUDE.md - Phase definitions)
// ============================================================

export interface PhaseDefinition {
  phase: number;
  name: string;
  steps: number;
  deliverableDir: string;
  expectedDeliverables: number;
  guideDir: string | null;
}

export interface WorkflowDefinition {
  type: TaskType;
  phases: PhaseDefinition[];
}

// ============================================================
// Deliverable Types
// ============================================================

export interface Deliverable {
  path: string;
  content: string;
  size: number;
}

// ============================================================
// Checkpoint State
// ============================================================

export interface CheckpointState {
  conversationHistory: string[];
  environment: Record<string, string>;
  currentPhase: number | null;
  progress: number;
  lastOutput: string;
  workspace: string[];
}

// ============================================================
// Rate Limit Types (docs/RATE_LIMITING.md)
// ============================================================

export interface RateLimitInfo {
  detected: boolean;
  resetAt: Date | null;
}
