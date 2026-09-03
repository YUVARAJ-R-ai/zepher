import { Command } from 'commander';
import chalk from 'chalk';
import { 
  initZepher, initGlobalZepher, getStatus, runDoctor, bootstrapAgent,
  addRule, listAllRules, removeRule 
} from '@zepher/core';
import { saveMemory, searchMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { runServer } from '@zepher/mcp';
import { getAllIntegrations, getIntegration } from '@zepher/integrations';
import { runSync, importExistingConfigs, ALL_ADAPTERS } from '@zepher/adapters';
import { installSkillFromSource, listAllSkills, removeSkill } from '@zepher/skills';
import { runIntegrationTui } from './tui.js';

const program = new Command();

program
  .name('zepher')
  .description('Persistent context, memory & universal agent environment manager')
  .version('0.2.0');

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
program.command('remember').argument('<text>').option('-t, --type <type>', 'Type', 'conventions').action((t, o) => { saveMemory(process.cwd(), o.type, t); });
program.command('recall').argument('<query>').action((q) => console.log(searchMemory(process.cwd(), q)));
program.command('context').action(() => { generateContext(process.cwd()); });
program.command('handoff').action(() => { createHandoff(process.cwd()); });
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
  .option('-g, --global', 'Add to global rules (~/.zepher/rules)')
  .action((content, opts) => {
    const tags = opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined;
    const { filePath, rule } = addRule({
      content,
      title: opts.title,
      priority: opts.priority,
      tags,
      global: opts.global,
      projectRoot: process.cwd()
    });
    console.log(chalk.green(`✓ Added ${rule.scope} rule: "${rule.title}" (Priority: ${rule.priority})`));
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
  .description('List all installed skills')
  .action(() => {
    const { global, local } = listAllSkills(process.cwd());
    console.log(chalk.bold.blue('\nGlobal Skills (~/.zepher/skills):'));
    if (global.length === 0) {
      console.log(chalk.gray('  (No global skills installed)'));
    } else {
      global.forEach(s => console.log(`  • ${chalk.bold(s.name)} - ${chalk.gray(s.description)}`));
    }

    console.log(chalk.bold.blue('\nLocal Project Skills (.zepher/skills):'));
    if (local.length === 0) {
      console.log(chalk.gray('  (No local skills installed)'));
    } else {
      local.forEach(s => console.log(`  • ${chalk.bold(s.name)} - ${chalk.gray(s.description)}`));
    }
    console.log();
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
  console.log(`Zepher Capabilities\nCore\n✓ Persistent memory\n✓ Context assembly\n✓ Tasks\n✓ ADRs\n✓ Sessions\n✓ Handoffs\n✓ Skills\n✓ Workflows\n✓ Universal Rules Engine\n✓ Two-Tier Global/Local Inheritance\n✓ Vendor Adapters (Cursor, Claude, Windsurf, Copilot, Gemini)\n✓ Sync Compiler & Reverse Import\n\nIntegrations\n✓ codebase-memory-mcp\n✓ Graphify\n✓ ECC\n\nAgent interfaces\n✓ MCP\n✓ AGENTS.md`);
});

const agent = program.command('agent').description('Manage agents');
agent.command('bootstrap').action(() => {
  bootstrapAgent(process.cwd());
});

program.parse(process.argv);
