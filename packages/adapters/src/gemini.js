import fs from 'fs';
import path from 'path';
export const geminiAdapter = {
    id: 'gemini',
    name: 'Gemini / Antigravity',
    targetFiles: ['.gemini/rules/zepher-rules.md'],
    detect(projectRoot) {
        return fs.existsSync(path.join(projectRoot, '.gemini'));
    },
    compile(state, projectRoot) {
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
//# sourceMappingURL=gemini.js.map