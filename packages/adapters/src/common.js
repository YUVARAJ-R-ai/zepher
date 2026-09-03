export function formatHooksPrompt(hooks) {
    if (!hooks || hooks.length === 0)
        return '';
    const verificationHooks = hooks.filter(h => h.stage === 'pre-commit' || h.stage === 'pre-sync');
    if (verificationHooks.length === 0)
        return '';
    let section = `## Mandatory Verification & Pre-Commit Hooks\n`;
    section += `Before completing tasks or committing code, you MUST execute and pass these checks:\n`;
    for (const h of verificationHooks) {
        section += `- **${h.name}** (${h.stage}): \`${h.run}\`\n`;
    }
    return section + '\n';
}
//# sourceMappingURL=common.js.map