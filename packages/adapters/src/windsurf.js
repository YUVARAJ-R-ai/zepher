import fs from 'fs';
import path from 'path';
export const windsurfAdapter = {
    id: 'windsurf',
    name: 'Windsurf',
    targetFiles: ['.windsurfrules'],
    detect(projectRoot) {
        return fs.existsSync(path.join(projectRoot, '.windsurfrules')) ||
            fs.existsSync(path.join(projectRoot, '.codeium'));
    },
    compile(state, projectRoot) {
        let content = `# Windsurf AI Rules for ${state.project.name}\n\n`;
        if (state.rules.length > 0) {
            content += `## Project Instructions\n\n`;
            for (const rule of state.rules) {
                content += `- **${rule.title}**: ${rule.content.replace(/\n/g, ' ')}\n`;
            }
            content += '\n';
        }
        content += `## Context Strategy\n`;
        content += `- Maintain context continuity using .zepher/ directory.\n`;
        content += `- Follow active tasks in .zepher/tasks/active/.\n`;
        return {
            files: [
                {
                    path: '.windsurfrules',
                    content: content.trim() + '\n'
                }
            ]
        };
    }
};
//# sourceMappingURL=windsurf.js.map