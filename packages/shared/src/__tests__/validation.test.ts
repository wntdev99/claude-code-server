import { describe, it, expect } from 'vitest';
import { validatePath, sanitizeInput, isValidTaskType, isValidTaskStatus } from '../utils/validation.js';

describe('validatePath', () => {
  const workspace = '/projects/task-123';

  it('allows paths within workspace', () => {
    expect(validatePath('/projects/task-123/src/index.ts', workspace)).toBe(true);
    expect(validatePath('/projects/task-123/docs/planning/01_idea.md', workspace)).toBe(true);
  });

  it('allows workspace root itself', () => {
    expect(validatePath('/projects/task-123', workspace)).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(validatePath('/projects/task-123/../other-task/secret.txt', workspace)).toBe(false);
    expect(validatePath('/etc/passwd', workspace)).toBe(false);
    expect(validatePath('/projects/task-124/file.txt', workspace)).toBe(false);
  });

  it('blocks sensitive files', () => {
    expect(validatePath('/projects/task-123/.env', workspace)).toBe(false);
    expect(validatePath('/projects/task-123/id_rsa', workspace)).toBe(false);
    expect(validatePath('/projects/task-123/credentials.json', workspace)).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('strips HTML angle brackets', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('strips null bytes', () => {
    expect(sanitizeInput('hello\0world')).toBe('helloworld');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('preserves normal text', () => {
    expect(sanitizeInput('Create a React todo app')).toBe('Create a React todo app');
  });
});

describe('isValidTaskType', () => {
  it('accepts valid task types', () => {
    expect(isValidTaskType('create_app')).toBe(true);
    expect(isValidTaskType('modify_app')).toBe(true);
    expect(isValidTaskType('workflow')).toBe(true);
    expect(isValidTaskType('custom')).toBe(true);
  });

  it('rejects invalid task types', () => {
    expect(isValidTaskType('invalid')).toBe(false);
    expect(isValidTaskType('')).toBe(false);
  });
});

describe('isValidTaskStatus', () => {
  it('accepts valid statuses', () => {
    expect(isValidTaskStatus('draft')).toBe(true);
    expect(isValidTaskStatus('in_progress')).toBe(true);
    expect(isValidTaskStatus('completed')).toBe(true);
  });

  it('rejects invalid statuses', () => {
    expect(isValidTaskStatus('unknown')).toBe(false);
  });
});
