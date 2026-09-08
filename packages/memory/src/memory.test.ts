import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { saveMemory, readMemory, searchMemory } from './index.js';
import { ZEPHER_DIR, MEMORY_DIR } from '@zepher/core';

describe('Memory Storage & Search', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-memory-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('auto-creates memory file and directory when saving new memory type', () => {
    const success = saveMemory(tmpDir, 'conventions', 'Always write typed functions.');
    expect(success).toBe(true);

    const memFile = path.join(tmpDir, ZEPHER_DIR, MEMORY_DIR, 'conventions.md');
    expect(fs.existsSync(memFile)).toBe(true);

    const read = readMemory(tmpDir, 'conventions');
    expect(read).toContain('Always write typed functions.');
  });

  it('safely handles queries containing regex special characters without crashing', () => {
    saveMemory(tmpDir, 'conventions', 'Handle regex like path/to/(special)*[char]+? safely.');

    // These queries previously crashed new RegExp(query)
    const res1 = searchMemory(tmpDir, '(special)*');
    expect(res1.length).toBeGreaterThan(0);
    expect(res1[0].file).toContain('conventions.md');

    const res2 = searchMemory(tmpDir, '[char]+?');
    expect(res2.length).toBeGreaterThan(0);
  });
});
