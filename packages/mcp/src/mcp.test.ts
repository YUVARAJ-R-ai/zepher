import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveUnifiedState } from '@zepher/core';
import { listAllSkills } from '@zepher/skills';
import { runSync } from '@zepher/adapters';
import { createTask, completeTask, blockTask, listTasks } from '@zepher/tasks';
import { createDecision, listDecisions } from '@zepher/decisions';

describe('MCP v2 Tools Support', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-mcp-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

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

  it('supports task lifecycle tools for MCP', () => {
    const taskId = createTask(tmpDir, 'MCP Task Lifecycle');
    expect(listTasks(tmpDir, 'active')).toContain(taskId);

    const blocked = blockTask(tmpDir, taskId, 'Awaiting API keys');
    expect(blocked).toBe(true);
    expect(listTasks(tmpDir, 'blocked')).toContain(taskId);

    const completed = completeTask(tmpDir, taskId);
    expect(completed).toBe(true);
    expect(listTasks(tmpDir, 'completed')).toContain(taskId);
  });

  it('supports ADR creation and listing for MCP', () => {
    const adrFile = createDecision(tmpDir, 'MCP Protocol Standard', {
      status: 'Accepted',
      decision: 'Standardize on MCP 2024-11-05'
    });
    expect(adrFile).toContain('mcp-protocol-standard');

    const adrs = listDecisions(tmpDir);
    expect(adrs.length).toBe(1);
    expect(adrs[0].id).toBe('ADR-0001');
    expect(adrs[0].status).toBe('Accepted');
  });
});
