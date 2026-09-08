import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTask, completeTask, blockTask, getTask, listTasks } from './index.js';
import { ZEPHER_DIR, TASKS_DIR } from '@zepher/core';

describe('Tasks Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-task-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates an active task and lists it', () => {
    const taskId = createTask(tmpDir, 'Implement JWT auth', {
      objective: 'Support Bearer tokens',
      requirements: ['Sign token', 'Verify token']
    });

    expect(taskId).toBe('implement-jwt-auth');
    const activeTasks = listTasks(tmpDir, 'active');
    expect(activeTasks).toContain('implement-jwt-auth');

    const detail = getTask(tmpDir, taskId);
    expect(detail).not.toBeNull();
    expect(detail?.status).toBe('active');
    expect(detail?.title).toBe('Implement JWT auth');
    expect(detail?.content).toContain('- [ ] Sign token');
  });

  it('blocks an active task with a reason', () => {
    const taskId = createTask(tmpDir, 'Deploy database');
    expect(listTasks(tmpDir, 'active')).toContain('deploy-database');

    const blocked = blockTask(tmpDir, taskId, 'Waiting for cloud credentials');
    expect(blocked).toBe(true);

    expect(listTasks(tmpDir, 'active')).not.toContain('deploy-database');
    expect(listTasks(tmpDir, 'blocked')).toContain('deploy-database');

    const detail = getTask(tmpDir, taskId);
    expect(detail?.status).toBe('blocked');
    expect(detail?.content).toContain('Waiting for cloud credentials');
  });

  it('completes an active or blocked task', () => {
    const taskId = createTask(tmpDir, 'Setup CI/CD');
    blockTask(tmpDir, taskId, 'Runner offline');
    expect(listTasks(tmpDir, 'blocked')).toContain('setup-ci-cd');

    const completed = completeTask(tmpDir, taskId);
    expect(completed).toBe(true);

    expect(listTasks(tmpDir, 'blocked')).not.toContain('setup-ci-cd');
    expect(listTasks(tmpDir, 'completed')).toContain('setup-ci-cd');

    const detail = getTask(tmpDir, taskId);
    expect(detail?.status).toBe('completed');
    expect(detail?.content).toContain('## Status\nCompleted');
  });

  it('supports listing all tasks across statuses', () => {
    const t1 = createTask(tmpDir, 'Task 1');
    const t2 = createTask(tmpDir, 'Task 2');
    const t3 = createTask(tmpDir, 'Task 3');

    blockTask(tmpDir, t2, 'Blocked');
    completeTask(tmpDir, t3);

    const all = listTasks(tmpDir, 'all');
    expect(all).toContain(`active:${t1}`);
    expect(all).toContain(`blocked:${t2}`);
    expect(all).toContain(`completed:${t3}`);
  });
});
