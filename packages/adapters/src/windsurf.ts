import fs from 'fs';
import path from 'path';
import { AgentAdapter, UnifiedZepherState, AdapterOutput } from '@zepher/core';
import { formatHooksPrompt, formatVaultPrompt } from './common.js';

export const windsurfAdapter: AgentAdapter = {
  id: 'windsurf',
  name: 'Windsurf',
  targetFiles: ['.windsurfrules'],
  detect(projectRoot: string) {
    return fs.existsSync(path.join(projectRoot, '.windsurfrules')) ||
      fs.existsSync(path.join(projectRoot, '.codeium'));
  },
  compile(state: UnifiedZepherState, projectRoot: string): AdapterOutput {
    let content = `# Windsurf AI Rules for ${state.project.name}\n\n`;

    if (state.rules.length > 0) {
      content += `## Project Instructions\n\n`;
      for (const rule of state.rules) {
        content += `- **${rule.title}**: ${rule.content.replace(/\n/g, ' ')}\n`;
      }
      content += '\n';
    }

    const hooksSection = formatHooksPrompt(state.hooks);
    if (hooksSection) {
      content += hooksSection + '\n';
    }

    const vaultSection = formatVaultPrompt(projectRoot);
    if (vaultSection) {
      content += vaultSection + '\n';
    }

    if (state.skills.length > 0) {
      content += `## Available Skills\n\n`;
      for (const skill of state.skills) {
        content += `- **${skill.name}**: ${skill.description}\n`;
      }
      content += '\n';
    }

    content += `## Context Strategy\n`;
    content += `- Maintain context continuity using .zepher/ directory.\n`;
    content += `- Read .zepher/context/current.md for project overview.\n`;
    content += `- Follow active tasks in .zepher/tasks/active/.\n`;

    return {
      files: [
        {
          path: '.windsurfrules',
          content: content.trim() + '\n'
        }
      ]
    };
  },
  import(content: string, filePath: string): Partial<UnifiedZepherState> {
    const rules = [];
    const lines = content.split('\n');
    let inInstructionsSection = false;

    for (const line of lines) {
      if (line.startsWith('## Project Instructions')) {
        inInstructionsSection = true;
        continue;
      } else if (line.startsWith('## ')) {
        inInstructionsSection = false;
        continue;
      }

      if (inInstructionsSection) {
        const match = line.match(/^-\s+\*\*([^*]+)\*\*:\s*(.+)$/);
        if (match) {
          const title = match[1].trim();
          const ruleContent = match[2].trim();
          rules.push({
            id: title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
            title,
            content: ruleContent,
            scope: 'local' as const,
            priority: 50
          });
        }
      }
    }

    return { rules };
  }
};

