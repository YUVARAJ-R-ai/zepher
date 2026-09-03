import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, SKILLS_DIR } from './constants.js';

export function bootstrapAgent(projectRoot: string) {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  
  // 1. Update AGENTS.md
  const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
  const agentsContent = `Zepher is the persistent context layer for this repository.

Before substantial work:
1. Read .zepher/context/current.md
2. Read the active task
3. Read relevant decisions
4. Inspect relevant code
5. Use codebase-memory when available

During work:
- update task state
- record important discoveries
- record architectural decisions
- do not duplicate information unnecessarily

After meaningful work:
- update memory
- update task state
- create a handoff when appropriate
`;
  fs.writeFileSync(agentsMdPath, agentsContent);

  // 2. Generate skills
  const skillsPath = path.join(zepherPath, SKILLS_DIR);
  const skillsToCreate = [
    'zepher-core', 'discovery', 'context', 'planning', 'implementation', 
    'debugging', 'testing', 'review', 'architecture', 'frontend', 'database', 'handoff'
  ];
  
  if (!fs.existsSync(skillsPath)) fs.mkdirSync(skillsPath, { recursive: true });
  
  for (const skill of skillsToCreate) {
    const skillDir = path.join(skillsPath, skill);
    if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
    
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `# ${skill.toUpperCase()} SKILL\n\n# Purpose\n\n# When To Use\n\n# Procedure\n\n# Expected Output\n`);
  }
  
  // 3. Generate Agent Definitions
  const agentsPath = path.join(zepherPath, 'agents');
  if (!fs.existsSync(agentsPath)) fs.mkdirSync(agentsPath, { recursive: true });
  
  const agents = ['architect', 'planner', 'implementer', 'debugger', 'reviewer', 'frontend-designer', 'context-manager'];
  for (const a of agents) {
    fs.writeFileSync(path.join(agentsPath, `${a}.md`), `# ${a}\n\nRole definition for ${a}.\n`);
  }
  
  console.log('Agent Environment\n');
  console.log('✓ Zepher initialized');
  console.log('✓ AGENTS.md');
  console.log('✓ Project skills');
  console.log('✓ Agent definitions');
  console.log('✓ MCP server');
  console.log('\nAgents can now operate directly against the Zepher project state.');
}
