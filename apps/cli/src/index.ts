import { Command } from 'commander';
import chalk from 'chalk';
import { 
  initZepher, initGlobalZepher, getStatus, runDoctor, bootstrapAgent,
  addRule, listAllRules, removeRule,
  addHook, listAllHooks, removeHook, installGitHooks, uninstallGitHooks,
  runHooks, resolveUnifiedState,
  trackVaultFile, sealVault, unsealVault, loadVaultConfig, loadVaultLockfile, checkVaultDirtyStatus,
  trackAsset, stashLocalAsset, restoreLocalAsset
} from '@zepher/core';
import { saveMemory, searchMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks, completeTask, blockTask, getTask } from '@zepher/tasks';
import { createDecision, listDecisions, getDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { runServer } from '@zepher/mcp';
import { getAllIntegrations, getIntegration } from '@zepher/integrations';
import { runSync, importExistingConfigs, ALL_ADAPTERS, verifySyncDrift, watchZepher } from '@zepher/adapters';
import { 
  installSkillFromSource, listAllSkills, removeSkill, harvestAgentSkills, linkAgentSkills,
  updateSkill, updateAllSkills, pinSkill, unpinSkill 
} from '@zepher/skills';
import { runIntegrationTui } from './tui.js';

const program = new Command();

program
  .name('zepher')
  .description('Persistent context, memory & universal agent environment manager')
  .version('0.3.0');

// Init
program
  .command('init')
  .description('Initialize Zepher in current project or globally')
  .option('-g, --global', 'Initialize global Zepher environment (~/.zepher)')
  .action(async (options) => {
    if (options.global) {
      await initGlobalZepher();
    } else {
      await initZepher(process.cwd());
    }
  });

program.command('status').description('Show status').action(() => { getStatus(process.cwd()); });
program.command('doctor').description('Check health').action(() => { runDoctor(process.cwd()); });
program
  .command('remember')
  .argument('<text>', 'Information or rule to remember')
  .option('-t, --type <type>', 'Memory category (conventions, architecture, project, constraints, lessons)', 'conventions')
  .option('-g, --global', 'Store in global Zepher memory (~/.zepher/memory)')
  .description('Save knowledge, conventions, or decisions into persistent memory')
  .action((text, options) => {
    saveMemory(process.cwd(), options.type, text, { global: options.global });
    console.log(chalk.green(`✓ Saved to ${options.global ? 'global' : 'local'} memory [${options.type}]`));
  });

program
  .command('recall')
  .argument('<query>', 'Search term')
  .description('Search persistent memory across local and global stores')
  .action((query) => {
    const results = searchMemory(process.cwd(), query);
    if (results.length === 0) {
      console.log(chalk.gray(`No memories matching "${query}".`));
      return;
    }
    console.log(chalk.bold(`Found ${results.length} memory match(es):`));
    for (const r of results) {
      const scopeBadge = r.scope === 'global' ? chalk.cyan('[global]') : chalk.magenta('[local]');
      console.log(`\n${scopeBadge} ${chalk.bold(r.file)}:`);
      console.log(chalk.gray(r.content));
    }
  });

program
  .command('context')
  .description('Generate and refresh .zepher/context/current.md')
  .action(() => {
    generateContext(process.cwd());
    console.log(chalk.green('✓ Generated composite context in .zepher/context/current.md'));
  });

program
  .command('handoff')
  .description('Create an agent session handoff artifact')
  .option('-o, --objective <text>', 'Session objective')
  .option('-c, --completed <text>', 'Summary of work completed')
  .option('-b, --blockers <text>', 'Known blockers or failed approaches')
  .option('-n, --notes <text>', 'Key discoveries or notes')
  .option('-a, --next <text>', 'Recommended next action')
  .action((options) => {
    const fileName = createHandoff(process.cwd(), {
      objective: options.objective,
      completed: options.completed,
      blockers: options.blockers,
      notes: options.notes,
      nextActions: options.next
    });
    console.log(chalk.green(`✓ Session handoff created: .zepher/handoffs/${fileName}`));
  });

// Task command suite
const taskCmd = program.command('task').description('Manage persistent agent tasks in .zepher/tasks/');

taskCmd
  .command('create')
  .argument('<name>', 'Task name or title')
  .option('-o, --objective <text>', 'Task objective')
  .description('Create an active task')
  .action((name, options) => {
    const id = createTask(process.cwd(), name, { objective: options.objective });
    console.log(chalk.green(`✓ Created active task: ${id} (.zepher/tasks/active/${id}.md)`));
  });

taskCmd
  .command('list')
  .option('-s, --status <status>', 'Filter by status: active, completed, blocked, all', 'active')
  .description('List tasks')
  .action((options) => {
    const tasks = listTasks(process.cwd(), options.status as any);
    if (tasks.length === 0) {
      console.log(chalk.gray(`No tasks found with status: ${options.status}`));
      return;
    }
    console.log(chalk.bold(`Tasks (${options.status}):`));
    for (const t of tasks) {
      console.log(`- ${t}`);
    }
  });

taskCmd
  .command('show')
  .argument('<id>', 'Task ID')
  .description('View task details')
  .action((id) => {
    const task = getTask(process.cwd(), id);
    if (!task) {
      console.log(chalk.red(`Task not found: ${id}`));
      return;
    }
    console.log(chalk.bold(`Task: ${task.title} [Status: ${task.status}]`));
    console.log(chalk.gray(`File: ${task.filePath}\n`));
    console.log(task.content);
  });

taskCmd
  .command('complete')
  .argument('<id>', 'Task ID to complete')
  .description('Mark a task as completed')
  .action((id) => {
    const ok = completeTask(process.cwd(), id);
    if (ok) {
      console.log(chalk.green(`✓ Task completed: ${id} (moved to .zepher/tasks/completed/)`));
    } else {
      console.log(chalk.red(`Task not found: ${id}`));
    }
  });

taskCmd
  .command('block')
  .argument('<id>', 'Task ID to block')
  .option('-r, --reason <reason>', 'Reason for blocking')
  .description('Mark a task as blocked')
  .action((id, options) => {
    const ok = blockTask(process.cwd(), id, options.reason);
    if (ok) {
      console.log(chalk.yellow(`⚠ Task marked as blocked: ${id} (moved to .zepher/tasks/blocked/)`));
    } else {
      console.log(chalk.red(`Task not found: ${id}`));
    }
  });

// ADR command suite
const adrCmd = program.command('adr').description('Manage Architectural Decision Records in .zepher/decisions/');

adrCmd
  .command('create')
  .argument('<title>', 'Decision title')
  .option('-s, --status <status>', 'Status (Proposed, Accepted, Deprecated, Superseded)', 'Proposed')
  .option('-c, --context <text>', 'Context behind the decision')
  .option('-d, --decision <text>', 'The decision made')
  .option('-a, --alternatives <text>', 'Alternatives considered')
  .description('Create an Architectural Decision Record (ADR)')
  .action((title, options) => {
    const fileName = createDecision(process.cwd(), title, {
      status: options.status as any,
      context: options.context,
      decision: options.decision,
      alternatives: options.alternatives
    });
    console.log(chalk.green(`✓ Created ADR: .zepher/decisions/${fileName}`));
  });

adrCmd
  .command('list')
  .description('List all Architectural Decision Records (ADRs)')
  .action(() => {
    const adrs = listDecisions(process.cwd());
    if (adrs.length === 0) {
      console.log(chalk.gray('No ADRs recorded in .zepher/decisions/ yet.'));
      return;
    }
    console.log(chalk.bold(`Architectural Decision Records (${adrs.length}):`));
    for (const adr of adrs) {
      const statusBadge = adr.status === 'Accepted' ? chalk.green(`[${adr.status}]`) : chalk.yellow(`[${adr.status}]`);
      console.log(`${chalk.cyan(adr.id)} ${statusBadge} ${adr.title} (${adr.date || 'No date'})`);
    }
  });

adrCmd
  .command('show')
  .argument('<query>', 'ADR number, ID, or title snippet')
  .description('View an Architectural Decision Record')
  .action((query) => {
    const adr = getDecision(process.cwd(), query);
    if (!adr) {
      console.log(chalk.red(`ADR not found matching: ${query}`));
      return;
    }
    console.log(chalk.bold(`=== ${adr.fileName} ===\n`));
    console.log(adr.content);
  });

program.command('mcp').action(async () => { await runServer(); });

// Sync Command
program
  .command('sync')
  .description('Compile and synchronize Zepher rules/skills to AI agent vendor configurations')
  .option('-d, --dry-run', 'Preview changes without modifying any files')
  .option('-f, --force', 'Force overwrite unmanaged or edited configuration files')
  .option('-a, --adapter <adapter>', 'Target specific adapter (cursor, claude, windsurf, copilot, gemini)')
  .action(async (options) => {
    try {
      const result = await runSync(process.cwd(), {
        dryRun: options.dryRun,
        force: options.force,
        adapter: options.adapter
      });
      if (result.success) {
        console.log(chalk.bold.green(`\n✓ Sync completed successfully!`));
      } else {
        console.log(chalk.bold.yellow(`\n⚠ Sync completed with warnings/skipped files. Use --force if you wish to overwrite.`));
      }
    } catch (err: any) {
      console.error(chalk.red(`Sync failed: ${err.message}`));
      process.exit(1);
    }
  });

// Verify Drift Command (CI/CD)
program
  .command('verify')
  .description('Verify that committed agent configuration files are in sync with Zepher state (CI drift check)')
  .action(async () => {
    try {
      console.log(chalk.blue('Checking for configuration drift...'));
      const res = await verifySyncDrift(process.cwd());
      if (res.inSync) {
        console.log(chalk.bold.green(`✓ All ${res.checkedFiles.length} agent configuration file(s) are strictly in sync.`));
      } else {
        console.error(chalk.bold.red(`✗ Configuration drift detected in ${res.drifts.length} file(s):`));
        for (const d of res.drifts) {
          console.error(chalk.red(`  • ${d.file}: ${d.reason}`));
        }
        console.log(chalk.yellow(`\nRun ${chalk.cyan('zepher sync')} to reconcile configurations.`));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`Verification error: ${err.message}`));
      process.exit(1);
    }
  });

// Watch Command
program
  .command('watch')
  .description('Watch .zepher/ rules and skills and auto-sync on changes')
  .action(() => {
    console.log(chalk.bold.blue('⚡ Zepher Auto-Sync Daemon active. Monitoring .zepher/ for changes...'));
    console.log(chalk.gray('Press Ctrl+C to stop.\n'));
    watchZepher(process.cwd());
  });

// Import Command
program
  .command('import')
  .description('Import existing AI configuration files (.cursorrules, CLAUDE.md, etc.) into Zepher rules')
  .option('-f, --force', 'Import even if files already have Zepher watermarks')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Scanning project for pre-existing agent configurations...'));
      const res = await importExistingConfigs(process.cwd(), { force: options.force });
      console.log(chalk.green(`\n✓ Imported ${res.importedCount} rules from ${res.files.length} configuration file(s).`));
      if (res.files.length > 0) {
        res.files.forEach(f => console.log(`  • ${f}`));
      }
      if (res.skipped.length > 0) {
        console.log(chalk.yellow(`\nSkipped files:`));
        res.skipped.forEach(s => console.log(`  • ${s}`));
      }
      console.log(`\nRun ${chalk.cyan('zepher rule list')} to inspect the newly imported rules.`);
    } catch (err: any) {
      console.error(chalk.red(`Import failed: ${err.message}`));
      process.exit(1);
    }
  });

// Rules Command Group
const ruleCmd = program.command('rule').description('Manage engineering rules and conventions');

ruleCmd
  .command('add')
  .description('Add a new engineering rule')
  .argument('<content>', 'The rule prompt/instruction')
  .option('-t, --title <title>', 'Rule title')
  .option('-p, --priority <number>', 'Rule priority (1-100, default 50)', parseInt)
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--globs <globs>', 'Comma-separated glob patterns (e.g. "src/**/*.ts")')
  .option('--always-apply', 'Always include rule regardless of active file')
  .option('-g, --global', 'Add to global rules (~/.zepher/rules)')
  .action((content, opts) => {
    const tags = opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined;
    const globs = opts.globs ? opts.globs.split(',').map((g: string) => g.trim()) : undefined;
    const { filePath, rule } = addRule({
      content,
      title: opts.title,
      priority: opts.priority,
      tags,
      globs,
      alwaysApply: opts.alwaysApply ? true : undefined,
      global: opts.global,
      projectRoot: process.cwd()
    });
    console.log(chalk.green(`✓ Added ${rule.scope} rule: "${rule.title}" (Priority: ${rule.priority})`));
    if (rule.globs && rule.globs.length > 0) {
      console.log(chalk.cyan(`  Globs: [${rule.globs.join(', ')}]`));
    }
    console.log(`Saved to: ${filePath}`);
    console.log(`Run ${chalk.cyan('zepher sync')} to compile this rule into your agent configurations.`);
  });

ruleCmd
  .command('list')
  .description('List all global and local rules')
  .action(() => {
    const { global, local } = listAllRules(process.cwd());
    console.log(chalk.bold.blue('\nGlobal Rules (~/.zepher/rules):'));
    if (global.length === 0) {
      console.log(chalk.gray('  (No global rules found)'));
    } else {
      global.forEach(r => {
        console.log(`  • ${chalk.bold(r.title)} ${chalk.dim(`[id: ${r.id}, priority: ${r.priority}]`)}`);
        console.log(`    ${chalk.gray(r.content.slice(0, 80))}${r.content.length > 80 ? '...' : ''}`);
      });
    }

    console.log(chalk.bold.blue('\nLocal Project Rules (.zepher/rules):'));
    if (local.length === 0) {
      console.log(chalk.gray('  (No local rules found)'));
    } else {
      local.forEach(r => {
        console.log(`  • ${chalk.bold(r.title)} ${chalk.dim(`[id: ${r.id}, priority: ${r.priority}]`)}`);
        console.log(`    ${chalk.gray(r.content.slice(0, 80))}${r.content.length > 80 ? '...' : ''}`);
      });
    }
    console.log();
  });

ruleCmd
  .command('remove')
  .description('Remove a rule by ID')
  .argument('<id>', 'Rule ID to remove')
  .option('-g, --global', 'Remove from global rules')
  .action((id, opts) => {
    const success = removeRule(id, opts.global, process.cwd());
    if (success) {
      console.log(chalk.green(`✓ Removed rule "${id}"`));
    } else {
      console.log(chalk.red(`✗ Rule "${id}" not found.`));
    }
  });

// Skills Command Group
const skillCmd = program.command('skill').description('Manage portable agent skills');

skillCmd
  .command('install')
  .description('Install a skill from a local path or GitHub URL')
  .argument('<source>', 'Local path or URL to SKILL.md')
  .option('-n, --name <name>', 'Custom skill name')
  .option('-g, --global', 'Install globally into ~/.zepher/skills')
  .action(async (source, opts) => {
    try {
      const res = await installSkillFromSource(source, {
        name: opts.name,
        global: opts.global,
        projectRoot: process.cwd()
      });
      console.log(chalk.green(`✓ Installed skill "${res.skillName}" (${opts.global ? 'global' : 'local'})`));
      console.log(`Path: ${res.path}`);
      console.log(`Checksum: ${res.checksum}`);
      console.log(`Updated ${opts.global ? 'global' : 'local'} zepher-lock.yaml`);
    } catch (err: any) {
      console.error(chalk.red(`Failed to install skill: ${err.message}`));
      process.exit(1);
    }
  });

skillCmd
  .command('list')
  .description('List all installed skills with versions and provenance')
  .action(() => {
    const { global, local } = listAllSkills(process.cwd());
    console.log(chalk.bold.blue('\nGlobal Skills (~/.zepher/skills):'));
    if (global.length === 0) {
      console.log(chalk.gray('  (No global skills installed)'));
    } else {
      global.forEach(s => {
        const verStr = s.version ? chalk.cyan(` (v${s.version})`) : '';
        console.log(`  • ${chalk.bold(s.name)}${verStr} - ${chalk.gray(s.description)}`);
      });
    }

    console.log(chalk.bold.blue('\nLocal Project Skills (.zepher/skills):'));
    if (local.length === 0) {
      console.log(chalk.gray('  (No local skills installed)'));
    } else {
      local.forEach(s => {
        const verStr = s.version ? chalk.cyan(` (v${s.version})`) : '';
        console.log(`  • ${chalk.bold(s.name)}${verStr} - ${chalk.gray(s.description)}`);
      });
    }
    console.log();
  });

skillCmd
  .command('update [name]')
  .description('Update an installed skill (or all skills) from its upstream source')
  .option('-a, --all', 'Update all installed skills')
  .option('-g, --global', 'Target global scope (~/.zepher/skills)')
  .action(async (name, opts) => {
    try {
      if (opts.all || !name) {
        console.log(chalk.blue(`Checking updates for all ${opts.global ? 'global' : 'installed'} skills...`));
        const results = await updateAllSkills({ global: opts.global, projectRoot: process.cwd() });
        if (results.length === 0) {
          console.log(chalk.gray('No skills tracked in lockfile to update.'));
          return;
        }
        let updatedCount = 0;
        for (const r of results) {
          if (r.updated) {
            updatedCount++;
            const verBump = r.oldVersion && r.newVersion && r.oldVersion !== r.newVersion
              ? ` (${chalk.yellow(r.oldVersion)} -> ${chalk.green(r.newVersion)})`
              : r.newVersion ? ` (v${r.newVersion})` : '';
            console.log(chalk.green(`✓ Updated "${r.skillName}"${verBump} [${r.oldChecksum} -> ${r.newChecksum}]`));
          } else {
            console.log(chalk.gray(`• "${r.skillName}": ${r.reason || 'Up to date'}`));
          }
        }
        console.log(chalk.bold.blue(`\nSummary: ${updatedCount} updated, ${results.length - updatedCount} up to date.`));
      } else {
        console.log(chalk.blue(`Checking for updates to "${name}"...`));
        const res = await updateSkill(name, { global: opts.global, projectRoot: process.cwd() });
        if (res.updated) {
          const verBump = res.oldVersion && res.newVersion && res.oldVersion !== res.newVersion
            ? ` (v${res.oldVersion} -> v${res.newVersion})`
            : res.newVersion ? ` (v${res.newVersion})` : '';
          console.log(chalk.bold.green(`✓ Successfully updated "${res.skillName}"${verBump}!`));
          console.log(`  Checksum: ${res.oldChecksum} -> ${res.newChecksum}`);
          if (res.source) console.log(`  Source: ${res.source}`);
        } else {
          console.log(chalk.yellow(`• "${res.skillName}": ${res.reason || 'Already up to date'}`));
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`Failed to update skill: ${err.message}`));
      process.exit(1);
    }
  });

skillCmd
  .command('pin <name>')
  .description('Pin a global skill to the current project repo (.zepher/skills) to freeze its version')
  .action((name) => {
    const res = pinSkill(name, { projectRoot: process.cwd() });
    if (res.success) {
      console.log(chalk.bold.green(`✓ ${res.message}`));
      console.log(`Path: ${res.path}`);
      if (res.checksum) console.log(`Checksum: ${res.checksum}`);
      console.log(chalk.gray('This repository will now use this pinned skill instead of inheriting global updates.'));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
      process.exit(1);
    }
  });

skillCmd
  .command('unpin <name>')
  .description('Unpin a project skill to revert to inheriting the global version')
  .action((name) => {
    const res = unpinSkill(name, { projectRoot: process.cwd() });
    if (res.success) {
      console.log(chalk.bold.green(`✓ ${res.message}`));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
      process.exit(1);
    }
  });

skillCmd
  .command('remove')
  .description('Remove a skill')
  .argument('<name>', 'Skill name to remove')
  .option('-g, --global', 'Remove from global skills')
  .action((name, opts) => {
    const success = removeSkill(name, { global: opts.global, projectRoot: process.cwd() });
    if (success) {
      console.log(chalk.green(`✓ Removed skill "${name}"`));
    } else {
      console.log(chalk.red(`✗ Skill "${name}" not found.`));
    }
  });

skillCmd
  .command('harvest')
  .description('Discover and ingest skills from all agent directories (~/.gemini, ~/.claude) into Zepher')
  .option('-l, --local', 'Harvest into project (.zepher/skills) instead of global (~/.zepher/skills)')
  .option('--overwrite', 'Overwrite existing skills in Zepher')
  .action((opts) => {
    console.log(chalk.blue('Scanning agent directories for skills (~/.gemini, ~/.claude)...'));
    const res = harvestAgentSkills({
      global: !opts.local,
      projectRoot: process.cwd(),
      overwrite: opts.overwrite
    });
    console.log(chalk.bold.green(`\n✓ Discovered ${res.discovered.length} skill(s) across agent directories.`));
    if (res.harvested.length > 0) {
      console.log(chalk.green(`✓ Ingested ${res.harvested.length} skill(s) into ${res.destinationDir}:`));
      res.harvested.forEach(s => console.log(`  • ${s}`));
    }
    if (res.skipped.length > 0) {
      console.log(chalk.yellow(`\nSkipped ${res.skipped.length} already existing skill(s) (use --overwrite to replace):`));
      res.skipped.forEach(s => console.log(`  • ${s}`));
    }
    console.log(`\nRun ${chalk.cyan('zepher skill link')} to wire all agents to these skills.`);
  });

skillCmd
  .command('link')
  .description('Symlink Zepher global skills to Antigravity and Claude Code so all agents share all skills')
  .option('--copy', 'Copy files instead of creating filesystem symlinks')
  .action((opts) => {
    console.log(chalk.blue('Linking skills to Antigravity (~/.gemini/config/skills) and Claude Code (~/.claude/skills)...'));
    const res = linkAgentSkills({ copy: opts.copy });
    if (res.linkedCount > 0) {
      console.log(chalk.bold.green(`\n✓ Successfully linked/updated ${res.linkedCount} skill mapping(s).`));
    }
    if (res.targets.length > 0) {
      const grouped = res.targets.reduce((acc: any, t) => {
        acc[t.agent] = (acc[t.agent] || 0) + 1;
        return acc;
      }, {});
      Object.entries(grouped).forEach(([agent, count]) => {
        console.log(chalk.cyan(`  • ${agent}: ${count} skills available`));
      });
    }
    if (res.errors.length > 0) {
      console.log(chalk.red(`\nWarnings:`));
      res.errors.forEach(e => console.error(chalk.red(`  • ${e}`)));
    }
  });

// Hooks Command Group
const hookCmd = program.command('hook').description('Manage automated lifecycle hooks');

hookCmd
  .command('add')
  .description('Add a new lifecycle hook')
  .argument('<name>', 'Hook name, e.g. lint-check')
  .requiredOption('-s, --stage <stage>', 'Hook stage (pre-sync, post-sync, pre-commit, post-commit)')
  .requiredOption('-r, --run <command>', 'Shell command to execute')
  .option('-g, --global', 'Add to global hooks (~/.zepher/hooks)')
  .action((name, opts) => {
    try {
      const { filePath, hook } = addHook({
        name,
        stage: opts.stage,
        run: opts.run,
        global: opts.global,
        projectRoot: process.cwd()
      });
      console.log(chalk.green(`✓ Added ${hook.scope} hook: "${hook.name}" [${hook.stage}]`));
      console.log(`Saved to: ${filePath}`);
    } catch (err: any) {
      console.error(chalk.red(`Failed to add hook: ${err.message}`));
      process.exit(1);
    }
  });

hookCmd
  .command('list')
  .description('List all global and local hooks')
  .action(() => {
    const { global, local } = listAllHooks(process.cwd());
    console.log(chalk.bold.blue('\nGlobal Hooks (~/.zepher/hooks):'));
    if (global.length === 0) {
      console.log(chalk.gray('  (No global hooks registered)'));
    } else {
      global.forEach(h => console.log(`  • ${chalk.bold(h.name)} [${chalk.cyan(h.stage)}]: \`${chalk.yellow(h.run)}\``));
    }

    console.log(chalk.bold.blue('\nLocal Project Hooks (.zepher/hooks):'));
    if (local.length === 0) {
      console.log(chalk.gray('  (No local hooks registered)'));
    } else {
      local.forEach(h => console.log(`  • ${chalk.bold(h.name)} [${chalk.cyan(h.stage)}]: \`${chalk.yellow(h.run)}\``));
    }
    console.log();
  });

hookCmd
  .command('remove')
  .description('Remove a hook by name')
  .argument('<name>', 'Hook name to remove')
  .option('-g, --global', 'Remove from global hooks')
  .action((name, opts) => {
    const success = removeHook(name, { global: opts.global, projectRoot: process.cwd() });
    if (success) {
      console.log(chalk.green(`✓ Removed hook "${name}"`));
    } else {
      console.log(chalk.red(`✗ Hook "${name}" not found.`));
    }
  });

hookCmd
  .command('run')
  .description('Execute hooks for a specific stage')
  .argument('<stage>', 'Stage to run (pre-sync, post-sync, pre-commit, post-commit)')
  .action(async (stage) => {
    const state = await resolveUnifiedState(process.cwd());
    const results = runHooks(stage, state.hooks, process.cwd());
    if (results.length === 0) {
      console.log(chalk.gray(`No hooks registered for stage "${stage}".`));
      return;
    }

    let hasFailure = false;
    for (const r of results) {
      if (r.success) {
        console.log(chalk.green(`✓ [${stage}] Hook "${r.hook.name}" passed`));
        if (r.output && r.output.trim()) {
          console.log(chalk.dim(r.output.trim()));
        }
      } else {
        hasFailure = true;
        console.error(chalk.red(`✗ [${stage}] Hook "${r.hook.name}" failed:`));
        if (r.error) {
          console.error(chalk.red(r.error.trim()));
        }
      }
    }

    if (hasFailure) {
      process.exit(1);
    }
  });

hookCmd
  .command('install-git')
  .description('Install Zepher pre-commit hook bridge into .git/hooks')
  .action(() => {
    const res = installGitHooks(process.cwd());
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
      console.log(chalk.gray('Your pre-commit hooks will now run automatically before every git commit.'));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
      process.exit(1);
    }
  });

hookCmd
  .command('uninstall-git')
  .description('Uninstall Zepher hook bridge from .git/hooks')
  .action(() => {
    const res = uninstallGitHooks(process.cwd());
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
    } else {
      console.log(chalk.yellow(res.message));
    }
  });

// Integrations
const integrate = program.command('integrate').description('Manage integrations');
integrate.action(async () => {
  await runIntegrationTui(process.cwd());
});
integrate.command('enable').argument('<id>').action(async (id) => { const i = getIntegration(id); if (i) await i.enable(process.cwd()); });
integrate.command('disable').argument('<id>').action(async (id) => { const i = getIntegration(id); if (i) await i.disable(process.cwd()); });
integrate.command('status').action(async () => {
  for (const i of getAllIntegrations()) {
    const s = await i.status(process.cwd());
    console.log(`${i.name}: ${s.enabled ? 'Enabled' : 'Disabled'}`);
  }
});
integrate.command('doctor').action(async () => {
  for (const i of getAllIntegrations()) {
    const d = await i.doctor(process.cwd());
    console.log(`${i.name} Health: ${d.healthy ? '✓ healthy' : '✗ broken/unavailable'}`);
  }
});

program.command('capabilities').action(() => {
  console.log(`Zepher Capabilities\nCore\n✓ Persistent memory\n✓ Context assembly\n✓ Tasks\n✓ ADRs\n✓ Sessions\n✓ Handoffs\n✓ Skills\n✓ Workflows\n✓ Universal Rules Engine\n✓ Universal Hooks Engine (pre/post-sync, pre/post-commit, git bridge)\n✓ Two-Tier Global/Local Inheritance\n✓ Vendor Adapters (Cursor, Claude, Windsurf, Copilot, Gemini)\n✓ Sync Compiler & Reverse Import\n✓ Team Vault (Zero-Knowledge Secrets, Seeds & Documents)\n✓ Asset Hub (Binary & Heavy Artifact Pointer Stash)\n\nIntegrations\n✓ codebase-memory-mcp\n✓ Graphify\n✓ ECC\n\nAgent interfaces\n✓ MCP\n✓ AGENTS.md`);
});

const agent = program.command('agent').description('Manage agents');
agent.command('bootstrap').action(() => {
  bootstrapAgent(process.cwd());
});

// Vault Command Group
const vaultCmd = program.command('vault').description('Manage encrypted team secrets, database seeds, and private configs');

vaultCmd
  .command('track <path>')
  .description('Track a private file or secret in Zepher Vault (automatically adds to .gitignore)')
  .option('-t, --type <type>', 'Type of asset: secret, seed, binary, doc', 'secret')
  .action((filePath, opts) => {
    const res = trackVaultFile(process.cwd(), filePath, opts.type);
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
      console.log(`Run ${chalk.cyan('zepher vault seal')} to encrypt.`);
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
    }
  });

vaultCmd
  .command('seal')
  .description('Encrypt all tracked vault files into .zepher/vault/*.enc')
  .option('-p, --passphrase <key>', 'Passphrase or key to encrypt envelope', 'zepher-team-key')
  .action((opts) => {
    const res = sealVault(process.cwd(), opts.passphrase);
    if (res.sealedCount > 0) {
      console.log(chalk.bold.green(`✓ Successfully sealed and encrypted ${res.sealedCount} vault file(s).`));
    }
    if (res.errors.length > 0) {
      res.errors.forEach(e => console.error(chalk.red(`  • ${e}`)));
    }
  });

vaultCmd
  .command('unseal')
  .description('Decrypt vault files into working directory')
  .option('-p, --passphrase <key>', 'Passphrase or key to decrypt envelope', 'zepher-team-key')
  .action((opts) => {
    const res = unsealVault(process.cwd(), opts.passphrase);
    if (res.unsealedCount > 0) {
      console.log(chalk.bold.green(`✓ Successfully unsealed ${res.unsealedCount} vault file(s).`));
    }
    if (res.errors.length > 0) {
      res.errors.forEach(e => console.error(chalk.red(`  • ${e}`)));
    }
  });

vaultCmd
  .command('status')
  .description('Check vault tracking and dirty status')
  .action(() => {
    const config = loadVaultConfig(process.cwd());
    const lockfile = loadVaultLockfile(process.cwd());
    const dirty = checkVaultDirtyStatus(process.cwd());

    console.log(chalk.bold.blue('\n⚡ Zepher Vault Status:'));
    if (config.items.length === 0) {
      console.log(chalk.gray('  No files currently tracked in vault. Track one with "zepher vault track <path>"'));
      return;
    }
    for (const item of config.items) {
      const isDirty = dirty.dirtyFiles.includes(item.path);
      const isSealed = Boolean(lockfile.files[item.path]);
      const statusStr = isDirty
        ? chalk.yellow('[MODIFIED - UNSEALED]')
        : isSealed
        ? chalk.green('[SEALED & IN SYNC]')
        : chalk.red('[NOT SEALED]');
      console.log(`  • ${item.path} (${item.type}): ${statusStr}`);
    }
  });

// Asset Command Group
const assetCmd = program.command('asset').description('Manage heavy binaries, executables, and datasets');

assetCmd
  .command('track <path>')
  .description('Track a binary or heavy artifact in Zepher Asset Hub')
  .option('-t, --tag <tag>', 'Optional version or release tag')
  .action((filePath, opts) => {
    const res = trackAsset(process.cwd(), filePath, { tag: opts.tag });
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
    }
  });

assetCmd
  .command('stash <path>')
  .description('Stash a tracked binary file to local/remote blob store')
  .action((filePath) => {
    const res = stashLocalAsset(process.cwd(), filePath);
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
    }
  });

assetCmd
  .command('pull <path>')
  .description('Restore a tracked binary file from blob store with SHA-256 verification')
  .action((filePath) => {
    const res = restoreLocalAsset(process.cwd(), filePath);
    if (res.success) {
      console.log(chalk.green(`✓ ${res.message}`));
    } else {
      console.error(chalk.red(`✗ ${res.message}`));
    }
  });

program.parse(process.argv);
