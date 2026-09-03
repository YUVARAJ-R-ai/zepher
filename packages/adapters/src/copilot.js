import fs from 'fs';
import path from 'path';
export const copilotAdapter = {
    id: 'copilot',
    name: 'GitHub Copilot',
    targetFiles: ['.github/copilot-instructions.md'],
    detect(projectRoot) {
        return fs.existsSync(path.join(projectRoot, '.github/copilot-instructions.md')) ||
            fs.existsSync(path.join(projectRoot, '.github'));
    },
    compile(state, projectRoot) {
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
//# sourceMappingURL=copilot.js.map