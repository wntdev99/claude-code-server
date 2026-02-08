import type { Deliverable, PhaseDefinition } from '@claude-code-server/shared';
import { MIN_DELIVERABLE_CHARS, MAX_REWORK_ATTEMPTS } from '@claude-code-server/shared';

export interface VerificationResult {
  passed: boolean;
  attempts: number;
  issues: VerificationIssue[];
}

export interface VerificationIssue {
  type: 'missing_file' | 'too_short' | 'placeholder_content' | 'count_mismatch';
  message: string;
  file?: string;
}

// Common placeholder patterns to detect incomplete deliverables
const PLACEHOLDER_PATTERNS = [
  /\[TODO\]/i,
  /\(TODO\)/i,
  /\[INSERT .+\]/i,
  /\[PLACEHOLDER\]/i,
  /\[WIP\]/i,
  /\[DRAFT\]/i,
  /\[FIXME\]/i,
  /Lorem ipsum/i,
  /\bTBD\b/,
  /To be determined/i,
  /Fill in later/i,
  /\.\.\.\s*$/m, // Lines ending with just "..."
];

/**
 * Verifies that deliverables meet quality criteria.
 *
 * Checks performed (from guide/verification/):
 * 1. Expected file count matches
 * 2. Each file has minimum content length (>= 500 chars)
 * 3. No placeholder content detected
 */
export class VerificationAgent {
  /**
   * Verify deliverables for a given phase.
   */
  verify(
    deliverables: Deliverable[],
    phaseDef: PhaseDefinition,
    attempt: number = 1
  ): VerificationResult {
    const issues: VerificationIssue[] = [];

    // Check deliverable count (if expected count is specified)
    if (phaseDef.expectedDeliverables > 0) {
      if (deliverables.length < phaseDef.expectedDeliverables) {
        issues.push({
          type: 'count_mismatch',
          message: `Expected ${phaseDef.expectedDeliverables} deliverables, found ${deliverables.length}`,
        });
      }
    } else if (phaseDef.expectedDeliverables === -1) {
      // Variable count but at least 1
      if (deliverables.length === 0) {
        issues.push({
          type: 'count_mismatch',
          message: 'Expected at least 1 deliverable, found 0',
        });
      }
    }

    // Check each deliverable
    for (const d of deliverables) {
      // Minimum content length
      if (d.content.length < MIN_DELIVERABLE_CHARS) {
        issues.push({
          type: 'too_short',
          message: `File ${d.path} has ${d.content.length} chars (minimum: ${MIN_DELIVERABLE_CHARS})`,
          file: d.path,
        });
      }

      // Placeholder detection
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(d.content)) {
          issues.push({
            type: 'placeholder_content',
            message: `File ${d.path} contains placeholder content matching: ${pattern.source}`,
            file: d.path,
          });
          break; // One placeholder issue per file is enough
        }
      }
    }

    return {
      passed: issues.length === 0,
      attempts: attempt,
      issues,
    };
  }

  /**
   * Generate feedback for rework based on verification issues.
   */
  generateFeedback(result: VerificationResult): string {
    if (result.passed) return 'All deliverables pass verification.';

    const lines: string[] = [
      `Verification failed (attempt ${result.attempts}/${MAX_REWORK_ATTEMPTS}). Issues found:`,
      '',
    ];

    for (const issue of result.issues) {
      lines.push(`- [${issue.type}] ${issue.message}`);
    }

    lines.push('');
    lines.push('Please address these issues and resubmit.');

    return lines.join('\n');
  }

  /**
   * Check if auto-rework should be attempted.
   */
  shouldAutoRework(result: VerificationResult): boolean {
    return !result.passed && result.attempts < MAX_REWORK_ATTEMPTS;
  }
}
