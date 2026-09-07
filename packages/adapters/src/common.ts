import { Hook } from '@zepher/core';

export function formatHooksPrompt(hooks: Hook[]): string {
  if (!hooks || hooks.length === 0) return '';
  const verificationHooks = hooks.filter(h => h.stage === 'pre-commit' || h.stage === 'pre-sync');
  if (verificationHooks.length === 0) return '';

  let section = `## Mandatory Verification & Pre-Commit Hooks\n`;
  section += `Before completing tasks or committing code, you MUST execute and pass these checks:\n`;
  for (const h of verificationHooks) {
    section += `- **${h.name}** (${h.stage}): \`${h.run}\`\n`;
  }
  return section + '\n';
}
import fs from 'fs';
import path from 'path';
import { generateSafeEnvSchema } from '@zepher/core';

export function formatVaultPrompt(projectRoot: string): string {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return '';

  try {
    const raw = fs.readFileSync(envPath, 'utf-8');
    return generateSafeEnvSchema(raw);
  } catch {
    return '';
  }
}
