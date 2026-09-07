import path from 'path';
import chalk from 'chalk';
import { 
  resolveUnifiedState, safeWriteFile, safeMergeJsonFile, 
  checkFileWriteSafety, runHooks, AdapterOutput, AgentAdapter 
} from '@zepher/core';
import { ALL_ADAPTERS, getAdapter, detectActiveAdapters } from './registry.js';

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  adapter?: string;
}

export interface SyncResult {
  success: boolean;
  adaptersRun: string[];
  filesWritten: string[];
  filesSkipped: { file: string; reason: string }[];
  jsonMerged: string[];
  hooksRun: number;
}

export async function runSync(projectRoot: string, options: SyncOptions = {}): Promise<SyncResult> {
  const result: SyncResult = {
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
  let adaptersToRun: AgentAdapter[] = [];
  if (options.adapter) {
    const specific = getAdapter(options.adapter);
    if (!specific) {
      throw new Error(`Adapter "${options.adapter}" not found. Available: ${ALL_ADAPTERS.map(a => a.id).join(', ')}`);
    }
    adaptersToRun = [specific];
  } else {
    const detected = await detectActiveAdapters(projectRoot);
    if (detected.length > 0) {
      adaptersToRun = detected;
    } else {
      // Default standard compilation targets if none specifically detected
      adaptersToRun = [
        getAdapter('cursor')!,
        getAdapter('claude')!
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
    const output: AdapterOutput = await adapter.compile(state, projectRoot);

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
        } else {
          const writeRes = safeWriteFile(fullPath, file.content, options.force);
          if (writeRes.success) {
            console.log(chalk.green(`✓ Wrote ${file.path}`));
            result.filesWritten.push(file.path);
          } else {
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
        } else {
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
import fs from 'fs';
import { calculateChecksum, stripWatermark } from '@zepher/core';

export interface DriftCheckResult {
  inSync: boolean;
  checkedFiles: string[];
  drifts: Array<{ file: string; reason: string }>;
}

export async function verifySyncDrift(projectRoot: string): Promise<DriftCheckResult> {
  const result: DriftCheckResult = {
    inSync: true,
    checkedFiles: [],
    drifts: []
  };

  const state = await resolveUnifiedState(projectRoot);
  const detected = await detectActiveAdapters(projectRoot);
  const adapters = detected.length > 0 ? detected : [getAdapter('cursor')!, getAdapter('claude')!].filter(Boolean);

  for (const adapter of adapters) {
    const output = await adapter.compile(state, projectRoot);
    if (output.files) {
      for (const f of output.files) {
        const fullPath = path.join(projectRoot, f.path);
        result.checkedFiles.push(f.path);

        if (!fs.existsSync(fullPath)) {
          result.inSync = false;
          result.drifts.push({ file: f.path, reason: 'File does not exist on disk' });
          continue;
        }

        const diskContent = fs.readFileSync(fullPath, 'utf-8');
        const strippedDisk = stripWatermark(diskContent);
        const diskChecksum = calculateChecksum(strippedDisk);
        const expectedChecksum = calculateChecksum(f.content);
        if (diskChecksum !== expectedChecksum) {
          result.inSync = false;
          result.drifts.push({ file: f.path, reason: `Content drift detected (disk: ${diskChecksum}, expected: ${expectedChecksum})` });
        }
      }
    }
  }

  return result;
}

export function watchZepher(
  projectRoot: string,
  onSync?: (res: SyncResult) => void
): { close: () => void } {
  const localDirs = [
    path.join(projectRoot, '.zepher', 'rules'),
    path.join(projectRoot, '.zepher', 'skills'),
    path.join(projectRoot, '.zepher', 'hooks')
  ];

  let timeout: NodeJS.Timeout | null = null;
  const watchers: fs.FSWatcher[] = [];

  const trigger = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      console.log(chalk.dim(`\n[zepher watch] Detected change, recompiling...`));
      try {
        const res = await runSync(projectRoot);
        if (onSync) onSync(res);
      } catch (err: any) {
        console.error(chalk.red(`[zepher watch] Sync error: ${err.message}`));
      }
    }, 150);
  };

  for (const d of localDirs) {
    if (fs.existsSync(d)) {
      try {
        const w = fs.watch(d, { recursive: true }, trigger);
        watchers.push(w);
      } catch {
        // Fallback
      }
    }
  }

  return {
    close: () => {
      if (timeout) clearTimeout(timeout);
      watchers.forEach(w => w.close());
    }
  };
}
