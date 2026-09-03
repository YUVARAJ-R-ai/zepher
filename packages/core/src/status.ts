import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, MEMORY_DIR, TASKS_DIR, DECISIONS_DIR } from './constants.js';

export function getStatus(projectRoot: string) {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  if (!fs.existsSync(zepherPath)) {
    console.log("Zepher is not initialized in this repository.");
    return;
  }
  
  const readLines = (file: string) => {
    const p = path.join(zepherPath, MEMORY_DIR, file);
    if (!fs.existsSync(p)) return 0;
    const content = fs.readFileSync(p, 'utf-8');
    return (content.match(/^## \[/gm) || []).length;
  };
  
  const countDir = (dir: string) => {
    const p = path.join(zepherPath, dir);
    if (!fs.existsSync(p)) return 0;
    return fs.readdirSync(p).filter(f => f.endsWith('.md')).length;
  };

  const projectFacts = readLines('project.md');
  const archFacts = readLines('architecture.md');
  const convFacts = readLines('conventions.md');
  const lessonFacts = readLines('lessons.md');
  
  const activeTasks = countDir(path.join(TASKS_DIR, 'active'));
  const completedTasks = countDir(path.join(TASKS_DIR, 'completed'));
  const blockedTasks = countDir(path.join(TASKS_DIR, 'blocked'));
  const decisions = countDir(DECISIONS_DIR);
  
  const statusStr = `Zepher

Project:
  ${path.basename(projectRoot)}

Memory:
  Project facts:       ${projectFacts}
  Architecture:        ${archFacts}
  Conventions:          ${convFacts}
  Lessons:              ${lessonFacts}
  Decisions:            ${decisions}

Tasks:
  Active:               ${activeTasks}
  Blocked:              ${blockedTasks}
  Completed:            ${completedTasks}

Integrations:
  ✓ Git
  ✓ MCP
  ~ codebase-memory-mcp
  ~ Graphify
`;

  console.log(statusStr);
}
