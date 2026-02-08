import { describe, it, expect } from 'vitest';
import {
  getWorkflowDefinition,
  getPhaseDefinition,
  getTotalPhases,
  isLastPhase,
  hasReviewGate,
} from '../WorkflowDefinitions.js';

describe('WorkflowDefinitions', () => {
  describe('getWorkflowDefinition', () => {
    it('returns create_app workflow with 4 phases', () => {
      const def = getWorkflowDefinition('create_app');
      expect(def.type).toBe('create_app');
      expect(def.phases).toHaveLength(4);
    });

    it('returns modify_app workflow with 4 phases', () => {
      const def = getWorkflowDefinition('modify_app');
      expect(def.type).toBe('modify_app');
      expect(def.phases).toHaveLength(4);
    });

    it('returns workflow workflow with 4 phases', () => {
      const def = getWorkflowDefinition('workflow');
      expect(def.type).toBe('workflow');
      expect(def.phases).toHaveLength(4);
    });

    it('returns custom workflow with 1 phase', () => {
      const def = getWorkflowDefinition('custom');
      expect(def.type).toBe('custom');
      expect(def.phases).toHaveLength(1);
    });

    it('throws for unknown workflow type', () => {
      expect(() => getWorkflowDefinition('unknown')).toThrow('Unknown workflow type');
    });
  });

  describe('getPhaseDefinition', () => {
    it('returns correct create_app Phase 1 (Planning)', () => {
      const phase = getPhaseDefinition('create_app', 1);
      expect(phase.name).toBe('Planning');
      expect(phase.steps).toBe(9);
      expect(phase.expectedDeliverables).toBe(9);
      expect(phase.deliverableDir).toBe('docs/planning');
      expect(phase.guideDir).toBe('guide/planning');
    });

    it('returns correct create_app Phase 2 (Design)', () => {
      const phase = getPhaseDefinition('create_app', 2);
      expect(phase.name).toBe('Design');
      expect(phase.steps).toBe(5);
      expect(phase.expectedDeliverables).toBe(5);
      expect(phase.deliverableDir).toBe('docs/design');
    });

    it('returns correct create_app Phase 3 (Development) with variable deliverables', () => {
      const phase = getPhaseDefinition('create_app', 3);
      expect(phase.name).toBe('Development');
      expect(phase.expectedDeliverables).toBe(-1); // Variable
    });

    it('returns correct modify_app Phase 1 (Analysis) with no guide', () => {
      const phase = getPhaseDefinition('modify_app', 1);
      expect(phase.name).toBe('Analysis');
      expect(phase.guideDir).toBeNull();
    });

    it('returns correct custom Phase 1 (Execution)', () => {
      const phase = getPhaseDefinition('custom', 1);
      expect(phase.name).toBe('Execution');
      expect(phase.guideDir).toBeNull();
      expect(phase.expectedDeliverables).toBe(0);
    });

    it('throws for invalid phase number', () => {
      expect(() => getPhaseDefinition('create_app', 99)).toThrow('Phase 99 not found');
    });
  });

  describe('getTotalPhases', () => {
    it('returns 4 for create_app', () => {
      expect(getTotalPhases('create_app')).toBe(4);
    });

    it('returns 1 for custom', () => {
      expect(getTotalPhases('custom')).toBe(1);
    });
  });

  describe('isLastPhase', () => {
    it('returns false for create_app phase 1', () => {
      expect(isLastPhase('create_app', 1)).toBe(false);
    });

    it('returns true for create_app phase 4', () => {
      expect(isLastPhase('create_app', 4)).toBe(true);
    });

    it('returns true for custom phase 1', () => {
      expect(isLastPhase('custom', 1)).toBe(true);
    });
  });

  describe('hasReviewGate', () => {
    it('returns true for create_app', () => {
      expect(hasReviewGate('create_app')).toBe(true);
    });

    it('returns true for modify_app', () => {
      expect(hasReviewGate('modify_app')).toBe(true);
    });

    it('returns true for workflow', () => {
      expect(hasReviewGate('workflow')).toBe(true);
    });

    it('returns false for custom', () => {
      expect(hasReviewGate('custom')).toBe(false);
    });
  });
});
