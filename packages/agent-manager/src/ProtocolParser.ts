import type {
  Protocol,
  UserQuestionProtocol,
  PhaseCompleteProtocol,
  CustomTaskCompleteProtocol,
  ErrorProtocol,
  QuestionCategory,
  ErrorSeverity,
  ErrorRecovery,
} from '@claude-code-server/shared';

/**
 * Parses structured protocol messages from agent stdout.
 *
 * Protocol formats (from CLAUDE.md):
 *
 * USER_QUESTION:
 *   [USER_QUESTION]
 *   category: business | clarification | choice | confirmation
 *   question: What revenue model do you prefer?
 *   options:
 *     - Subscription
 *     - Freemium
 *     - Ad-based
 *   default: Freemium
 *   required: true
 *   [/USER_QUESTION]
 *
 * PHASE_COMPLETE:
 *   === PHASE 1 COMPLETE ===
 *   Completed: Phase 1 (Planning)
 *   Documents created:
 *   - docs/planning/01_idea.md
 *   ...
 *
 * ERROR:
 *   [ERROR]
 *   type: recoverable | fatal
 *   message: Rate limit exceeded
 *   details: API rate limit hit, will retry after cooldown
 *   recovery: pause_and_retry | checkpoint_and_fail
 *   [/ERROR]
 */
const MAX_BUFFER_SIZE = 64 * 1024; // 64KB - large enough for protocol messages

export class ProtocolParser {
  private buffer = '';

  /**
   * Feed raw output and extract any complete protocol messages.
   * Handles cases where protocols span multiple chunks.
   */
  feed(chunk: string): Protocol[] {
    this.buffer += chunk;
    const protocols: Protocol[] = [];

    // Try parsing USER_QUESTION
    let match: RegExpExecArray | null;
    const questionRegex = /\[USER_QUESTION\]([\s\S]*?)\[\/USER_QUESTION\]/g;
    while ((match = questionRegex.exec(this.buffer)) !== null) {
      const parsed = this.parseUserQuestion(match[1]);
      if (parsed) protocols.push(parsed);
    }
    // Remove matched patterns
    this.buffer = this.buffer.replace(questionRegex, '');

    // Try parsing ERROR
    const errorRegex = /\[ERROR\]([\s\S]*?)\[\/ERROR\]/g;
    while ((match = errorRegex.exec(this.buffer)) !== null) {
      const parsed = this.parseError(match[1]);
      if (parsed) protocols.push(parsed);
    }
    this.buffer = this.buffer.replace(errorRegex, '');

    // Try parsing PHASE_COMPLETE
    const phaseRegex = /=== PHASE (\d+) COMPLETE ===([\s\S]*?)(?=(?:===|\[|$))/g;
    while ((match = phaseRegex.exec(this.buffer)) !== null) {
      const parsed = this.parsePhaseComplete(
        parseInt(match[1], 10),
        match[2]
      );
      if (parsed) protocols.push(parsed);
    }
    this.buffer = this.buffer.replace(phaseRegex, '');

    // Try parsing CUSTOM_TASK_COMPLETE
    const customRegex = /=== CUSTOM TASK COMPLETE ===([\s\S]*?)(?=(?:===|\[|$))/g;
    while ((match = customRegex.exec(this.buffer)) !== null) {
      const parsed = this.parseCustomTaskComplete(match[1]);
      if (parsed) protocols.push(parsed);
    }
    this.buffer = this.buffer.replace(customRegex, '');

    // Prevent unbounded buffer growth.
    // Only truncate if no partial protocol markers remain (to avoid splitting messages).
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      const hasPartialMarker =
        this.buffer.includes('[USER_QUESTION]') ||
        this.buffer.includes('[ERROR]') ||
        this.buffer.includes('=== PHASE') ||
        this.buffer.includes('=== CUSTOM TASK');
      if (hasPartialMarker) {
        // Keep from the earliest marker to avoid splitting
        const markers = [
          this.buffer.indexOf('[USER_QUESTION]'),
          this.buffer.indexOf('[ERROR]'),
          this.buffer.indexOf('=== PHASE'),
          this.buffer.indexOf('=== CUSTOM TASK'),
        ].filter((i) => i >= 0);
        const earliest = Math.min(...markers);
        this.buffer = this.buffer.slice(earliest);
      } else {
        this.buffer = '';
      }
    }

    return protocols;
  }

  /**
   * Parse a single output string for a protocol (non-streaming).
   */
  parse(output: string): Protocol | null {
    const protocols = this.feed(output);
    return protocols.length > 0 ? protocols[0] : null;
  }

  /**
   * Reset the internal buffer.
   */
  reset(): void {
    this.buffer = '';
  }

  private parseUserQuestion(content: string): UserQuestionProtocol | null {
    const lines = content.trim().split('\n');
    let category: QuestionCategory = 'clarification';
    let question = '';
    const options: string[] = [];
    let defaultOption: string | undefined;
    let required = true;
    let inOptions = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('category:')) {
        category = trimmed.slice('category:'.length).trim() as QuestionCategory;
        inOptions = false;
      } else if (trimmed.startsWith('question:')) {
        question = trimmed.slice('question:'.length).trim();
        inOptions = false;
      } else if (trimmed === 'options:') {
        inOptions = true;
      } else if (inOptions && trimmed.startsWith('- ')) {
        options.push(trimmed.slice(2).trim());
      } else if (trimmed.startsWith('default:')) {
        defaultOption = trimmed.slice('default:'.length).trim();
        inOptions = false;
      } else if (trimmed.startsWith('required:')) {
        required = trimmed.slice('required:'.length).trim() === 'true';
        inOptions = false;
      }
    }

    if (!question) return null;

    return {
      type: 'USER_QUESTION',
      category,
      question,
      options,
      defaultOption,
      required,
    };
  }

  private parsePhaseComplete(
    phase: number,
    content: string
  ): PhaseCompleteProtocol | null {
    const lines = content.trim().split('\n');
    let phaseName = `Phase ${phase}`;
    const documents: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Completed:')) {
        phaseName = trimmed.slice('Completed:'.length).trim();
      } else if (trimmed.startsWith('- ')) {
        const doc = trimmed.slice(2).trim();
        if (doc) documents.push(doc);
      }
    }

    return {
      type: 'PHASE_COMPLETE',
      phase,
      phaseName,
      documents,
    };
  }

  private parseCustomTaskComplete(
    content: string
  ): CustomTaskCompleteProtocol {
    const lines = content.trim().split('\n');
    let task: string | undefined;
    let summary: string | undefined;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Task:')) {
        task = trimmed.slice('Task:'.length).trim();
      } else if (trimmed.startsWith('Summary:')) {
        summary = trimmed.slice('Summary:'.length).trim();
      }
    }

    return {
      type: 'CUSTOM_TASK_COMPLETE',
      task,
      summary,
    };
  }

  private parseError(content: string): ErrorProtocol | null {
    const lines = content.trim().split('\n');
    let severity: ErrorSeverity = 'recoverable';
    let message = '';
    let details = '';
    let recovery: ErrorRecovery = 'pause_and_retry';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('type:')) {
        severity = trimmed.slice('type:'.length).trim() as ErrorSeverity;
      } else if (trimmed.startsWith('message:')) {
        message = trimmed.slice('message:'.length).trim();
      } else if (trimmed.startsWith('details:')) {
        details = trimmed.slice('details:'.length).trim();
      } else if (trimmed.startsWith('recovery:')) {
        recovery = trimmed.slice('recovery:'.length).trim() as ErrorRecovery;
      }
    }

    if (!message) return null;

    return {
      type: 'ERROR',
      severity,
      message,
      details,
      recovery,
    };
  }
}
