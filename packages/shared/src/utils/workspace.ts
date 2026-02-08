import fs from 'node:fs';
import path from 'node:path';

/**
 * Get the base output directory for task workspaces.
 * Defaults to ./projects/ relative to cwd, or OUTPUT_DIRECTORY env var.
 */
export function getOutputDirectory(): string {
  return process.env.OUTPUT_DIRECTORY || path.join(process.cwd(), 'projects');
}

/**
 * Get the workspace path for a specific task.
 */
export function getWorkspacePath(taskId: string): string {
  return path.join(getOutputDirectory(), taskId);
}

/**
 * Ensure a workspace directory exists for a task.
 * Creates the directory if it doesn't exist.
 */
export function ensureWorkspace(taskId: string): string {
  const workspacePath = getWorkspacePath(taskId);
  fs.mkdirSync(workspacePath, { recursive: true });
  return workspacePath;
}
