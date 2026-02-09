import { describe, it, expect, beforeEach } from 'vitest';
import { ProtocolParser } from '../ProtocolParser.js';

describe('ProtocolParser', () => {
  let parser: ProtocolParser;

  beforeEach(() => {
    parser = new ProtocolParser();
  });

  describe('USER_QUESTION', () => {
    it('parses a complete user question', () => {
      const input = `[USER_QUESTION]
category: business
question: What revenue model do you prefer?
options:
  - Subscription
  - Freemium
  - Ad-based
default: Freemium
required: true
[/USER_QUESTION]`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('USER_QUESTION');
      if (result!.type === 'USER_QUESTION') {
        expect(result!.category).toBe('business');
        expect(result!.question).toBe('What revenue model do you prefer?');
        expect(result!.options).toEqual(['Subscription', 'Freemium', 'Ad-based']);
        expect(result!.defaultOption).toBe('Freemium');
        expect(result!.required).toBe(true);
      }
    });

    it('parses question without optional fields', () => {
      const input = `[USER_QUESTION]
category: clarification
question: Which database do you want?
options:
  - PostgreSQL
  - MySQL
[/USER_QUESTION]`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'USER_QUESTION') {
        expect(result!.question).toBe('Which database do you want?');
        expect(result!.options).toEqual(['PostgreSQL', 'MySQL']);
        expect(result!.defaultOption).toBeUndefined();
      }
    });

    it('handles question embedded in other output', () => {
      const input = `Working on task...
Analyzing requirements...
[USER_QUESTION]
category: choice
question: Pick a framework
options:
  - React
  - Vue
[/USER_QUESTION]
Continuing work...`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('USER_QUESTION');
    });
  });

  describe('PHASE_COMPLETE', () => {
    it('parses phase complete signal', () => {
      const input = `=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_persona.md`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('PHASE_COMPLETE');
      if (result!.type === 'PHASE_COMPLETE') {
        expect(result!.phase).toBe(1);
        expect(result!.phaseName).toBe('Phase 1 (Planning)');
        expect(result!.documents).toEqual([
          'docs/planning/01_idea.md',
          'docs/planning/02_market.md',
          'docs/planning/03_persona.md',
        ]);
      }
    });

    it('parses phase 2 complete', () => {
      const input = `=== PHASE 2 COMPLETE ===
Completed: Phase 2 (Design)
Documents created:
- docs/design/01_screen.md
- docs/design/02_data_model.md`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'PHASE_COMPLETE') {
        expect(result!.phase).toBe(2);
        expect(result!.documents.length).toBe(2);
      }
    });
  });

  describe('ERROR', () => {
    it('parses recoverable error', () => {
      const input = `[ERROR]
type: recoverable
message: Rate limit exceeded
details: API rate limit hit, will retry after cooldown
recovery: pause_and_retry
[/ERROR]`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ERROR');
      if (result!.type === 'ERROR') {
        expect(result!.severity).toBe('recoverable');
        expect(result!.message).toBe('Rate limit exceeded');
        expect(result!.recovery).toBe('pause_and_retry');
      }
    });

    it('parses fatal error', () => {
      const input = `[ERROR]
type: fatal
message: Permission denied
details: Cannot access workspace directory
recovery: checkpoint_and_fail
[/ERROR]`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'ERROR') {
        expect(result!.severity).toBe('fatal');
        expect(result!.recovery).toBe('checkpoint_and_fail');
      }
    });
  });

  describe('CUSTOM_TASK_COMPLETE', () => {
    it('parses basic custom task complete signal', () => {
      const input = `=== CUSTOM TASK COMPLETE ===`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('CUSTOM_TASK_COMPLETE');
    });

    it('parses custom task complete with details', () => {
      const input = `=== CUSTOM TASK COMPLETE ===
Task: JWT authentication explanation
Summary: Explained JWT structure, signing, and verification process`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('CUSTOM_TASK_COMPLETE');
      if (result!.type === 'CUSTOM_TASK_COMPLETE') {
        expect(result!.task).toBe('JWT authentication explanation');
        expect(result!.summary).toBe(
          'Explained JWT structure, signing, and verification process'
        );
      }
    });
  });

  describe('ERROR with notify_user recovery', () => {
    it('parses error with notify_user recovery', () => {
      const input = `[ERROR]
type: recoverable
message: Invalid guide document
details: guide/planning/01_idea.md missing sections
recovery: notify_user
[/ERROR]`;

      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'ERROR') {
        expect(result!.recovery).toBe('notify_user');
      }
    });
  });

  describe('streaming (feed)', () => {
    it('handles multi-chunk protocol messages', () => {
      const protocols1 = parser.feed('[USER_QUESTION]\ncategory: business\n');
      expect(protocols1.length).toBe(0); // Incomplete

      const protocols2 = parser.feed('question: What model?\noptions:\n  - Free\n  - Paid\n[/USER_QUESTION]');
      expect(protocols2.length).toBe(1);
      expect(protocols2[0].type).toBe('USER_QUESTION');
    });

    it('returns empty for non-protocol output', () => {
      const result = parser.feed('Just some regular log output\n');
      expect(result.length).toBe(0);
    });

    it('handles multiple protocols in one chunk', () => {
      const input = `[ERROR]
type: recoverable
message: Retry
details: Retrying
recovery: pause_and_retry
[/ERROR]
=== PHASE 1 COMPLETE ===
Completed: Phase 1
Documents created:
- doc.md
`;
      const results = parser.feed(input);
      expect(results.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty input', () => {
      expect(parser.parse('')).toBeNull();
    });

    it('returns null for malformed protocol without closing tag', () => {
      const input = '[USER_QUESTION]\ncategory: broken\nquestion: Incomplete\n';
      // Feed but no closing tag, should not parse
      expect(parser.parse(input)).toBeNull();
    });

    it('handles very large non-protocol output without crashing', () => {
      const bigOutput = 'x'.repeat(100_000);
      expect(parser.parse(bigOutput)).toBeNull();
    });

    it('handles unicode in question text', () => {
      const input = `[USER_QUESTION]
category: clarification
question: 어떤 데이터베이스를 사용하시겠습니까?
options:
  - PostgreSQL
  - MySQL
[/USER_QUESTION]`;
      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'USER_QUESTION') {
        expect(result!.question).toContain('데이터베이스');
      }
    });

    it('handles emoji in protocol content', () => {
      const input = `[USER_QUESTION]
category: choice
question: Choose theme 🎨
options:
  - Light ☀️
  - Dark 🌙
[/USER_QUESTION]`;
      const result = parser.parse(input);
      expect(result).not.toBeNull();
      if (result!.type === 'USER_QUESTION') {
        expect(result!.question).toContain('🎨');
        expect(result!.options).toEqual(['Light ☀️', 'Dark 🌙']);
      }
    });

    it('reset clears buffer state', () => {
      parser.feed('[USER_QUESTION]\ncategory: test\n');
      parser.reset();
      // After reset, the partial message is gone
      const results = parser.feed('question: Q?\noptions:\n  - A\n[/USER_QUESTION]');
      // Should not form a complete protocol since the header was cleared
      expect(results.length).toBe(0);
    });
  });
});
