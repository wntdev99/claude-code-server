import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getOutputDirectory, getWorkspacePath, ensureWorkspace } from '../utils/workspace.js';

describe('workspace utils', () => {
  let tmpDir: string;
  const originalOutputDir = process.env.OUTPUT_DIRECTORY;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    process.env.OUTPUT_DIRECTORY = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalOutputDir !== undefined) {
      process.env.OUTPUT_DIRECTORY = originalOutputDir;
    } else {
      delete process.env.OUTPUT_DIRECTORY;
    }
  });

  describe('getOutputDirectory', () => {
    it('returns OUTPUT_DIRECTORY env var when set', () => {
      expect(getOutputDirectory()).toBe(tmpDir);
    });

    it('returns cwd/projects when env not set', () => {
      delete process.env.OUTPUT_DIRECTORY;
      expect(getOutputDirectory()).toBe(path.join(process.cwd(), 'projects'));
    });
  });

  describe('getWorkspacePath', () => {
    it('joins output directory with task id', () => {
      expect(getWorkspacePath('task-abc')).toBe(path.join(tmpDir, 'task-abc'));
    });

    it('handles task ids with special characters', () => {
      const result = getWorkspacePath('task-123-abc');
      expect(result).toBe(path.join(tmpDir, 'task-123-abc'));
    });
  });

  describe('ensureWorkspace', () => {
    it('creates directory and returns path', () => {
      const workspace = ensureWorkspace('task-xyz');
      expect(workspace).toBe(path.join(tmpDir, 'task-xyz'));
      expect(fs.existsSync(workspace)).toBe(true);
    });

    it('does not fail if directory already exists', () => {
      ensureWorkspace('task-dup');
      expect(() => ensureWorkspace('task-dup')).not.toThrow();
    });

    it('creates nested path structure', () => {
      const workspace = ensureWorkspace('task-nested');
      expect(fs.statSync(workspace).isDirectory()).toBe(true);
    });
  });
});
