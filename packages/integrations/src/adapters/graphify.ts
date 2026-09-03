import { ZepherIntegration } from '../types.js';
import fs from 'fs';
import path from 'path';

export const graphifyAdapter: ZepherIntegration = {
  id: 'graphify',
  name: 'Graphify',
  description: 'Architecture visualization and relationship exploration',
  mode: 'optional',
  capabilities: [
    'architecture_visualization', 'relationship_exploration',
    'project_graph', 'dependency_visualization'
  ],
  async detect(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, 'graphify.json'));
    return { installed: hasConfig, reason: hasConfig ? 'Configured' : 'Not configured' }; 
  },
  async validate(projectRoot) { return { valid: true }; },
  async enable(projectRoot) { 
    fs.writeFileSync(path.join(projectRoot, 'graphify.json'), JSON.stringify({ targetDir: '.', outputDir: 'graphify-out' }, null, 2));
  },
  async disable(projectRoot) { 
    if (fs.existsSync(path.join(projectRoot, 'graphify.json'))) fs.unlinkSync(path.join(projectRoot, 'graphify.json'));
  },
  async status(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, 'graphify.json'));
    return { enabled: hasConfig, running: false }; 
  },
  async doctor(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, 'graphify.json'));
    return { healthy: hasConfig, checks: [{ name: 'Configured', passed: hasConfig }] }; 
  }
};
