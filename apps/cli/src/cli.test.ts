import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { buildSync } from 'esbuild';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('CLI exit codes', () => {
  let tmp: string;
  let project: string;
  let bundle: string;
  const runAt = (cwd: string, ...args: string[]) =>
    spawnSync(process.execPath, [bundle, ...args], {
      cwd,
      env: { ...process.env, HOME: path.join(tmp, 'home') },
      encoding: 'utf-8'
    });
  const run = (...args: string[]) => runAt(project, ...args);

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

  it('asset pull exits non-zero on failure', () => {
    expect(run('asset', 'pull', 'missing.bin').status).toBe(1);
  }, 60_000);

  it('not-found and invalid-argument paths exit non-zero', () => {
    expect(run('task', 'complete', 'nope').status).toBe(1);
    expect(run('adr', 'show', 'nope').status).toBe(1);
    expect(run('hook', 'run', 'pre-comit').status).toBe(1);
    expect(run('rule', 'remove', 'nope').status).toBe(1);
    expect(run('integrate', 'enable', 'nope').status).toBe(1);
  }, 60_000);

  it('remember rejects a path-traversing type and writes nothing', () => {
    expect(run('remember', '-t', '../../pwned', 'x').status).toBe(1);
    expect(fs.existsSync(path.join(tmp, 'pwned.md'))).toBe(false);
    expect(fs.existsSync(path.join(project, '..', 'pwned.md'))).toBe(false);
  }, 60_000);

  it('vault seal warns on stderr when no passphrase is given', () => {
    const dir = fs.mkdtempSync(path.join(tmp, 'warn-'));
    fs.writeFileSync(path.join(dir, '.env'), 'A=1\n');
    runAt(dir, 'vault', 'track', '.env');
    expect(runAt(dir, 'vault', 'seal').stderr).toContain('default key, which is public');
    expect(runAt(dir, 'vault', 'seal', '-p', 'pw').stderr).not.toContain('default key');
  }, 60_000);

  it('workflow: --json lists, --done/--reset need a name, failing hook records nothing', () => {
    const dir = fs.mkdtempSync(path.join(tmp, 'wf-'));
    const list = runAt(dir, 'workflow', '--json');
    expect(list.status).toBe(0);
    expect(JSON.parse(list.stdout).map((w: { name: string }) => w.name)).toContain('bug-fix');
    expect(runAt(dir, 'workflow', '--done', 'x').status).toBe(1);
    expect(runAt(dir, 'workflow', '--reset').status).toBe(1);

    // Real runner: a failing pre-commit hook blocks the 'fix' phase.
    fs.mkdirSync(path.join(dir, '.zepher', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.zepher', 'hooks', 'fail.yaml'), 'name: fail\nstage: pre-commit\nrun: "false"\n');
    expect(runAt(dir, 'workflow', 'bug-fix', '--done', 'reproduce').status).toBe(0);
    expect(runAt(dir, 'workflow', 'bug-fix', '--done', 'test-case').status).toBe(0);
    expect(runAt(dir, 'workflow', 'bug-fix', '--done', 'fix').status).toBe(1);
    const progress = JSON.parse(runAt(dir, 'workflow', 'bug-fix', '--json').stdout);
    expect(progress.completed).toEqual(['reproduce', 'test-case']);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8')).toContain('.zepher/local/');
  }, 60_000);

  describe('verify against global config', () => {
    const globalRules = () => path.join(tmp, 'home', '.zepher', 'rules');
    const setup = (): string => {
      fs.mkdirSync(globalRules(), { recursive: true });
      fs.writeFileSync(path.join(globalRules(), 'g.md'), '---\nid: g\ntitle: Global Rule\n---\nGLOBAL-ONLY-TEXT\n');
      return fs.mkdtempSync(path.join(tmp, 'drift-'));
    };
    afterEach(() => fs.rmSync(path.join(tmp, 'home', '.zepher'), { recursive: true, force: true }));

    it('accepts project-only files', () => {
      const dir = setup();
      expect(runAt(dir, 'sync', '--project-only', '--force').status).toBe(0);
      expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).not.toContain('GLOBAL-ONLY-TEXT');
      expect(runAt(dir, 'verify').status).toBe(0);
    }, 60_000);

    it('accepts full files', () => {
      const dir = setup();
      expect(runAt(dir, 'sync', '--force').status).toBe(0);
      expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).toContain('GLOBAL-ONLY-TEXT');
      expect(runAt(dir, 'verify').status).toBe(0);
    }, 60_000);

    it('rejects hand-edited files', () => {
      const dir = setup();
      runAt(dir, 'sync', '--project-only', '--force');
      fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nhand edit\n');
      const res = runAt(dir, 'verify');
      expect(res.status).toBe(1);
      expect(res.stdout).toContain('zepher sync --project-only');
    }, 60_000);
  });
});
