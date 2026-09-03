import { Command } from 'commander';
import { initZepher, getStatus, runDoctor } from '@zepher/core';
import { saveMemory, searchMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { runServer } from '@zepher/mcp';
import path from 'path';

const program = new Command();

program
  .name('zepher')
  .description('Persistent context and memory infrastructure for AI coding agents')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize Zepher in the current repository')
  .action(async () => {
    await initZepher(process.cwd());
  });

program
  .command('status')
  .description('Show Zepher status for the current repository')
  .action(() => {
    getStatus(process.cwd());
  });

program
  .command('doctor')
  .description('Check system and Zepher health')
  .action(() => {
    runDoctor(process.cwd());
  });

program
  .command('remember')
  .description('Remember a fact or constraint')
  .argument('<text>', 'Text to remember')
  .option('-t, --type <type>', 'Type of memory (convention, constraint, lesson, architecture, project)', 'conventions')
  .action((text, options) => {
    const success = saveMemory(process.cwd(), options.type, text);
    if (success) {
      console.log(`Saved to ${options.type} memory.`);
    }
  });

program
  .command('recall')
  .description('Search Zepher memory')
  .argument('<query>', 'Query to search for')
  .action((query) => {
    const results = searchMemory(process.cwd(), query);
    if (results.length === 0) {
      console.log('No matching memory found.');
    } else {
      console.log(`Found ${results.length} results:\n`);
      for (const res of results) {
        console.log(`[${res.relevance}x] ${path.relative(process.cwd(), res.file)}`);
      }
    }
  });

program
  .command('context')
  .description('Generate current context bundle')
  .action(() => {
    generateContext(process.cwd());
    console.log('Context generated at .zepher/context/current.md');
  });

const task = program.command('task').description('Manage tasks');

task
  .command('create')
  .argument('<name>', 'Task name')
  .action((name) => {
    const id = createTask(process.cwd(), name);
    console.log(`Created task: ${id}`);
  });

task
  .command('list')
  .action(() => {
    const active = listTasks(process.cwd(), 'active');
    console.log('Active Tasks:');
    active.forEach(t => console.log(`- ${t}`));
  });

program
  .command('decision')
  .description('Manage decisions (ADRs)')
  .command('create')
  .argument('<title>', 'Decision title')
  .action((title) => {
    const file = createDecision(process.cwd(), title);
    console.log(`Created new decision ADR: ${file}`);
  });

program
  .command('handoff')
  .description('Generate a session handoff')
  .action(() => {
    const file = createHandoff(process.cwd());
    console.log(`Generated session handoff: ${file}`);
  });

program
  .command('mcp')
  .description('Run Zepher MCP server')
  .action(async () => {
    await runServer();
  });

program.parse(process.argv);
