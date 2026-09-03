import { describe, it, expect } from 'vitest';
import { cursorAdapter } from './cursor.js';
import { claudeAdapter } from './claude.js';
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
});
