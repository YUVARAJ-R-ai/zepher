import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { resolveUnifiedState, trackVaultFile, sealVault, trackAsset, stashLocalAsset } from '@zepher/core';
import { server } from './index.js';
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

  describe('vault and asset tools via in-memory client', () => {
    let client: Client;

    beforeEach(async () => {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      client = new Client({ name: 'test', version: '0.0.0' }, { capabilities: {} });
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    });

    afterEach(async () => {
      await client.close();
    });

    const call = async (name: string): Promise<string> => {
      const res = await client.callTool({ name, arguments: { projectRoot: tmpDir } });
      return (res.content as { text: string }[])[0].text;
    };

    it('lists both tools', async () => {
      const { tools } = await client.listTools();
      const names = tools.map(t => t.name);
      expect(names).toContain('zepher_vault_status');
      expect(names).toContain('zepher_asset_list');
    });

    it('returns empty arrays for an empty project', async () => {
      expect(JSON.parse(await call('zepher_vault_status'))).toEqual([]);
      expect(JSON.parse(await call('zepher_asset_list'))).toEqual([]);
    });

    it('reports vault state without leaking secret values', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'API_KEY=super-secret-value-123\n');
      expect(trackVaultFile(tmpDir, '.env', 'secret', false).success).toBe(true);
      sealVault(tmpDir, 'test-pass');

      const text = await call('zepher_vault_status');
      const items = JSON.parse(text);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ path: '.env', type: 'secret', fileExists: true });
      expect(items[0].state).toBe('sync'); // plaintext present and matches the sealed copy
      expect(text).not.toContain('super-secret-value-123');
    });

    it('reports asset blob presence', async () => {
      fs.writeFileSync(path.join(tmpDir, 'a.bin'), 'aaa');
      fs.writeFileSync(path.join(tmpDir, 'b.bin'), 'bbb');
      trackAsset(tmpDir, 'a.bin');
      trackAsset(tmpDir, 'b.bin');
      stashLocalAsset(tmpDir, 'a.bin');

      const items = JSON.parse(await call('zepher_asset_list'));
      const byPath = Object.fromEntries(items.map((i: any) => [i.path, i]));
      expect(byPath['a.bin']).toMatchObject({ storage: 'local', blobPresent: true });
      expect(byPath['b.bin']).toMatchObject({ storage: 'local', blobPresent: false });
    });
  });
});
