import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkflowEngine } from '../WorkflowEngine.js';
import { getPhaseDefinition } from '../WorkflowDefinitions.js';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let tmpDir: string;

  beforeEach(() => {
    // Create engine without real AgentManager (we test buildPhasePrompt, loadGuides, etc.)
    engine = new WorkflowEngine({} as any); // Mock AgentManager, we won't call executePhase
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('buildPhasePrompt', () => {
    it('builds prompt with task context and phase instructions', () => {
      const phaseDef = getPhaseDefinition('create_app', 1);
      const ctx = {
        taskId: 'test-1',
        taskType: 'create_app',
        title: 'Todo App',
        description: 'Build a simple todo app',
        workspace: '/tmp/workspace',
        guideRoot: tmpDir,
      };

      const prompt = engine.buildPhasePrompt(ctx, phaseDef);
      expect(prompt).toContain('# Task: Todo App');
      expect(prompt).toContain('Type: create_app');
      expect(prompt).toContain('Phase 1: Planning');
      expect(prompt).toContain('Build a simple todo app');
      expect(prompt).toContain('docs/planning/');
      expect(prompt).toContain('Expected number of deliverables: 9');
      expect(prompt).toContain('=== PHASE 1 COMPLETE ===');
    });

    it('does not include completion signal for custom tasks', () => {
      const phaseDef = getPhaseDefinition('custom', 1);
      const ctx = {
        taskId: 'test-2',
        taskType: 'custom',
        title: 'Explain something',
        description: 'Explain WebSockets',
        workspace: '/tmp/workspace',
        guideRoot: tmpDir,
      };

      const prompt = engine.buildPhasePrompt(ctx, phaseDef);
      expect(prompt).not.toContain('PHASE');
      expect(prompt).not.toContain('COMPLETE');
    });

    it('includes guide content when guides exist', () => {
      // Create a guide directory with files
      const guideDir = path.join(tmpDir, 'guide', 'planning');
      fs.mkdirSync(guideDir, { recursive: true });
      fs.writeFileSync(path.join(guideDir, '01_idea.md'), '# Idea Guide\nThis is the idea guide.');

      const phaseDef = getPhaseDefinition('create_app', 1);
      const ctx = {
        taskId: 'test-3',
        taskType: 'create_app',
        title: 'App',
        description: 'Build app',
        workspace: '/tmp/workspace',
        guideRoot: tmpDir,
      };

      const prompt = engine.buildPhasePrompt(ctx, phaseDef);
      expect(prompt).toContain('## Reference Guides');
      expect(prompt).toContain('# Idea Guide');
      expect(prompt).toContain('This is the idea guide.');
    });
  });

  describe('loadGuides', () => {
    it('returns null when directory does not exist', () => {
      const result = engine.loadGuides(tmpDir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when directory is empty', () => {
      const guideDir = path.join(tmpDir, 'empty-guides');
      fs.mkdirSync(guideDir, { recursive: true });
      const result = engine.loadGuides(tmpDir, 'empty-guides');
      expect(result).toBeNull();
    });

    it('loads and concatenates .md files in sorted order', () => {
      const guideDir = path.join(tmpDir, 'guides');
      fs.mkdirSync(guideDir, { recursive: true });
      fs.writeFileSync(path.join(guideDir, '02_second.md'), 'Second content');
      fs.writeFileSync(path.join(guideDir, '01_first.md'), 'First content');
      fs.writeFileSync(path.join(guideDir, 'readme.txt'), 'Not a markdown file');

      const result = engine.loadGuides(tmpDir, 'guides');
      expect(result).toBeTruthy();
      expect(result).toContain('### 01_first.md');
      expect(result).toContain('First content');
      expect(result).toContain('### 02_second.md');
      expect(result).toContain('Second content');
      expect(result).not.toContain('Not a markdown file');
      // First should come before second
      expect(result!.indexOf('01_first.md')).toBeLessThan(result!.indexOf('02_second.md'));
    });
  });

  describe('getNextAction', () => {
    it('returns "complete" on last phase', () => {
      expect(engine.getNextAction('create_app', 4)).toBe('complete');
    });

    it('returns "review" for structured workflows between phases', () => {
      expect(engine.getNextAction('create_app', 1)).toBe('review');
      expect(engine.getNextAction('modify_app', 2)).toBe('review');
    });

    it('returns "next_phase" for custom tasks', () => {
      // Custom only has 1 phase, so phase 1 is last
      expect(engine.getNextAction('custom', 1)).toBe('complete');
    });
  });

  describe('calculateProgress', () => {
    it('returns 0% for phase 0', () => {
      expect(engine.calculateProgress('create_app', 0)).toBe(0);
    });

    it('returns 25% for phase 1 of 4', () => {
      expect(engine.calculateProgress('create_app', 1)).toBe(25);
    });

    it('returns 50% for phase 2 of 4', () => {
      expect(engine.calculateProgress('create_app', 2)).toBe(50);
    });

    it('returns 100% for last phase', () => {
      expect(engine.calculateProgress('create_app', 4)).toBe(100);
    });

    it('returns 100% for custom phase 1', () => {
      expect(engine.calculateProgress('custom', 1)).toBe(100);
    });
  });

  describe('modify_app workflow', () => {
    it('builds modify_app Phase 1 prompt with Analysis context', () => {
      const phaseDef = getPhaseDefinition('modify_app', 1);
      const ctx = {
        taskId: 't-mod-1',
        taskType: 'modify_app',
        title: 'Add dark mode',
        description: 'Add dark mode to existing app',
        workspace: '/tmp/ws',
        guideRoot: tmpDir,
      };
      const prompt = engine.buildPhasePrompt(ctx, phaseDef);
      expect(prompt).toContain('Type: modify_app');
      expect(prompt).toContain('Phase 1');
      expect(prompt).toContain('Add dark mode');
    });

    it('getNextAction returns review for modify_app between phases', () => {
      expect(engine.getNextAction('modify_app', 1)).toBe('review');
      expect(engine.getNextAction('modify_app', 3)).toBe('review');
    });

    it('getNextAction returns complete for modify_app last phase', () => {
      expect(engine.getNextAction('modify_app', 4)).toBe('complete');
    });

    it('calculateProgress for modify_app phases', () => {
      expect(engine.calculateProgress('modify_app', 2)).toBe(50);
      expect(engine.calculateProgress('modify_app', 4)).toBe(100);
    });
  });

  describe('workflow type', () => {
    it('builds workflow Phase 1 prompt', () => {
      const phaseDef = getPhaseDefinition('workflow', 1);
      const ctx = {
        taskId: 't-wf-1',
        taskType: 'workflow',
        title: 'Slack Bot',
        description: 'Create notification workflow',
        workspace: '/tmp/ws',
        guideRoot: tmpDir,
      };
      const prompt = engine.buildPhasePrompt(ctx, phaseDef);
      expect(prompt).toContain('Type: workflow');
      expect(prompt).toContain('Slack Bot');
    });

    it('calculateProgress for workflow phases', () => {
      expect(engine.calculateProgress('workflow', 1)).toBe(25);
      expect(engine.calculateProgress('workflow', 3)).toBe(75);
    });
  });
});
