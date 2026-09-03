import path from 'path';
import chalk from 'chalk';
import { resolveUnifiedState, safeWriteFile, safeMergeJsonFile, checkFileWriteSafety, runHooks } from '@zepher/core';
import { ALL_ADAPTERS, getAdapter, detectActiveAdapters } from './registry.js';
export async function runSync(projectRoot, options = {}) {
    const result = {
        success: true,
        adaptersRun: [],
        filesWritten: [],
        filesSkipped: [],
        jsonMerged: [],
        hooksRun: 0
    };
    const state = await resolveUnifiedState(projectRoot);
    // 1. Run pre-sync hooks
    if (!options.dryRun && state.hooks.length > 0) {
        const hookResults = runHooks('pre-sync', state.hooks, projectRoot);
        result.hooksRun += hookResults.length;
        for (const h of hookResults) {
            if (!h.success) {
                console.warn(chalk.yellow(`[Hook Warning] ${h.hook.name} failed: ${h.error}`));
            }
        }
    }
    // 2. Determine target adapters
    let adaptersToRun = [];
    if (options.adapter) {
        const specific = getAdapter(options.adapter);
        if (!specific) {
            throw new Error(`Adapter "${options.adapter}" not found. Available: ${ALL_ADAPTERS.map(a => a.id).join(', ')}`);
        }
        adaptersToRun = [specific];
    }
    else {
        const detected = await detectActiveAdapters(projectRoot);
        if (detected.length > 0) {
            adaptersToRun = detected;
        }
        else {
            // Default standard compilation targets if none specifically detected
            adaptersToRun = [
                getAdapter('cursor'),
                getAdapter('claude')
            ].filter(Boolean);
        }
    }
    console.log(chalk.bold.blue(`\nZepher Sync Engine`));
    console.log(`Resolved state: ${chalk.green(state.rules.length)} rules, ${chalk.green(state.skills.length)} skills.\n`);
    if (options.dryRun) {
        console.log(chalk.yellow(`[DRY RUN] Previewing operations without writing to disk:\n`));
    }
    // 3. Compile and apply each adapter
    for (const adapter of adaptersToRun) {
        result.adaptersRun.push(adapter.name);
        const output = await adapter.compile(state, projectRoot);
        // Process files
        if (output.files) {
            for (const file of output.files) {
                const fullPath = path.join(projectRoot, file.path);
                const safety = checkFileWriteSafety(fullPath, options.force);
                if (!safety.canWrite) {
                    result.filesSkipped.push({ file: file.path, reason: safety.reason || 'Safety check failed' });
                    console.log(chalk.red(`✗ Skipped ${file.path}: ${safety.reason}`));
                    result.success = false;
                    continue;
                }
                if (options.dryRun) {
                    console.log(chalk.cyan(`• Would write: ${file.path} (${file.content.length} bytes)`));
                    result.filesWritten.push(file.path);
                }
                else {
                    const writeRes = safeWriteFile(fullPath, file.content, options.force);
                    if (writeRes.success) {
                        console.log(chalk.green(`✓ Wrote ${file.path}`));
                        result.filesWritten.push(file.path);
                    }
                    else {
                        console.log(chalk.red(`✗ Failed ${file.path}: ${writeRes.message}`));
                        result.filesSkipped.push({ file: file.path, reason: writeRes.message });
                        result.success = false;
                    }
                }
            }
        }
        // Process JSON merges
        if (output.jsonMerges) {
            for (const jm of output.jsonMerges) {
                const fullPath = path.join(projectRoot, jm.path);
                if (options.dryRun) {
                    console.log(chalk.cyan(`• Would merge JSON patch into: ${jm.path}`));
                    result.jsonMerged.push(jm.path);
                }
                else {
                    const mergeRes = safeMergeJsonFile(fullPath, jm.patch);
                    if (mergeRes.success) {
                        console.log(chalk.green(`✓ Merged JSON config into ${jm.path}`));
                        result.jsonMerged.push(jm.path);
                    }
                }
            }
        }
    }
    // 4. Run post-sync hooks
    if (!options.dryRun && state.hooks.length > 0) {
        const hookResults = runHooks('post-sync', state.hooks, projectRoot);
        result.hooksRun += hookResults.length;
        for (const h of hookResults) {
            if (!h.success) {
                console.warn(chalk.yellow(`[Hook Warning] ${h.hook.name} failed: ${h.error}`));
            }
        }
    }
    return result;
}
//# sourceMappingURL=sync.js.map