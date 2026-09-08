import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { saveMemory, searchMemory, readMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { getStatus, resolveUnifiedState, addRule } from '@zepher/core';
import { getAllIntegrations } from '@zepher/integrations';
import { listAllSkills } from '@zepher/skills';
import { runSync } from '@zepher/adapters';
import path from 'path';

const server = new Server({ name: 'zepher', version: '0.3.0' }, { capabilities: { tools: {} } });

const TOOLS: Tool[] = [
  {
    name: 'zepher_project_context',
    description: 'Get composite project context summary including active memory, tasks, and conventions',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_search_memory',
    description: 'Search persistent memory facts and architectural notes',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' }, query: { type: 'string' } }, required: ['projectRoot', 'query'] }
  },
  {
    name: 'zepher_write_memory',
    description: 'Save a persistent fact or lesson learned to memory',
    inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['project', 'architecture', 'conventions', 'constraints', 'lessons'] }, content: { type: 'string' }, projectRoot: { type: 'string' } }, required: ['type', 'content', 'projectRoot'] }
  },
  {
    name: 'zepher_task_create',
    description: 'Create a new project task in .zepher/tasks/active/',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' }, name: { type: 'string' } }, required: ['projectRoot', 'name'] }
  },
  {
    name: 'zepher_task_list',
    description: 'List active project tasks',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_generate_handoff',
    description: 'Generate an actionable handoff summary for the next agent session',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_get_rules',
    description: 'Get all active engineering rules and constraints (with priorities and globs)',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_add_rule',
    description: 'Register a new engineering rule or convention into Zepher',
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: { type: 'string' },
        content: { type: 'string' },
        title: { type: 'string' },
        priority: { type: 'number', description: 'Priority from 1-100 (default 50)' },
        tags: { type: 'array', items: { type: 'string' } },
        globs: { type: 'array', items: { type: 'string' }, description: 'File path globs (e.g. ["src/**/*.ts"])' },
        alwaysApply: { type: 'boolean' },
        global: { type: 'boolean', description: 'Save globally to ~/.zepher/rules' }
      },
      required: ['projectRoot', 'content']
    }
  },
  {
    name: 'zepher_list_skills',
    description: 'List all installed portable agent skills (global and local)',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_sync',
    description: 'Trigger synchronization of Zepher rules/skills to vendor agent configs (.cursorrules, CLAUDE.md, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: { type: 'string' },
        dryRun: { type: 'boolean' },
        force: { type: 'boolean' },
        adapter: { type: 'string' }
      },
      required: ['projectRoot']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args || typeof args.projectRoot !== 'string') throw new Error('projectRoot is required');
  const { projectRoot } = args;

  try {
    switch (name) {
      case 'zepher_project_context':
        return { content: [{ type: 'text', text: generateContext(projectRoot) }] };
      case 'zepher_search_memory':
        return { content: [{ type: 'text', text: JSON.stringify(searchMemory(projectRoot, String(args.query))) }] };
      case 'zepher_write_memory':
        return { content: [{ type: 'text', text: saveMemory(projectRoot, String(args.type), String(args.content)) ? 'Saved' : 'Failed' }] };
      case 'zepher_task_create':
        return { content: [{ type: 'text', text: createTask(projectRoot, String(args.name)) }] };
      case 'zepher_task_list':
        return { content: [{ type: 'text', text: JSON.stringify(listTasks(projectRoot, 'active')) }] };
      case 'zepher_generate_handoff':
        return { content: [{ type: 'text', text: createHandoff(projectRoot) }] };
      case 'zepher_get_rules': {
        const state = await resolveUnifiedState(projectRoot);
        return { content: [{ type: 'text', text: JSON.stringify(state.rules, null, 2) }] };
      }
      case 'zepher_add_rule': {
        const res = addRule({
          projectRoot,
          content: String(args.content),
          title: args.title ? String(args.title) : undefined,
          priority: typeof args.priority === 'number' ? args.priority : undefined,
          tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
          globs: Array.isArray(args.globs) ? (args.globs as string[]) : undefined,
          alwaysApply: typeof args.alwaysApply === 'boolean' ? args.alwaysApply : undefined,
          global: Boolean(args.global)
        });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'zepher_list_skills': {
        const skills = listAllSkills(projectRoot);
        return { content: [{ type: 'text', text: JSON.stringify(skills, null, 2) }] };
      }
      case 'zepher_sync': {
        const syncRes = await runSync(projectRoot, {
          dryRun: Boolean(args.dryRun),
          force: Boolean(args.force),
          adapter: args.adapter ? String(args.adapter) : undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(syncRes, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) {
    return { content: [{ type: 'text', text: `Error: ${e.message || e}` }] };
  }
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Zepher MCP server running on stdio');
}
