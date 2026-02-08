import { describe, it, expect } from 'vitest';
import { VerificationAgent } from '../VerificationAgent.js';
import type { PhaseDefinition, Deliverable } from '@claude-code-server/shared';

const makePhaseDef = (overrides: Partial<PhaseDefinition> = {}): PhaseDefinition => ({
  phase: 1,
  name: 'Planning',
  steps: 9,
  deliverableDir: 'docs/planning',
  expectedDeliverables: 9,
  guideDir: 'guide/planning',
  ...overrides,
});

const makeDeliverable = (overrides: Partial<Deliverable> = {}): Deliverable => ({
  path: 'docs/planning/01_idea.md',
  content: 'A'.repeat(600), // Above minimum 500 chars
  size: 600,
  ...overrides,
});

describe('VerificationAgent', () => {
  const verifier = new VerificationAgent();

  describe('verify', () => {
    it('passes when all criteria are met', () => {
      const deliverables = Array.from({ length: 9 }, (_, i) =>
        makeDeliverable({ path: `docs/planning/0${i + 1}_file.md` })
      );
      const result = verifier.verify(deliverables, makePhaseDef());
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('fails when deliverable count is less than expected', () => {
      const deliverables = [makeDeliverable()];
      const result = verifier.verify(deliverables, makePhaseDef());
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.type === 'count_mismatch')).toBe(true);
    });

    it('fails when deliverable content is too short', () => {
      const deliverables = [makeDeliverable({ content: 'Short' })];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.type === 'too_short')).toBe(true);
    });

    it('fails when deliverable has placeholder content', () => {
      const deliverables = [
        makeDeliverable({
          content: 'A'.repeat(600) + '\n[TODO] Fill in later',
        }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.type === 'placeholder_content')).toBe(true);
    });

    it('detects Lorem ipsum placeholder', () => {
      const deliverables = [
        makeDeliverable({
          content: 'A'.repeat(600) + '\nLorem ipsum dolor sit amet',
        }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
    });

    it('detects TBD placeholder', () => {
      const deliverables = [
        makeDeliverable({
          content: 'A'.repeat(600) + '\nThis section is TBD',
        }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
    });

    it('detects [WIP] placeholder', () => {
      const deliverables = [
        makeDeliverable({ content: 'A'.repeat(600) + '\n[WIP] Not finished' }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
    });

    it('detects [FIXME] placeholder', () => {
      const deliverables = [
        makeDeliverable({ content: 'A'.repeat(600) + '\n[FIXME] Broken section' }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
    });

    it('detects [DRAFT] placeholder', () => {
      const deliverables = [
        makeDeliverable({ content: 'A'.repeat(600) + '\n[DRAFT] Preliminary content' }),
      ];
      const phaseDef = makePhaseDef({ expectedDeliverables: 1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(false);
    });

    it('handles variable deliverable count (expectedDeliverables = -1)', () => {
      const deliverables = [makeDeliverable()];
      const phaseDef = makePhaseDef({ expectedDeliverables: -1 });
      const result = verifier.verify(deliverables, phaseDef);
      expect(result.passed).toBe(true);
    });

    it('fails variable deliverable count when empty', () => {
      const phaseDef = makePhaseDef({ expectedDeliverables: -1 });
      const result = verifier.verify([], phaseDef);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.type === 'count_mismatch')).toBe(true);
    });

    it('skips count check when expectedDeliverables is 0', () => {
      const phaseDef = makePhaseDef({ expectedDeliverables: 0 });
      const result = verifier.verify([], phaseDef);
      expect(result.passed).toBe(true);
    });

    it('tracks attempt number', () => {
      const result = verifier.verify([], makePhaseDef(), 2);
      expect(result.attempts).toBe(2);
    });
  });

  describe('generateFeedback', () => {
    it('returns pass message when no issues', () => {
      const result = verifier.verify(
        Array.from({ length: 9 }, (_, i) =>
          makeDeliverable({ path: `docs/planning/0${i + 1}_file.md` })
        ),
        makePhaseDef()
      );
      expect(verifier.generateFeedback(result)).toBe('All deliverables pass verification.');
    });

    it('generates detailed feedback for failures', () => {
      const result = verifier.verify([], makePhaseDef());
      const feedback = verifier.generateFeedback(result);
      expect(feedback).toContain('Verification failed');
      expect(feedback).toContain('count_mismatch');
      expect(feedback).toContain('Please address these issues');
    });
  });

  describe('shouldAutoRework', () => {
    it('returns true when failed and under max attempts', () => {
      const result = { passed: false, attempts: 1, issues: [] };
      expect(verifier.shouldAutoRework(result)).toBe(true);
    });

    it('returns false when passed', () => {
      const result = { passed: true, attempts: 1, issues: [] };
      expect(verifier.shouldAutoRework(result)).toBe(false);
    });

    it('returns false when at max attempts', () => {
      const result = { passed: false, attempts: 3, issues: [] };
      expect(verifier.shouldAutoRework(result)).toBe(false);
    });
  });
});
