import { execSync } from 'child_process';
import { Hook } from './types.js';

export interface HookRunResult {
  hook: Hook;
  success: boolean;
  output?: string;
  error?: string;
}

export function runHooks(stage: Hook['stage'], hooks: Hook[], projectRoot: string): HookRunResult[] {
  const matching = hooks.filter(h => h.stage === stage);
  const results: HookRunResult[] = [];

  for (const h of matching) {
    try {
      const output = execSync(h.run, {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      results.push({ hook: h, success: true, output });
    } catch (err: any) {
      results.push({
        hook: h,
        success: false,
        error: err.stderr || err.message
      });
    }
  }

  return results;
}
