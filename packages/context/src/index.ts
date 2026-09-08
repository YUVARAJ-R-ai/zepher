import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ZEPHER_DIR, CONTEXT_DIR, MEMORY_DIR, TASKS_DIR, DECISIONS_DIR, HANDOFFS_DIR } from '@zepher/core';

export function generateContext(projectRoot: string): string {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  const contextDir = path.join(zepherPath, CONTEXT_DIR);
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  const contextPath = path.join(contextDir, 'current.md');
  
  const readMem = (file: string) => {
    const p = path.join(zepherPath, MEMORY_DIR, file);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8').trim() : '';
  };
  
  const project = readMem('project.md') || 'No project summary recorded yet.';
  const arch = readMem('architecture.md') || 'No architectural notes recorded yet.';
  const constraints = readMem('constraints.md') || 'No constraints recorded yet.';
  const conventions = readMem('conventions.md') || '';

  // 1. Load active tasks
  const activeTasksDir = path.join(zepherPath, TASKS_DIR, 'active');
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

  // 2. Load blockers / blocked tasks
  const blockedTasksDir = path.join(zepherPath, TASKS_DIR, 'blocked');
  const blockedTasks: string[] = [];
  if (fs.existsSync(blockedTasksDir)) {
    const blockedFiles = fs.readdirSync(blockedTasksDir).filter(f => f.endsWith('.md'));
    for (const file of blockedFiles) {
      const content = fs.readFileSync(path.join(blockedTasksDir, file), 'utf-8');
      const titleMatch = content.match(/^# Task:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
      blockedTasks.push(`- **[BLOCKED] ${file.replace(/\.md$/, '')}**: ${title}`);
    }
  }

  // 3. Load recent decisions (ADRs)
  const decisionsDir = path.join(zepherPath, DECISIONS_DIR);
  const recentDecisions: string[] = [];
  if (fs.existsSync(decisionsDir)) {
    const adrFiles = fs.readdirSync(decisionsDir)
      .filter(f => f.startsWith('ADR-') && f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 5);
    for (const file of adrFiles) {
      const content = fs.readFileSync(path.join(decisionsDir, file), 'utf-8');
      const titleMatch = content.match(/^# (ADR-\d+:\s*.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
      const statusMatch = content.match(/^## Status\s*\n+([^\n]+)/m);
      const status = statusMatch ? ` (${statusMatch[1].trim()})` : '';
      recentDecisions.push(`- **${title}**${status}`);
    }
  }

  // 4. Load latest handoff
  const handoffsDir = path.join(zepherPath, HANDOFFS_DIR);
  let latestHandoff = '(No recent handoffs recorded)';
  if (fs.existsSync(handoffsDir)) {
    const handoffFiles = fs.readdirSync(handoffsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    if (handoffFiles.length > 0) {
      const latestFile = handoffFiles[0];
      const raw = fs.readFileSync(path.join(handoffsDir, latestFile), 'utf-8');
      const lines = raw.split('\n');
      const summaryLines = lines.slice(0, 15).join('\n').trim();
      latestHandoff = `**Latest session handoff (${latestFile.replace(/\.md$/, '')}):**\n\n${summaryLines}`;
    }
  }

  // 5. Git status overview
  let gitOverview = '';
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    const statusShort = execSync('git status --short 2>/dev/null', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    const changedCount = statusShort ? statusShort.split('\n').filter(Boolean).length : 0;
    gitOverview = `\n## Repository State\n- Branch: \`${branch || 'unknown'}\`\n- Uncommitted files: ${changedCount === 0 ? 'Working tree clean' : `${changedCount} modified/untracked file(s)`}\n`;
  } catch {
    // Non-git directory
  }

  let content = `# Current Context for ${path.basename(projectRoot)}\n\n`;
  content += `## Project Overview\n${project}\n\n`;
  content += `## Architecture Notes\n${arch}\n\n`;
  if (constraints && constraints !== 'No constraints recorded yet.') {
    content += `## Constraints\n${constraints}\n\n`;
  }
  if (conventions) {
    content += `## Conventions\n${conventions}\n\n`;
  }

  content += `## Active Tasks\n`;
  if (activeTasks.length > 0) {
    content += activeTasks.join('\n') + '\n\n';
  } else {
    content += `(No active tasks. Create one with \`zepher task create <name>\`)\n\n`;
  }

  if (blockedTasks.length > 0) {
    content += `## Blockers & Known Problems\n`;
    content += blockedTasks.join('\n') + '\n\n';
  }

  if (recentDecisions.length > 0) {
    content += `## Recent Architecture Decisions\n`;
    content += recentDecisions.join('\n') + '\n\n';
  }

  content += `## Recent Work & Handoffs\n${latestHandoff}\n`;

  if (gitOverview) {
    content += gitOverview;
  }

  content += `\n## Next Steps\n`;
  if (activeTasks.length > 0) {
    content += `Focus on the highest priority active task listed above.\n`;
  } else {
    content += `Consult active backlog or check project goals.\n`;
  }
  
  fs.writeFileSync(contextPath, content.trim() + '\n', 'utf-8');
  return content;
}
