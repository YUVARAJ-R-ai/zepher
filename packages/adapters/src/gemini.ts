import fs from 'fs';
import path from 'path';
import { AgentAdapter, UnifiedZepherState, AdapterOutput } from '@zepher/core';
import { formatHooksPrompt, formatVaultPrompt } from './common.js';

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

    content += `## Zepher Context Integration\n`;
    content += `This project uses Zepher context infrastructure.\n`;
    content += `- Read .zepher/context/current.md for project state.\n`;
    content += `- Read .zepher/tasks/active/ for active task details.\n`;
    content += `- Read .zepher/decisions/ for architectural decisions (ADRs).\n`;

    return {
      files: [
        {
          path: '.gemini/rules/zepher-rules.md',
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
        currentTitle = line.replace(/^###\s+/, '').replace(/\s*\(Scope: [a-z]+\)$/, '').replace(/\s*\(Priority: \d+\)$/, '').trim();
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
