import fs from 'fs';
import path from 'path';
import { isWatermarked, addRule } from '@zepher/core';
import { ALL_ADAPTERS } from './registry.js';
export async function importExistingConfigs(projectRoot, options = {}) {
    const result = {
        importedCount: 0,
        files: [],
        skipped: []
    };
    for (const adapter of ALL_ADAPTERS) {
        if (!adapter.import)
            continue;
        for (const targetRel of adapter.targetFiles) {
            if (targetRel.endsWith('.json'))
                continue; // Skip JSON configuration files
            const fullPath = path.join(projectRoot, targetRel);
            if (!fs.existsSync(fullPath))
                continue;
            // If it's already watermarked by Zepher, skip importing unless forced
            if (isWatermarked(fullPath) && !options.force) {
                result.skipped.push(`${targetRel} (already managed by Zepher)`);
                continue;
            }
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const parsed = adapter.import(content, fullPath);
                if (parsed.rules && parsed.rules.length > 0) {
                    for (const rule of parsed.rules) {
                        addRule({
                            projectRoot,
                            content: rule.content,
                            title: rule.title,
                            id: `${adapter.id}-${rule.id}`,
                            priority: rule.priority ?? 50,
                            tags: ['imported', adapter.id]
                        });
                        result.importedCount++;
                    }
                    result.files.push(targetRel);
                }
            }
            catch (err) {
                result.skipped.push(`${targetRel} (error: ${err.message})`);
            }
        }
    }
    return result;
}
//# sourceMappingURL=importer.js.map