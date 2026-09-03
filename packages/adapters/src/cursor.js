import fs from 'fs';
import path from 'path';
import { formatHooksPrompt } from './common.js';
export const cursorAdapter = {
    id: 'cursor',
    name: 'Cursor',
    targetFiles: ['.cursorrules', '.cursor/rules/'],
    detect(projectRoot) {
        return fs.existsSync(path.join(projectRoot, '.cursorrules')) ||
            fs.existsSync(path.join(projectRoot, '.cursor'));
    },
    compile(state, projectRoot) {
        let content = `# Cursor Project Rules for ${state.project.name}\n\n`;
        if (state.rules.length > 0) {
            content += `## Engineering Standards & Rules\n`;
            for (const rule of state.rules) {
                content += `\n### ${rule.title} (Priority: ${rule.priority ?? 50})\n`;
                content += `${rule.content.trim()}\n`;
            }
            content += '\n';
        }
        const hooksSection = formatHooksPrompt(state.hooks);
        if (hooksSection) {
            content += hooksSection;
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
        return {
            files: [
                {
                    path: '.cursorrules',
                    content: content.trim() + '\n'
                }
            ]
        };
    },
    import(content, filePath) {
        const rules = [];
        const lines = content.split('\n');
        let currentTitle = 'Imported Cursor Rule';
        let currentContent = [];
        for (const line of lines) {
            if (line.startsWith('### ') || line.startsWith('## ')) {
                if (currentContent.length > 0) {
                    rules.push({
                        id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
                        title: currentTitle,
                        content: currentContent.join('\n').trim(),
                        scope: 'local',
                        priority: 50
                    });
                    currentContent = [];
                }
                currentTitle = line.replace(/^#+\s+/, '').trim();
            }
            else {
                currentContent.push(line);
            }
        }
        if (currentContent.length > 0) {
            rules.push({
                id: currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
                title: currentTitle,
                content: currentContent.join('\n').trim(),
                scope: 'local',
                priority: 50
            });
        }
        return { rules };
    }
};
//# sourceMappingURL=cursor.js.map