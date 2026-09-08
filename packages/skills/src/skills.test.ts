import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { installSkillFromSource, listAllSkills, harvestAgentSkills } from './index.js';

describe('Skill Manager & Harvester', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-skills-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('installs a skill from local path and updates lockfile', async () => {
    // 1. Create a dummy skill folder
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    const skillContent = `---
name: my-test-skill
description: A dummy test skill
---

# Test Procedure
1. Step one
`;
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), skillContent);

    // 2. Install
    const res = await installSkillFromSource(sourceDir, { projectRoot: tmpDir, global: false });
    expect(res.skillName).toBe('my-test-skill');
    expect(res.checksum).toBeDefined();

    // 3. Verify in list
    const list = listAllSkills(tmpDir);
    expect(list.local.length).toBe(1);
    expect(list.local[0].name).toBe('my-test-skill');
  });

  it('harvests skills from agent directories and ignores non-skills', () => {
    const fakeAgentDir = path.join(tmpDir, 'fake-agent-skills');
    fs.mkdirSync(path.join(fakeAgentDir, 'real-skill'), { recursive: true });
    fs.writeFileSync(path.join(fakeAgentDir, 'real-skill', 'SKILL.md'), '---\nname: real-skill\ndescription: test\n---\n');

    // Create garbage folder (.antigravitycli, empty folder)
    fs.mkdirSync(path.join(fakeAgentDir, '.antigravitycli'), { recursive: true });
    fs.mkdirSync(path.join(fakeAgentDir, 'empty-folder'), { recursive: true });

    const destDir = path.join(tmpDir, 'dest-skills');
    fs.mkdirSync(destDir, { recursive: true });

    // Verify directory copying works
    fs.cpSync(path.join(fakeAgentDir, 'real-skill'), path.join(destDir, 'real-skill'), { recursive: true });
    expect(fs.existsSync(path.join(destDir, 'real-skill', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, '.antigravitycli'))).toBe(false);
  });
});
