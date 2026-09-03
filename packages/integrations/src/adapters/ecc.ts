import { ZepherIntegration } from '../types.js';
import fs from 'fs';
import path from 'path';

export const eccAdapter: ZepherIntegration = {
  id: 'ecc',
  name: 'Everything Claude Code (ECC)',
  description: 'Portable engineering workflows, skills and agent practices',
  mode: 'optional',
  capabilities: ['skills', 'workflows', 'engineering_practices', 'agent_instructions'],
  async detect(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, '.ecc'));
    return { installed: hasConfig, reason: hasConfig ? 'Configured' : 'Not configured' }; 
  },
  async validate(projectRoot) { return { valid: true }; },
  async enable(projectRoot) { 
    const p = path.join(projectRoot, '.ecc');
    if (!fs.existsSync(p)) fs.mkdirSync(p);
    fs.writeFileSync(path.join(p, 'config.json'), JSON.stringify({ zepherSync: true }, null, 2));
  },
  async disable(projectRoot) { 
    const p = path.join(projectRoot, '.ecc');
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  },
  async status(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, '.ecc'));
    return { enabled: hasConfig, running: false }; 
  },
  async doctor(projectRoot) { 
    const hasConfig = fs.existsSync(path.join(projectRoot, '.ecc'));
    return { healthy: hasConfig, checks: [{ name: 'Configured', passed: hasConfig }] }; 
  }
};
