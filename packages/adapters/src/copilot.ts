import fs from 'fs';
import path from 'path';
import { AgentAdapter, UnifiedZepherState, AdapterOutput } from '@zepher/core';

export const copilotAdapter: AgentAdapter = {
  id: 'copilot',
  name: 'GitHub Copilot',
  targetFiles: ['.github/copilot-instructions.md'],
  detect(projectRoot: string) {
    return fs.existsSync(path.join(projectRoot, '.github/copilot-instructions.md')) ||
      fs.existsSync(path.join(projectRoot, '.github'));
  },
  compile(state: UnifiedZepherState, projectRoot: string): AdapterOutput {
    let content = `# GitHub Copilot Workspace Instructions\n\n`;

    if (state.rules.length > 0) {
      content += `## Coding Guidelines & Standards\n\n`;
      for (const rule of state.rules) {
        content += `### ${rule.title}\n${rule.content.trim()}\n\n`;
      }
    }

    return {
      files: [
        {
          path: '.github/copilot-instructions.md',
          content: content.trim() + '\n'
        }
      ]
    };
  }
};
