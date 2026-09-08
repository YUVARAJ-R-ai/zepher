import { describe, it, expect } from 'vitest';
import { cursorAdapter } from './cursor.js';
import { claudeAdapter } from './claude.js';
import { geminiAdapter } from './gemini.js';
import { windsurfAdapter } from './windsurf.js';
import { copilotAdapter } from './copilot.js';
import { UnifiedZepherState } from '@zepher/core';

describe('Vendor Adapters Compilation', () => {
  const dummyState: UnifiedZepherState = {
    project: { name: 'test-app', root: '/test-app' },
    rules: [
      {
        id: 'no-any',
        title: 'No Any Type',
        content: 'Avoid using any in TypeScript',
        priority: 95,
        scope: 'local'
      }
    ],
    skills: [
      {
        name: 'testing',
        description: 'Run unit tests',
        scope: 'global',
        path: '/skills/testing',
        content: '# Testing'
      }
    ],
    hooks: [],
    lockfile: { version: '1.0', skills: {} }
  };

  it('compiles cursor rules with priority ordering', async () => {
    const output = await cursorAdapter.compile(dummyState, '/test-app');
    expect(output.files.length).toBe(1);
    expect(output.files[0].path).toBe('.cursorrules');
    expect(output.files[0].content).toContain('No Any Type (Priority: 95)');
    expect(output.files[0].content).toContain('Avoid using any in TypeScript');
    expect(output.files[0].content).toContain('**testing**: Run unit tests');
  });

  it('compiles claude instructions with MCP json merge', async () => {
    const output = await claudeAdapter.compile(dummyState, '/test-app');
    expect(output.files[0].path).toBe('CLAUDE.md');
    expect(output.files[0].content).toContain('No Any Type');
    expect(output.jsonMerges?.length).toBe(1);
    expect(output.jsonMerges?.[0].path).toBe('.claude.json');
    expect(output.jsonMerges?.[0].patch.mcpServers.zepher).toBeDefined();
  });

  it('injects mandatory verification hooks into cursor and claude rules', async () => {
    const stateWithHooks: UnifiedZepherState = {
      ...dummyState,
      hooks: [
        {
          name: 'typecheck',
          stage: 'pre-commit',
          run: 'tsc --noEmit',
          scope: 'local'
        }
      ]
    };

    const cursorOut = await cursorAdapter.compile(stateWithHooks, '/test-app');
    expect(cursorOut.files[0].content).toContain('Mandatory Verification & Pre-Commit Hooks');
    expect(cursorOut.files[0].content).toContain('**typecheck** (pre-commit): `tsc --noEmit`');

    const claudeOut = await claudeAdapter.compile(stateWithHooks, '/test-app');
    expect(claudeOut.files[0].content).toContain('Mandatory Verification & Pre-Commit Hooks');
    expect(claudeOut.files[0].content).toContain('**typecheck** (pre-commit): `tsc --noEmit`');
  });

  it('compiles glob-scoped rules into individual .cursor/rules/<id>.mdc files', async () => {
    const stateWithGlobs: UnifiedZepherState = {
      ...dummyState,
      rules: [
        {
          id: 'react-components',
          title: 'React Components Rule',
          content: 'Use functional components with memo',
          priority: 85,
          scope: 'local',
          globs: ['src/components/**/*.tsx']
        },
        ...dummyState.rules
      ]
    };

    const output = await cursorAdapter.compile(stateWithGlobs, '/test-app');
    expect(output.files.length).toBe(2);

    const mdcFile = output.files.find(f => f.path === '.cursor/rules/react-components.mdc');
    expect(mdcFile).toBeDefined();
    expect(mdcFile?.content).toContain('globs:');
    expect(mdcFile?.content).toContain('src/components/**/*.tsx');
    expect(mdcFile?.content).toContain('Use functional components with memo');

    const mainRules = output.files.find(f => f.path === '.cursorrules');
    expect(mainRules?.content).toContain('No Any Type');
    expect(mainRules?.content).not.toContain('React Components Rule');
  });

  it('compiles cursor rules with .cursor/mcp.json merge', async () => {
    const output = await cursorAdapter.compile(dummyState, '/test-app');
    expect(output.jsonMerges).toBeDefined();
    expect(output.jsonMerges?.some(m => m.path === '.cursor/mcp.json')).toBe(true);
    const cursorMcp = output.jsonMerges?.find(m => m.path === '.cursor/mcp.json');
    expect(cursorMcp?.patch.mcpServers.zepher.command).toBe('zepher');
  });

  it('compiles and imports gemini rules with hooks and skills', async () => {
    const output = await geminiAdapter.compile(dummyState, '/test-app');
    expect(output.files[0].path).toBe('.gemini/rules/zepher-rules.md');
    expect(output.files[0].content).toContain('No Any Type');
    expect(output.files[0].content).toContain('testing');

    if (geminiAdapter.import) {
      const imported = await geminiAdapter.import(output.files[0].content, output.files[0].path);
      expect(imported.rules?.length).toBeGreaterThan(0);
      expect(imported.rules?.[0].title).toBe('No Any Type');
    }
  });

  it('compiles and imports windsurf rules', async () => {
    const output = await windsurfAdapter.compile(dummyState, '/test-app');
    expect(output.files[0].path).toBe('.windsurfrules');
    expect(output.files[0].content).toContain('**No Any Type**');

    if (windsurfAdapter.import) {
      const imported = await windsurfAdapter.import(output.files[0].content, output.files[0].path);
      expect(imported.rules?.length).toBe(1);
      expect(imported.rules?.[0].title).toBe('No Any Type');
    }
  });

  it('compiles and imports copilot instructions', async () => {
    const output = await copilotAdapter.compile(dummyState, '/test-app');
    expect(output.files[0].path).toBe('.github/copilot-instructions.md');
    expect(output.files[0].content).toContain('No Any Type');

    if (copilotAdapter.import) {
      const imported = await copilotAdapter.import(output.files[0].content, output.files[0].path);
      expect(imported.rules?.length).toBe(1);
      expect(imported.rules?.[0].title).toBe('No Any Type');
    }
  });
});
