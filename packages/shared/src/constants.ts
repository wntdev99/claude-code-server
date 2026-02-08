// Default configuration
export const DEFAULT_MODEL = 'claude-sonnet-4-5';

// Checkpoint configuration
export const CHECKPOINT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_REWORK_ATTEMPTS = 3;

// Deliverable minimum character count
export const MIN_DELIVERABLE_CHARS = 500;

// SSE heartbeat interval
export const SSE_HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

// Process management
export const AGENT_GRACEFUL_SHUTDOWN_MS = 5000; // 5 seconds before SIGKILL

// Rate limiting
export const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000; // 1 minute default cooldown
