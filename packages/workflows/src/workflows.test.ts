import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listWorkflows, getWorkflowProgress, completePhase, resetWorkflow, CommandRunner } from './index.js';

describe('workflows', () => {
  let tmp: string;
  const ran: string[] = [];
  const ok: CommandRunner = (c) => { ran.push(c); };
  const stateFile = (n: string) => path.join(tmp, '.zepher', 'local', 'workflows', `${n}.json`);

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-wf-'));
    ran.length = 0;
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('defines the three workflows with their phase order', () => {
    const order = Object.fromEntries(listWorkflows().map(w => [w.name, w.phases.map(p => p.id)]));
    expect(order).toEqual({
      'feature-development': ['requirements', 'test', 'code', 'lint', 'review', 'handoff'],
      'bug-fix': ['reproduce', 'test-case', 'fix', 'verify', 'handoff'],
      'security-audit': ['scan', 'dependencies', 'vault', 'report']
    });
  });

  it('starts at the first phase and returns undefined for unknown names', () => {
    expect(getWorkflowProgress(tmp, 'bug-fix')).toMatchObject({ completed: [], next: 'reproduce' });
    expect(getWorkflowProgress(tmp, 'nope')).toBeUndefined();
  });

  it('enforces phase order', () => {
    const res = completePhase(tmp, 'bug-fix', 'fix', ok);
    expect(res.success).toBe(false);
    expect(res.message).toContain('reproduce');
    expect(completePhase(tmp, 'bug-fix', 'bogus', ok).success).toBe(false);
    expect(completePhase(tmp, 'nope', 'x', ok).success).toBe(false);
  });

  it('advances, persists, and runs validation commands', () => {
    expect(completePhase(tmp, 'bug-fix', 'reproduce', ok).message).toContain('test-case');
    completePhase(tmp, 'bug-fix', 'test-case', ok);
    expect(completePhase(tmp, 'bug-fix', 'fix', ok).success).toBe(true);
    expect(ran).toEqual(['zepher hook run pre-commit']);
    expect(getWorkflowProgress(tmp, 'bug-fix')).toMatchObject({ completed: ['reproduce', 'test-case', 'fix'], next: 'verify' });
  });

  it('does not record a phase whose validation fails', () => {
    completePhase(tmp, 'bug-fix', 'reproduce', ok);
    completePhase(tmp, 'bug-fix', 'test-case', ok);
    const res = completePhase(tmp, 'bug-fix', 'fix', () => { throw new Error('tests red'); });
    expect(res.success).toBe(false);
    expect(res.message).toContain('tests red');
    expect(getWorkflowProgress(tmp, 'bug-fix')?.next).toBe('fix');
  });

  it('treats a corrupt state file as empty', () => {
    fs.mkdirSync(path.dirname(stateFile('bug-fix')), { recursive: true });
    fs.writeFileSync(stateFile('bug-fix'), '{not json');
    expect(getWorkflowProgress(tmp, 'bug-fix')).toMatchObject({ completed: [], next: 'reproduce' });
  });

  it('resets progress', () => {
    completePhase(tmp, 'bug-fix', 'reproduce', ok);
    resetWorkflow(tmp, 'bug-fix');
    expect(getWorkflowProgress(tmp, 'bug-fix')?.next).toBe('reproduce');
  });

  it('rejects path-escaping names and writes nothing', () => {
    expect(completePhase(tmp, '../../evil', 'x', ok).success).toBe(false);
    resetWorkflow(tmp, '../../evil');
    expect(fs.existsSync(path.join(tmp, '.zepher'))).toBe(false);
  });

  it('git-ignores the local state folder when writing state', () => {
    completePhase(tmp, 'bug-fix', 'reproduce', ok);
    expect(fs.readFileSync(path.join(tmp, '.gitignore'), 'utf-8')).toContain('.zepher/local/');
  });
});
