import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { saveMemory, searchMemory, readMemory } from '@zepher/memory';
import { generateContext } from '@zepher/context';
import { createTask, listTasks } from '@zepher/tasks';
import { createDecision } from '@zepher/decisions';
import { createHandoff } from '@zepher/sessions';
import { getStatus } from '@zepher/core';
import path from 'path';

const server = new Server(
  {
    name: 'zepher',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS: Tool[] = [
  {
    name: 'zepher_memory_search',
    description: 'Search Zepher memory for context',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        projectRoot: { type: 'string', description: 'Absolute path to project root' }
      },
      required: ['query', 'projectRoot'],
    },
  },
  {
    name: 'zepher_memory_save',
    description: 'Save a fact to Zepher memory',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['project', 'architecture', 'conventions', 'constraints', 'lessons'] },
        content: { type: 'string', description: 'Content to save' },
        projectRoot: { type: 'string' }
      },
      required: ['type', 'content', 'projectRoot'],
    },
  },
  {
    name: 'zepher_context',
    description: 'Generate the current context bundle for the agent',
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: { type: 'string' }
      },
      required: ['projectRoot'],
    },
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args || typeof args.projectRoot !== 'string') {
    throw new Error('projectRoot is required');
  }

  const { projectRoot } = args;

  switch (name) {
    case 'zepher_memory_search': {
      const results = searchMemory(projectRoot, String(args.query));
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }
    case 'zepher_memory_save': {
      const success = saveMemory(projectRoot, String(args.type), String(args.content));
      return {
        content: [{ type: 'text', text: success ? 'Memory saved successfully.' : 'Failed to save memory.' }],
      };
    }
    case 'zepher_context': {
      const ctx = generateContext(projectRoot);
      return {
        content: [{ type: 'text', text: ctx }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Zepher MCP server running on stdio');
}
