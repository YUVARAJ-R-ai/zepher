import { describe, it, expect } from 'vitest';
import { resolveUnifiedState, addRule } from '@zepher/core';
import { listAllSkills } from '@zepher/skills';
import { runSync } from '@zepher/adapters';

describe('MCP v2 Tools Support', () => {
  it('supports resolving rules for MCP zepher_get_rules', async () => {
    const state = await resolveUnifiedState(process.cwd());
    expect(Array.isArray(state.rules)).toBe(true);
    expect(state.rules.length).toBeGreaterThan(0);
  });

  it('supports listing skills for MCP zepher_list_skills', () => {
    const skills = listAllSkills(process.cwd());
    expect(skills).toBeDefined();
    expect(Array.isArray(skills.global)).toBe(true);
    expect(Array.isArray(skills.local)).toBe(true);
  });

  it('supports programmatic sync for MCP zepher_sync', async () => {
    const syncRes = await runSync(process.cwd(), { dryRun: true });
    expect(syncRes.success).toBe(true);
    expect(Array.isArray(syncRes.filesWritten)).toBe(true);
  });
});
