// Application constants

export const APP_NAME = 'Claude Code Server';
export const APP_VERSION = '0.1.0';

// Default configuration
export const DEFAULT_PORT = 3000;
export const DEFAULT_MODEL = 'claude-sonnet-4-5';
export const DEFAULT_MAX_TOKENS = 8000;

// Checkpoint configuration
export const CHECKPOINT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_REWORK_ATTEMPTS = 3;

// Phase counts by workflow type
export const PHASE_COUNTS = {
  create_app: 4,
  modify_app: 4,
  workflow: 4,
  custom: 1,
} as const;

// Planning deliverable counts (create_app Phase 1)
export const PLANNING_DOC_COUNT = 9;
export const DESIGN_DOC_COUNT = 5;
export const DEVELOPMENT_STEP_COUNT = 6;

// Deliverable minimum character count
export const MIN_DELIVERABLE_CHARS = 500;

// SSE heartbeat interval
export const SSE_HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

// Process management
export const AGENT_GRACEFUL_SHUTDOWN_MS = 5000; // 5 seconds before SIGKILL
