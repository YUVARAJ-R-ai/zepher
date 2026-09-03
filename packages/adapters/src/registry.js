import { cursorAdapter } from './cursor.js';
import { claudeAdapter } from './claude.js';
import { windsurfAdapter } from './windsurf.js';
import { copilotAdapter } from './copilot.js';
import { geminiAdapter } from './gemini.js';
export const ALL_ADAPTERS = [
    cursorAdapter,
    claudeAdapter,
    windsurfAdapter,
    copilotAdapter,
    geminiAdapter
];
export function getAdapter(id) {
    return ALL_ADAPTERS.find(a => a.id.toLowerCase() === id.toLowerCase());
}
export async function detectActiveAdapters(projectRoot) {
    const active = [];
    for (const adapter of ALL_ADAPTERS) {
        const isDetected = await adapter.detect(projectRoot);
        if (isDetected) {
            active.push(adapter);
        }
    }
    return active;
}
//# sourceMappingURL=registry.js.map