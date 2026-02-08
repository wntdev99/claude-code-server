import path from 'node:path';

const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'credentials.json',
  'service-account.json',
];

/**
 * Validates that a file path is within the allowed workspace root
 * and doesn't reference sensitive files.
 * Prevents path traversal attacks.
 */
export function validatePath(
  filePath: string,
  workspaceRoot: string
): boolean {
  const normalized = path.resolve(filePath);
  const root = path.resolve(workspaceRoot);

  // Prevent path traversal
  if (!normalized.startsWith(root + path.sep) && normalized !== root) {
    return false;
  }

  // Block sensitive files
  const basename = path.basename(filePath);
  if (SENSITIVE_FILES.includes(basename)) {
    return false;
  }

  return true;
}

/**
 * Sanitize user input string - strip potential injection characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip HTML angle brackets
    .replace(/\0/g, '') // Strip null bytes
    .trim();
}

/**
 * Validate task type is one of the allowed values
 */
export function isValidTaskType(type: string): boolean {
  return ['create_app', 'modify_app', 'workflow', 'custom'].includes(type);
}

/**
 * Validate task status is one of the allowed values
 */
export function isValidTaskStatus(status: string): boolean {
  return [
    'draft',
    'pending',
    'in_progress',
    'review',
    'completed',
    'failed',
  ].includes(status);
}
