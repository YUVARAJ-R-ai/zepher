import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ZEPHER_DIR, HANDOFFS_DIR, TASKS_DIR } from '@zepher/core';

export interface CreateHandoffOptions {
  objective?: string;
  notes?: string;
  completed?: string;
  blockers?: string;
  nextActions?: string;
}

export function createHandoff(projectRoot: string, options: CreateHandoffOptions = {}): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, HANDOFFS_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').substring(0, 16);
  const fileName = `${dateStr}.md`;

  // 1. Collect Git Info
  let branch = 'unknown';
  let recentCommits = '';
  let filesChanged = '';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    const logOutput = execSync('git log -n 3 --oneline 2>/dev/null', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    if (logOutput) {
      recentCommits = logOutput.split('\n').map(l => `- \`${l}\``).join('\n');
    }
    const statusOutput = execSync('git status --short 2>/dev/null', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    if (statusOutput) {
      filesChanged = statusOutput.split('\n').map(l => `- \`${l}\``).join('\n');
    }
  } catch {
    // Non-git environment
  }

  // 2. Collect Active Tasks
  const activeTasksDir = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR, 'active');
  const activeTasks: string[] = [];
  if (fs.existsSync(activeTasksDir)) {
    const taskFiles = fs.readdirSync(activeTasksDir).filter(f => f.endsWith('.md'));
    for (const file of taskFiles) {
      const content = fs.readFileSync(path.join(activeTasksDir, file), 'utf-8');
      const titleMatch = content.match(/^# Task:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
      activeTasks.push(`- **[${file.replace(/\.md$/, '')}]** ${title}`);
    }
  }

  // 3. Collect Blocked Tasks
  const blockedTasksDir = path.join(projectRoot, ZEPHER_DIR, TASKS_DIR, 'blocked');
  const blockedTasks: string[] = [];
  if (fs.existsSync(blockedTasksDir)) {
    const blockedFiles = fs.readdirSync(blockedTasksDir).filter(f => f.endsWith('.md'));
    for (const file of blockedFiles) {
      const content = fs.readFileSync(path.join(blockedTasksDir, file), 'utf-8');
      const titleMatch = content.match(/^# Task:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
      blockedTasks.push(`- **[${file.replace(/\.md$/, '')}]** ${title}`);
    }
  }

  // 4. Assemble content
  let content = `# Agent Handoff - ${dateStr}\n\n`;

  content += `## Objective\n${options.objective || '(Not specified)'}\n\n`;
  content += `## Completed\n${options.completed || '(Summarize work completed during this session)'}\n\n`;

  content += `## Current State\n`;
  content += `- **Branch**: \`${branch}\`\n`;
  if (recentCommits) {
    content += `- **Recent Commits**:\n${recentCommits}\n`;
  }
  content += '\n';

  content += `## Files Changed\n`;
  content += filesChanged ? `${filesChanged}\n\n` : `Working tree clean / no uncommitted changes\n\n`;

  content += `## Active Tasks\n`;
  content += activeTasks.length > 0 ? `${activeTasks.join('\n')}\n\n` : `None\n\n`;

  content += `## Blockers & Known Problems\n`;
  if (options.blockers) {
    content += `${options.blockers}\n\n`;
  } else if (blockedTasks.length > 0) {
    content += `${blockedTasks.join('\n')}\n\n`;
  } else {
    content += `None\n\n`;
  }

  content += `## Important Discoveries & Notes\n${options.notes || 'None'}\n\n`;

  content += `## Recommended Next Action\n`;
  if (options.nextActions) {
    content += `${options.nextActions}\n`;
  } else if (activeTasks.length > 0) {
    content += `Continue with highest priority active task: ${activeTasks[0].replace(/^- /, '')}\n`;
  } else {
    content += `Review project context and pick up next task.\n`;
  }

  fs.writeFileSync(path.join(dirPath, fileName), content.trim() + '\n', 'utf-8');
  return fileName;
}
