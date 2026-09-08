import fs from 'fs';
import path from 'path';
import { AgentAdapter, UnifiedZepherState, AdapterOutput } from '@zepher/core';
import { formatHooksPrompt, formatVaultPrompt } from './common.js';

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

    const hooksSection = formatHooksPrompt(state.hooks);
    if (hooksSection) {
      content += hooksSection + '\n';
    }

    const vaultSection = formatVaultPrompt(projectRoot);
    if (vaultSection) {
      content += vaultSection + '\n';
    }

    if (state.skills.length > 0) {
      content += `## Project Skills & Workflows\n\n`;
      for (const skill of state.skills) {
        content += `- **${skill.name}**: ${skill.description}\n`;
      }
      content += '\n';
    }

    content += `## Zepher Context\n`;
    content += `- Check .zepher/context/current.md for project state and conventions.\n`;
    content += `- Refer to .zepher/tasks/active/ for current task assignments.\n`;

    return {
      files: [
        {
          path: '.github/copilot-instructions.md',
          content: content.trim() + '\n'
        }
      ]
    };
  },
  import(content: string, filePath: string): Partial<UnifiedZepherState> {
    const rules = [];
    const lines = content.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (currentTitle && currentContent.length > 0) {
          rules.push({
            id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            scope: 'local' as const,
            priority: 50
          });
          currentContent = [];
        }
        currentTitle = line.replace(/^###\s+/, '').trim();
      } else if (line.startsWith('## ') || line.startsWith('# ')) {
        if (currentTitle && currentContent.length > 0) {
          rules.push({
            id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            scope: 'local' as const,
            priority: 50
          });
          currentContent = [];
          currentTitle = '';
        }
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }

    if (currentTitle && currentContent.length > 0) {
      rules.push({
        id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
        title: currentTitle,
        content: currentContent.join('\n').trim(),
        scope: 'local' as const,
        priority: 50
      });
    }

    return { rules };
  }
};

