import { ZepherIntegration, DetectionResult, ValidationResult, IntegrationStatus, DiagnosticResult } from '../types.js';
import fs from 'fs';
import path from 'path';

export const codebaseMemoryAdapter: ZepherIntegration = {
  id: 'codebase-memory',
  name: 'codebase-memory-mcp',
  description: 'Code intelligence and repository exploration',
  mode: 'auto',
  capabilities: [
    'search_code', 'search_symbol', 'find_definition',
    'find_references', 'dependency_analysis', 'call_relationships',
    'impact_analysis', 'architecture_exploration'
  ],
  async detect(projectRoot) {
    const hasConfig = fs.existsSync(path.join(projectRoot, '.mcp.json'));
    return { installed: hasConfig, reason: hasConfig ? 'Configured in .mcp.json' : 'Not configured' };
  },
  async validate(projectRoot) {
    return { valid: true };
  },
  async enable(projectRoot) {
    const mcpConfigPath = path.join(projectRoot, '.mcp.json');
    const config = fs.existsSync(mcpConfigPath) ? JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8')) : { mcpServers: {} };
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers['codebase-memory'] = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-codebase-memory', projectRoot]
    };
    fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  },
  async disable(projectRoot) {
    const mcpConfigPath = path.join(projectRoot, '.mcp.json');
    if (fs.existsSync(mcpConfigPath)) {
      const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      if (config.mcpServers && config.mcpServers['codebase-memory']) {
        delete config.mcpServers['codebase-memory'];
        fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
      }
    }
  },
  async status(projectRoot) {
    const hasConfig = fs.existsSync(path.join(projectRoot, '.mcp.json'));
    return { enabled: hasConfig, running: false, details: hasConfig ? 'Enabled' : 'Disabled' };
  },
  async doctor(projectRoot) {
    const hasConfig = fs.existsSync(path.join(projectRoot, '.mcp.json'));
    return {
      healthy: hasConfig,
      checks: [{ name: 'MCP Server configured', passed: hasConfig, message: hasConfig ? 'Configured in .mcp.json' : 'Not configured' }]
    };
  }
};
