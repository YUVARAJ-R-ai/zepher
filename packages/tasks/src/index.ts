import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, TASKS_DIR } from '@zepher/core';

export interface TaskDetail {
  id: string;
  status: 'active' | 'completed' | 'blocked';
  filePath: string;
  title: string;
  content: string;
}

export function createTask(
  projectRoot: string,
  name: string,
  options?: { objective?: string; requirements?: string[] }
): string {
  const tasksPath = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR, 'active');
  if (!fs.existsSync(tasksPath)) {
    fs.mkdirSync(tasksPath, { recursive: true });
  }

  const taskId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30) || 'task';
  const taskFile = path.join(tasksPath, `${taskId}.md`);

  const reqs = options?.requirements && options.requirements.length > 0
    ? options.requirements.map(r => `- [ ] ${r}`).join('\n')
    : '- ';

  const content = `# Task: ${name}

## Objective
${options?.objective || name}

## Requirements
${reqs}

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

  fs.writeFileSync(taskFile, content, 'utf-8');
  return taskId;
}

export function completeTask(projectRoot: string, taskId: string): boolean {
  const cleanId = taskId.endsWith('.md') ? taskId.slice(0, -3) : taskId;
  const zepherTasks = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR);
  const searchDirs = ['active', 'blocked'];
  let foundDir = '';

  for (const dir of searchDirs) {
    if (fs.existsSync(path.join(zepherTasks, dir, `${cleanId}.md`))) {
      foundDir = dir;
      break;
    }
  }

  if (!foundDir) {
    if (fs.existsSync(path.join(zepherTasks, 'completed', `${cleanId}.md`))) {
      return true;
    }
    return false;
  }

  const srcPath = path.join(zepherTasks, foundDir, `${cleanId}.md`);
  const completedDir = path.join(zepherTasks, 'completed');
  if (!fs.existsSync(completedDir)) {
    fs.mkdirSync(completedDir, { recursive: true });
  }
  const destPath = path.join(completedDir, `${cleanId}.md`);

  let content = fs.readFileSync(srcPath, 'utf-8');
  content = content.replace(/^## Status\s*\n+[^\n]+/m, '## Status\nCompleted');

  fs.writeFileSync(destPath, content, 'utf-8');
  fs.unlinkSync(srcPath);
  return true;
}

export function blockTask(projectRoot: string, taskId: string, reason?: string): boolean {
  const cleanId = taskId.endsWith('.md') ? taskId.slice(0, -3) : taskId;
  const zepherTasks = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR);
  const searchDirs = ['active', 'completed'];
  let foundDir = '';

  for (const dir of searchDirs) {
    if (fs.existsSync(path.join(zepherTasks, dir, `${cleanId}.md`))) {
      foundDir = dir;
      break;
    }
  }

  if (!foundDir) {
    if (fs.existsSync(path.join(zepherTasks, 'blocked', `${cleanId}.md`))) {
      if (reason) {
        const destPath = path.join(zepherTasks, 'blocked', `${cleanId}.md`);
        let content = fs.readFileSync(destPath, 'utf-8');
        content = content.replace(/^## Blockers\s*\n+(- )?/m, `## Blockers\n- ${reason}\n`);
        fs.writeFileSync(destPath, content, 'utf-8');
      }
      return true;
    }
    return false;
  }

  const srcPath = path.join(zepherTasks, foundDir, `${cleanId}.md`);
  const blockedDir = path.join(zepherTasks, 'blocked');
  if (!fs.existsSync(blockedDir)) {
    fs.mkdirSync(blockedDir, { recursive: true });
  }
  const destPath = path.join(blockedDir, `${cleanId}.md`);

  let content = fs.readFileSync(srcPath, 'utf-8');
  content = content.replace(/^## Status\s*\n+[^\n]+/m, '## Status\nBlocked');
  if (reason) {
    content = content.replace(/^## Blockers\s*\n+(- )?/m, `## Blockers\n- ${reason}\n`);
  }

  fs.writeFileSync(destPath, content, 'utf-8');
  fs.unlinkSync(srcPath);
  return true;
}

export function getTask(projectRoot: string, taskId: string): TaskDetail | null {
  const cleanId = taskId.endsWith('.md') ? taskId.slice(0, -3) : taskId;
  const zepherTasks = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR);
  const statuses: ('active' | 'completed' | 'blocked')[] = ['active', 'blocked', 'completed'];

  for (const status of statuses) {
    const taskPath = path.join(zepherTasks, status, `${cleanId}.md`);
    if (fs.existsSync(taskPath)) {
      const content = fs.readFileSync(taskPath, 'utf-8');
      const titleMatch = content.match(/^# Task:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : cleanId;
      return {
        id: cleanId,
        status,
        filePath: taskPath,
        title,
        content
      };
    }
  }

  return null;
}

export function listTasks(
  projectRoot: string,
  status: 'active' | 'completed' | 'blocked' | 'all' = 'active'
): string[] {
  const zepherTasks = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR);

  if (status === 'all') {
    const allStatuses: ('active' | 'completed' | 'blocked')[] = ['active', 'blocked', 'completed'];
    const result: string[] = [];
    for (const s of allStatuses) {
      const dir = path.join(zepherTasks, s);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => `${s}:${f.replace('.md', '')}`);
        result.push(...files);
      }
    }
    return result;
  }

  const dirPath = path.join(zepherTasks, status);
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

