import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DeliverableCollector } from '../DeliverableCollector.js';

describe('DeliverableCollector', () => {
  const collector = new DeliverableCollector();
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when deliverableDir is empty string', () => {
    const result = collector.collect(tmpDir, '');
    expect(result).toEqual([]);
  });

  it('returns empty array when directory does not exist', () => {
    const result = collector.collect(tmpDir, 'nonexistent');
    expect(result).toEqual([]);
  });

  it('collects files from a directory', () => {
    const docsDir = path.join(tmpDir, 'docs', 'planning');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, '01_idea.md'), 'My app idea');
    fs.writeFileSync(path.join(docsDir, '02_market.md'), 'Market analysis');

    const result = collector.collect(tmpDir, 'docs/planning');
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.path).sort()).toEqual([
      'docs/planning/01_idea.md',
      'docs/planning/02_market.md',
    ]);
    expect(result[0].content).toBeTruthy();
    expect(result[0].size).toBeGreaterThan(0);
  });

  it('recursively collects from subdirectories', () => {
    const srcDir = path.join(tmpDir, 'src');
    const componentsDir = path.join(srcDir, 'components');
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export {}');
    fs.writeFileSync(path.join(componentsDir, 'App.tsx'), '<App />');

    const result = collector.collect(tmpDir, 'src');
    expect(result).toHaveLength(2);
    const paths = result.map((d) => d.path);
    expect(paths).toContain('src/index.ts');
    expect(paths).toContain('src/components/App.tsx');
  });

  it('skips hidden directories and node_modules', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(path.join(srcDir, '.git'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export {}');
    fs.writeFileSync(path.join(srcDir, '.git', 'config'), 'git config');
    fs.writeFileSync(path.join(srcDir, 'node_modules', 'pkg.json'), '{}');

    const result = collector.collect(tmpDir, 'src');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/index.ts');
  });

  describe('phase-specific directory mapping', () => {
    it('collects planning deliverables from docs/planning', () => {
      const planningDir = path.join(tmpDir, 'docs', 'planning');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(path.join(planningDir, '01_idea.md'), 'Idea content');
      fs.writeFileSync(path.join(planningDir, '02_market.md'), 'Market content');
      fs.writeFileSync(path.join(planningDir, '03_persona.md'), 'Persona content');

      const result = collector.collect(tmpDir, 'docs/planning');
      expect(result).toHaveLength(3);
      expect(result.map((d) => d.path).sort()).toEqual([
        'docs/planning/01_idea.md',
        'docs/planning/02_market.md',
        'docs/planning/03_persona.md',
      ]);
    });

    it('collects design deliverables from docs/design', () => {
      const designDir = path.join(tmpDir, 'docs', 'design');
      fs.mkdirSync(designDir, { recursive: true });
      fs.writeFileSync(path.join(designDir, '01_screen.md'), 'Screen flow');
      fs.writeFileSync(path.join(designDir, '02_data_model.md'), 'Data model');

      const result = collector.collect(tmpDir, 'docs/design');
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.path).sort()).toEqual([
        'docs/design/01_screen.md',
        'docs/design/02_data_model.md',
      ]);
    });

    it('collects development deliverables from src', () => {
      const srcDir = path.join(tmpDir, 'src');
      const libDir = path.join(srcDir, 'lib');
      fs.mkdirSync(libDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export {}');
      fs.writeFileSync(path.join(srcDir, 'app.tsx'), '<App />');
      fs.writeFileSync(path.join(libDir, 'utils.ts'), 'export function foo() {}');

      const result = collector.collect(tmpDir, 'src');
      expect(result).toHaveLength(3);
      const paths = result.map((d) => d.path);
      expect(paths).toContain('src/index.ts');
      expect(paths).toContain('src/app.tsx');
      expect(paths).toContain('src/lib/utils.ts');
    });

    it('returns correct content and size for each deliverable', () => {
      const docsDir = path.join(tmpDir, 'docs', 'planning');
      fs.mkdirSync(docsDir, { recursive: true });
      const content = 'This is a detailed planning document.';
      fs.writeFileSync(path.join(docsDir, '01_idea.md'), content);

      const result = collector.collect(tmpDir, 'docs/planning');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(content);
      expect(result[0].size).toBe(Buffer.byteLength(content));
      expect(result[0].path).toBe('docs/planning/01_idea.md');
    });
  });
});
