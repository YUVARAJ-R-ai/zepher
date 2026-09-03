import fs from 'fs';
import path from 'path';
import { formatHooksPrompt } from './common.js';
export const claudeAdapter = {
    id: 'claude',
    name: 'Claude Code',
    targetFiles: ['CLAUDE.md', '.claude.json'],
    detect(projectRoot) {
        return fs.existsSync(path.join(projectRoot, 'CLAUDE.md')) ||
            fs.existsSync(path.join(projectRoot, '.claude')) ||
            fs.existsSync(path.join(projectRoot, '.claude.json'));
    },
    compile(state, projectRoot) {
        let content = `@AGENTS.md\n\n# CLAUDE.md — Instructions for Claude Code\n\n`;
        if (state.rules.length > 0) {
            content += `## Project Rules & Constraints\n\n`;
            for (const rule of state.rules) {
                content += `### ${rule.title} (Priority: ${rule.priority ?? 50})\n`;
                content += `${rule.content.trim()}\n\n`;
            }
        }
        const hooksSection = formatHooksPrompt(state.hooks);
        if (hooksSection) {
            content += hooksSection + '\n';
        }
        if (state.skills.length > 0) {
            content += `## Available Zepher Skills\n\n`;
            for (const skill of state.skills) {
                content += `- **${skill.name}**: ${skill.description}\n`;
            }
            content += '\n';
        }
        content += `## Workflow Guidelines\n`;
        content += `- Before non-trivial work, consult .zepher/context/current.md\n`;
        content += `- Check .zepher/tasks/active/ for the current objective\n`;
        content += `- Check .zepher/decisions/ before suggesting major architectural changes\n`;
        content += `- After substantial discoveries or conventions, update .zepher/memory/\n`;
        return {
            files: [
                {
                    path: 'CLAUDE.md',
                    content: content.trim() + '\n'
                }
            ],
            jsonMerges: [
                {
                    path: '.claude.json',
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
    import(content, filePath) {
        const rules = [];
        const sections = content.split(/\n(?=##?\s+)/);
        for (const section of sections) {
            const trimmed = section.trim();
            if (!trimmed || trimmed.startsWith('@AGENTS.md'))
                continue;
            const lines = trimmed.split('\n');
            const titleLine = lines[0].replace(/^#+\s+/, '').trim();
            const body = lines.slice(1).join('\n').trim();
            if (body) {
                rules.push({
                    id: titleLine.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
                    title: titleLine,
                    content: body,
                    scope: 'local',
                    priority: 50
                });
            }
        }
        return { rules };
    }
};
//# sourceMappingURL=claude.js.map