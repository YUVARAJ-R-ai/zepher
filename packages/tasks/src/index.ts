import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, TASKS_DIR } from '@zepher/core';

export function createTask(projectRoot: string, name: string): string {
  const tasksPath = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR, 'active');
  const taskId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
  const taskFile = path.join(tasksPath, `${taskId}.md`);
  
  const content = `# Task: ${name}

## Objective
${name}

## Requirements
- 

## Status
Active

## Dependencies
- 

## Completed Work
- 

## Remaining Work
- 

## Blockers
- 

## Relevant Files
- 
`;

  fs.writeFileSync(taskFile, content);
  return taskId;
}

export function listTasks(projectRoot: string, status: 'active' | 'completed' | 'blocked' = 'active'): string[] {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR, status);
  if (!fs.existsSync(dirPath)) return [];
  
  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}
