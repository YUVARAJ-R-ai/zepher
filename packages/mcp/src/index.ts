import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { saveMemory, searchMemory, readMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { getStatus } from '@zepher/core';
import { getAllIntegrations } from '@zepher/integrations';
import path from 'path';

const server = new Server({ name: 'zepher', version: '0.1.0' }, { capabilities: { tools: {} } });

const TOOLS: Tool[] = [
  {
    name: 'zepher_project_context',
    description: 'Get composite project context',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_search_memory',
    description: 'Search memory',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' }, query: { type: 'string' } }, required: ['projectRoot', 'query'] }
  },
  {
    name: 'zepher_write_memory',
    description: 'Save a fact to memory',
    inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['project', 'architecture', 'conventions', 'constraints', 'lessons'] }, content: { type: 'string' }, projectRoot: { type: 'string' } }, required: ['type', 'content', 'projectRoot'] }
  },
  {
    name: 'zepher_task_create',
    description: 'Create task',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' }, name: { type: 'string' } }, required: ['projectRoot', 'name'] }
  },
  {
    name: 'zepher_task_list',
    description: 'List active tasks',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
  },
  {
    name: 'zepher_generate_handoff',
    description: 'Generate handoff',
    inputSchema: { type: 'object', properties: { projectRoot: { type: 'string' } }, required: ['projectRoot'] }
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
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e}` }] };
  }
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Zepher MCP server running on stdio');
}
