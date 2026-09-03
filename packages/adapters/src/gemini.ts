import fs from 'fs';
import path from 'path';
import { AgentAdapter, UnifiedZepherState, AdapterOutput } from '@zepher/core';

export const geminiAdapter: AgentAdapter = {
  id: 'gemini',
  name: 'Gemini / Antigravity',
  targetFiles: ['.gemini/rules/zepher-rules.md'],
  detect(projectRoot: string) {
    return fs.existsSync(path.join(projectRoot, '.gemini'));
  },
  compile(state: UnifiedZepherState, projectRoot: string): AdapterOutput {
    let content = `# Zepher Unified Rules for Antigravity / Gemini\n\n`;

    if (state.rules.length > 0) {
      content += `## Enforced Project Rules\n\n`;
      for (const rule of state.rules) {
        content += `### ${rule.title} (Scope: ${rule.scope})\n${rule.content.trim()}\n\n`;
      }
    }

    return {
      files: [
        {
          path: '.gemini/rules/zepher-rules.md',
          content: content.trim() + '\n'
        }
      ]
    };
  }
};
