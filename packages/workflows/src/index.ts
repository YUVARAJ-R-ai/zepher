import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { ZEPHER_DIR, LOCAL_DIR, ensureGitIgnored } from '@zepher/core';

export interface WorkflowPhase { id: string; title: string; steps: string[]; validate?: string; }
export interface Workflow { name: string; description: string; phases: WorkflowPhase[]; }
export interface WorkflowProgress { workflow: Workflow; completed: string[]; next: string | null; }
export type CommandRunner = (command: string, cwd: string) => void; // throws on failure

const WORKFLOWS: Workflow[] = [
  {
    name: 'feature-development',
    description: 'Build a feature from requirements through tested, reviewed code to handoff',
    phases: [
      { id: 'requirements', title: 'Requirements', steps: ['Read project context and relevant memory', 'Write down the acceptance criteria', 'Check .zepher/decisions/ for conflicting ADRs'] },
      { id: 'test', title: 'Test', steps: ['Write failing tests that encode the acceptance criteria'] },
      { id: 'code', title: 'Code', steps: ['Implement the smallest change that makes the tests pass'], validate: 'zepher hook run pre-commit' },
      { id: 'lint', title: 'Lint', steps: ['Fix all lint and type errors'], validate: 'zepher hook run pre-sync' },
      { id: 'review', title: 'Review', steps: ['Review your own diff for correctness, naming and leftovers'] },
      { id: 'handoff', title: 'Handoff', steps: ['Run `zepher handoff` to record what was done and what is next'] }
    ]
  },
  {
    name: 'bug-fix',
    description: 'Reproduce a bug, pin it with a test, fix it and verify',
    phases: [
      { id: 'reproduce', title: 'Reproduce', steps: ['Reproduce the bug and note the exact failing behaviour'] },
      { id: 'test-case', title: 'Test case', steps: ['Write a test that fails because of the bug'] },
      { id: 'fix', title: 'Fix', steps: ['Fix the root cause, not the symptom'], validate: 'zepher hook run pre-commit' },
      { id: 'verify', title: 'Verify', steps: ['Confirm the new test passes and nothing else regressed'], validate: 'zepher verify' },
      { id: 'handoff', title: 'Handoff', steps: ['Run `zepher handoff` to record the cause and the fix'] }
    ]
  },
  {
    name: 'security-audit',
    description: 'Scan for leaked secrets, check dependencies, verify the vault and report',
    phases: [
      { id: 'scan', title: 'Scan', steps: ['Search the code and memory for hardcoded secrets and unsafe patterns'] },
      { id: 'dependencies', title: 'Check dependencies', steps: ['Review the audit output for high severity advisories'], validate: 'npm audit --audit-level=high' },
      { id: 'vault', title: 'Vault verify', steps: ['Run `zepher vault status` and confirm every secret is sealed'] },
      { id: 'report', title: 'Report', steps: ['Summarise findings with severity and recommended fixes'] }
    ]
  }
];

export function listWorkflows(): Workflow[] {
  return WORKFLOWS;
}

function statePath(projectRoot: string, name: string): string {
  return path.join(projectRoot, ZEPHER_DIR, LOCAL_DIR, 'workflows', `${name}.json`);
}

function readCompleted(projectRoot: string, name: string): string[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(projectRoot, name), 'utf-8'));
    return Array.isArray(parsed.completed) ? parsed.completed.filter((c: unknown) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function getWorkflowProgress(projectRoot: string, name: string): WorkflowProgress | undefined {
  const workflow = WORKFLOWS.find(w => w.name === name);
  if (!workflow) return undefined;
  const done = readCompleted(projectRoot, name);
  const completed = workflow.phases.map(p => p.id).filter(id => done.includes(id));
  const next = workflow.phases.find(p => !completed.includes(p.id));
  return { workflow, completed, next: next ? next.id : null };
}

const defaultRunner: CommandRunner = (command, cwd) => {
  const [bin, ...args] = command.split(/\s+/);
  // `zepher` may not be on PATH, so re-invoke the running CLI
  if (bin === 'zepher') execFileSync(process.execPath, [process.argv[1], ...args], { cwd, stdio: 'inherit' });
  else execFileSync(bin, args, { cwd, stdio: 'inherit' });
};

export function completePhase(projectRoot: string, name: string, phaseId: string, run: CommandRunner = defaultRunner): { success: boolean; message: string } {
  const progress = getWorkflowProgress(projectRoot, name);
  if (!progress) return { success: false, message: `Unknown workflow: ${name}` };
  const phase = progress.workflow.phases.find(p => p.id === phaseId);
  if (!phase) return { success: false, message: `Unknown phase '${phaseId}' in ${name}` };
  if (progress.next !== phaseId) {
    return { success: false, message: progress.next ? `Phase '${phaseId}' is not next; complete '${progress.next}' first` : `Workflow ${name} is already complete` };
  }
  if (phase.validate) {
    try {
      run(phase.validate, projectRoot);
    } catch (e: any) {
      return { success: false, message: `Validation failed for '${phaseId}' (${phase.validate}): ${e.message || e}` };
    }
  }
  const file = statePath(projectRoot, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  ensureGitIgnored(projectRoot, `${ZEPHER_DIR}/${LOCAL_DIR}/`);
  fs.writeFileSync(file, JSON.stringify({ completed: [...progress.completed, phaseId] }, null, 2));
  const following = progress.workflow.phases[progress.workflow.phases.indexOf(phase) + 1];
  return { success: true, message: following ? `Completed '${phaseId}'. Next: '${following.id}'` : `Completed '${phaseId}'. Workflow ${name} is complete` };
}

export function resetWorkflow(projectRoot: string, name: string): void {
  if (!WORKFLOWS.some(w => w.name === name)) return;
  fs.rmSync(statePath(projectRoot, name), { force: true });
}
