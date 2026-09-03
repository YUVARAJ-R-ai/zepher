import { Command } from 'commander';
import { initZepher, getStatus, runDoctor, bootstrapAgent } from '@zepher/core';
import { saveMemory, searchMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { runServer } from '@zepher/mcp';
import { getAllIntegrations, getIntegration } from '@zepher/integrations';
import path from 'path';
import { runIntegrationTui } from './tui.js';

const program = new Command();

program
  .name('zepher')
  .description('Persistent context and memory infrastructure for AI coding agents')
  .version('0.1.0');

program.command('init').description('Initialize Zepher').action(async () => { await initZepher(process.cwd()); });
program.command('status').description('Show status').action(() => { getStatus(process.cwd()); });
program.command('doctor').description('Check health').action(() => { runDoctor(process.cwd()); });
program.command('remember').argument('<text>').option('-t, --type <type>', 'Type', 'conventions').action((t, o) => { saveMemory(process.cwd(), o.type, t); });
program.command('recall').argument('<query>').action((q) => console.log(searchMemory(process.cwd(), q)));
program.command('context').action(() => { generateContext(process.cwd()); });
program.command('handoff').action(() => { createHandoff(process.cwd()); });
program.command('mcp').action(async () => { await runServer(); });

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
  console.log(`Zepher Capabilities\nCore\n✓ Persistent memory\n✓ Context assembly\n✓ Tasks\n✓ ADRs\n✓ Sessions\n✓ Handoffs\n✓ Skills\n✓ Workflows\n\nIntegrations\n✓ codebase-memory-mcp\n✓ Graphify\n✓ ECC\n\nAgent interfaces\n✓ MCP\n✓ AGENTS.md`);
});

const agent = program.command('agent').description('Manage agents');
agent.command('bootstrap').action(() => {
  bootstrapAgent(process.cwd());
});

program.parse(process.argv);
