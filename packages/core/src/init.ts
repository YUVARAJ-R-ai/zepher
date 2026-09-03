import fs from 'fs';
import path from 'path';
import { 
  ZEPHER_DIR, MEMORY_DIR, DECISIONS_DIR, TASKS_DIR, 
  SESSIONS_DIR, HANDOFFS_DIR, CONTEXT_DIR, RESEARCH_DIR, LOCAL_DIR,
  CONFIG_FILE
} from './constants.js';
import { DEFAULT_CONFIG } from './config.js';
import yaml from 'yaml';

export async function initZepher(projectRoot: string) {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  const isExisting = fs.existsSync(zepherPath);

  if (!isExisting) {
    fs.mkdirSync(zepherPath, { recursive: true });
  }

  const dirs = [
    MEMORY_DIR,
    DECISIONS_DIR,
    path.join(TASKS_DIR, 'active'),
    path.join(TASKS_DIR, 'completed'),
    path.join(TASKS_DIR, 'blocked'),
    SESSIONS_DIR,
    HANDOFFS_DIR,
    CONTEXT_DIR,
    RESEARCH_DIR,
    LOCAL_DIR
  ];

  for (const dir of dirs) {
    const dirPath = path.join(zepherPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  const configPath = path.join(zepherPath, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, yaml.stringify(DEFAULT_CONFIG));
  }

  // Create default memory files if they don't exist
  const memoryPath = path.join(zepherPath, MEMORY_DIR);
  const defaultMemories = {
    'project.md': '# Project Facts\n\nFramework: UNKNOWN\nDatabase: UNKNOWN\n',
    'architecture.md': '# Architecture\n\nUNKNOWN\n',
    'conventions.md': '# Conventions\n\n',
    'constraints.md': '# Constraints\n\n',
    'environment.md': '# Environment\n\n',
    'lessons.md': '# Lessons Learned\n\n'
  };

  for (const [file, content] of Object.entries(defaultMemories)) {
    const filePath = path.join(memoryPath, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  }

  // Generate AGENTS.md
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  const zepherInstructions = `
## Zepher Context System
This project uses Zepher.
Persistent project context is stored in .zepher/.
Read relevant context before substantial work.
Use Zepher memory when necessary.
Update memory after important discoveries.
Create handoffs at the end of meaningful sessions.
`;

  if (fs.existsSync(agentsPath)) {
    const current = fs.readFileSync(agentsPath, 'utf-8');
    if (!current.includes('Zepher Context System')) {
      fs.appendFileSync(agentsPath, '\n' + zepherInstructions);
      console.log('Appended Zepher instructions to existing AGENTS.md');
    }
  } else {
    fs.writeFileSync(agentsPath, '# Agent Instructions\n' + zepherInstructions);
    console.log('Created AGENTS.md');
  }

  if (isExisting) {
    console.log('Existing Zepher installation detected. No destructive changes performed.');
  } else {
    console.log('Initialized Zepher context infrastructure.');
  }
}
