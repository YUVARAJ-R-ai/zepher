import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildSync } from 'esbuild';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('CLI exit codes', () => {
  let tmp: string;
  let project: string;
  let bundle: string;
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [bundle, ...args], {
      cwd: project,
      env: { ...process.env, HOME: path.join(tmp, 'home') },
      encoding: 'utf-8'
    });

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-cli-test-'));
    project = path.join(tmp, 'project');
    fs.mkdirSync(path.join(tmp, 'home'));
    fs.mkdirSync(project);
    bundle = path.join(tmp, 'zepher.mjs');
    buildSync({
      entryPoints: [path.resolve(__dirname, 'index.ts')],
      bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: bundle
    });
    // The bundle lives outside the repo, so its externals must resolve from the repo.
    fs.symlinkSync(path.resolve(__dirname, '../../../node_modules'), path.join(tmp, 'node_modules'));
  }, 60_000);

  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('vault track/seal/unseal exit non-zero on failure', () => {
    expect(run('vault', 'track', 'missing.env').status).toBe(1);
    fs.writeFileSync(path.join(project, '.env'), 'A=1\n');
    expect(run('vault', 'track', '.env').status).toBe(0);
    expect(run('vault', 'seal', '-p', 'pw').status).toBe(0);
    fs.rmSync(path.join(project, '.env'));
    expect(run('vault', 'unseal', '-p', 'wrong').status).toBe(1);
    expect(run('vault', 'unseal', '-p', 'pw').status).toBe(0);
  }, 60_000);

  it('asset track/stash exit non-zero on failure', () => {
    expect(run('asset', 'track', 'missing.bin').status).toBe(1);
    expect(run('asset', 'stash', 'missing.bin').status).toBe(1);
  }, 60_000);
});
