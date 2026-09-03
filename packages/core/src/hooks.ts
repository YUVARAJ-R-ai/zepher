import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZEPHER_DIR, GLOBAL_ZEPHER_DIR, HOOKS_DIR } from './constants.js';
import { Hook } from './types.js';
import { loadHooksFromDir } from './state-resolver.js';

export const VALID_HOOK_STAGES: Hook['stage'][] = [
  'pre-sync',
  'post-sync',
  'pre-commit',
  'post-commit'
];

export function addHook(options: {
  name: string;
  stage: Hook['stage'];
  run: string;
  global?: boolean;
  projectRoot?: string;
}): { filePath: string; hook: Hook } {
  if (!VALID_HOOK_STAGES.includes(options.stage)) {
    throw new Error(`Invalid hook stage "${options.stage}". Valid stages: ${VALID_HOOK_STAGES.join(', ')}`);
  }

  const baseDir = options.global
    ? path.join(GLOBAL_ZEPHER_DIR, HOOKS_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, HOOKS_DIR);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const cleanName = options.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${cleanName}.yaml`;
  const filePath = path.join(baseDir, fileName);

  const hookData = {
    name: cleanName,
    stage: options.stage,
    run: options.run
  };

  fs.writeFileSync(filePath, yaml.stringify(hookData), 'utf-8');

  const hook: Hook = {
    ...hookData,
    scope: options.global ? 'global' : 'local'
  };

  return { filePath, hook };
}

export function listAllHooks(projectRoot: string): { global: Hook[]; local: Hook[] } {
  const globalDir = path.join(GLOBAL_ZEPHER_DIR, HOOKS_DIR);
  const localDir = path.join(projectRoot, ZEPHER_DIR, HOOKS_DIR);

  return {
    global: loadHooksFromDir(globalDir, 'global'),
    local: loadHooksFromDir(localDir, 'local')
  };
}

export function removeHook(
  name: string,
  options: { global?: boolean; projectRoot?: string } = {}
): boolean {
  const baseDir = options.global
    ? path.join(GLOBAL_ZEPHER_DIR, HOOKS_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, HOOKS_DIR);

  if (!fs.existsSync(baseDir)) return false;

  const files = fs.readdirSync(baseDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);

    if (base === name) {
      fs.unlinkSync(path.join(baseDir, file));
      return true;
    }

    // Check inside yaml list
    if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
      const filePath = path.join(baseDir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = ext === '.json' ? JSON.parse(raw) : yaml.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((h: any) => h.name !== name);
          if (filtered.length !== parsed.length) {
            fs.writeFileSync(filePath, yaml.stringify(filtered), 'utf-8');
            return true;
          }
        } else if (parsed && parsed.hooks && Array.isArray(parsed.hooks)) {
          const filtered = parsed.hooks.filter((h: any) => h.name !== name);
          if (filtered.length !== parsed.hooks.length) {
            parsed.hooks = filtered;
            fs.writeFileSync(filePath, yaml.stringify(parsed), 'utf-8');
            return true;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return false;
}

const GIT_HOOK_START = '# --- BEGIN ZEPHER HOOK BRIDGE ---';
const GIT_HOOK_END = '# --- END ZEPHER HOOK BRIDGE ---';

export function installGitHooks(projectRoot: string): { success: boolean; message: string } {
  const gitDir = path.join(projectRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    return { success: false, message: 'Not a git repository (no .git directory found).' };
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const zepherBridgeScript = `${GIT_HOOK_START}
# Runs Zepher pre-commit lifecycle hooks before committing.
if command -v zepher >/dev/null 2>&1; then
  zepher hook run pre-commit
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "[Zepher] Pre-commit verification hooks failed. Commit aborted."
    exit $EXIT_CODE
  fi
fi
${GIT_HOOK_END}`;

  let content = '';
  if (fs.existsSync(preCommitPath)) {
    content = fs.readFileSync(preCommitPath, 'utf-8');
    if (content.includes(GIT_HOOK_START)) {
      // Replace existing bridge block
      const regex = new RegExp(`${GIT_HOOK_START}[\\s\\S]*?${GIT_HOOK_END}`, 'g');
      content = content.replace(regex, zepherBridgeScript);
    } else {
      // Append to existing pre-commit hook
      content = content.trim() + '\n\n' + zepherBridgeScript + '\n';
    }
  } else {
    // Brand new pre-commit script
    content = '#!/bin/sh\n\n' + zepherBridgeScript + '\n';
  }

  fs.writeFileSync(preCommitPath, content, 'utf-8');
  try {
    fs.chmodSync(preCommitPath, 0o755);
  } catch {
    // Windows or permission issue
  }

  return { success: true, message: `Installed Zepher pre-commit bridge to ${preCommitPath}` };
}

export function uninstallGitHooks(projectRoot: string): { success: boolean; message: string } {
  const preCommitPath = path.join(projectRoot, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(preCommitPath)) {
    return { success: true, message: 'No pre-commit hook found.' };
  }

  let content = fs.readFileSync(preCommitPath, 'utf-8');
  if (!content.includes(GIT_HOOK_START)) {
    return { success: true, message: 'Zepher hook bridge is not installed in .git/hooks/pre-commit.' };
  }

  const regex = new RegExp(`\\n?${GIT_HOOK_START}[\\s\\S]*?${GIT_HOOK_END}\\n?`, 'g');
  content = content.replace(regex, '').trim();

  if (content === '' || content === '#!/bin/sh') {
    fs.unlinkSync(preCommitPath);
  } else {
    fs.writeFileSync(preCommitPath, content + '\n', 'utf-8');
  }

  return { success: true, message: 'Uninstalled Zepher hook bridge from .git/hooks/pre-commit.' };
}
