import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHandoff } from './index.js';
import { ZEPHER_DIR, HANDOFFS_DIR, TASKS_DIR } from '@zepher/core';

describe('Sessions: createHandoff', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-session-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a handoff markdown file with default values', () => {
    const fileName = createHandoff(tmpDir);
    expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}\.md$/);

    const handoffPath = path.join(tmpDir, ZEPHER_DIR, HANDOFFS_DIR, fileName);
    expect(fs.existsSync(handoffPath)).toBe(true);

    const content = fs.readFileSync(handoffPath, 'utf-8');
    expect(content).toContain('# Agent Handoff');
    expect(content).toContain('## Objective');
    expect(content).toContain('## Current State');
    expect(content).toContain('## Files Changed');
  });

  it('populates active tasks and custom options', () => {
    const activeTasksDir = path.join(tmpDir, ZEPHER_DIR, TASKS_DIR, 'active');
    fs.mkdirSync(activeTasksDir, { recursive: true });
    fs.writeFileSync(path.join(activeTasksDir, 'task-001.md'), '# Task: Implement authentication\n\nDetails here.');

    const fileName = createHandoff(tmpDir, {
      objective: 'Ship auth flow',
      completed: 'Added token validation',
      notes: 'Remember to rotate JWT secret',
      nextActions: 'Add refresh token endpoint'
    });

    const handoffPath = path.join(tmpDir, ZEPHER_DIR, HANDOFFS_DIR, fileName);
    const content = fs.readFileSync(handoffPath, 'utf-8');

    expect(content).toContain('Ship auth flow');
    expect(content).toContain('Added token validation');
    expect(content).toContain('Remember to rotate JWT secret');
    expect(content).toContain('Add refresh token endpoint');
    expect(content).toContain('task-001');
    expect(content).toContain('Implement authentication');
  });
});
