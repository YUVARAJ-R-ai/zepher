import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { AgentAdapter, UnifiedZepherState, AdapterOutput, FileOutput } from '@zepher/core';
import { formatHooksPrompt, formatVaultPrompt } from './common.js';

export const cursorAdapter: AgentAdapter = {
  id: 'cursor',
  name: 'Cursor',
  targetFiles: ['.cursorrules', '.cursor/rules/', '.cursor/mcp.json'],
  detect(projectRoot: string) {
    return fs.existsSync(path.join(projectRoot, '.cursorrules')) ||
      fs.existsSync(path.join(projectRoot, '.cursor'));
  },
  compile(state: UnifiedZepherState, projectRoot: string): AdapterOutput {
    const files: FileOutput[] = [];

    // Separate glob-scoped rules from general/always-apply rules
    const globRules = state.rules.filter(r => r.globs && r.globs.length > 0 && !r.alwaysApply);
    const globalRules = state.rules.filter(r => !r.globs || r.globs.length === 0 || r.alwaysApply);

    // 1. Emit individual .cursor/rules/<id>.mdc files for glob-scoped rules
    for (const rule of globRules) {
      const frontmatter = {
        description: rule.title,
        globs: rule.globs,
        alwaysApply: Boolean(rule.alwaysApply)
      };

      const mdcContent = `---
${yaml.stringify(frontmatter).trim()}
---

# ${rule.title} (Priority: ${rule.priority ?? 50})

${rule.content.trim()}
`;

      files.push({
        path: `.cursor/rules/${rule.id}.mdc`,
        content: mdcContent
      });
    }

    // 2. Emit main .cursorrules for general standards, hooks, and context
    let content = `# Cursor Project Rules for ${state.project.name}\n\n`;

    if (globalRules.length > 0) {
      content += `## Engineering Standards & Rules\n`;
      for (const rule of globalRules) {
        content += `\n### ${rule.title} (Priority: ${rule.priority ?? 50})\n`;
        content += `${rule.content.trim()}\n`;
      }
      content += '\n';
    }

    const hooksSection = formatHooksPrompt(state.hooks);
    if (hooksSection) {
      content += hooksSection;
    }

    const vaultSection = formatVaultPrompt(projectRoot);
    if (vaultSection) {
      content += vaultSection;
    }

    if (state.skills.length > 0) {
      content += `## Project Skills & Workflows\n`;
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

    files.push({
      path: '.cursorrules',
      content: content.trim() + '\n'
    });

    return {
      files,
      jsonMerges: [
        {
          path: '.cursor/mcp.json',
          patch: {
            mcpServers: {
              zepher: {
                command: 'zepher',
                args: ['mcp']
              }
            }
          }
        }
      ]
    };
  },
  import(content: string, filePath: string): Partial<UnifiedZepherState> {
    const rules = [];
    const lines = content.split('\n');
    let currentTitle = 'Imported Cursor Rule';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('### ') || line.startsWith('## ')) {
        if (currentContent.length > 0) {
          rules.push({
            id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            scope: 'local' as const,
            priority: 50
          });
          currentContent = [];
        }
        currentTitle = line.replace(/^#+\s+/, '').trim();
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
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
