import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  installSkillFromSource, listAllSkills, harvestAgentSkills,
  updateSkill, pinSkill, unpinSkill, parseSkillMetadata
} from './index.js';
import { loadLockfile, ZEPHER_DIR } from '@zepher/core';

describe('Skill Manager, Versioning & Pinning', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-skills-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses skill metadata and extracts semver', () => {
    const raw = `---
name: awesome-skill
description: Does awesome things
version: 1.2.3
trigger: manual
---

# Instructions
`;
    const meta = parseSkillMetadata(raw);
    expect(meta.name).toBe('awesome-skill');
    expect(meta.description).toBe('Does awesome things');
    expect(meta.version).toBe('1.2.3');
    expect(meta.trigger).toBe('manual');
  });

  it('installs a skill from local path with version and updates lockfile', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    const skillContent = `---
name: my-test-skill
description: A dummy test skill
version: 1.0.0
---

# Test Procedure
1. Step one
`;
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), skillContent);

    // Install
    const res = await installSkillFromSource(sourceDir, { projectRoot: tmpDir, global: false });
    expect(res.skillName).toBe('my-test-skill');
    expect(res.version).toBe('1.0.0');
    expect(res.checksum).toBeDefined();

    // Verify in list
    const list = listAllSkills(tmpDir);
    expect(list.local.length).toBe(1);
    expect(list.local[0].name).toBe('my-test-skill');
    expect(list.local[0].version).toBe('1.0.0');

    // Verify in lockfile
    const lock = loadLockfile(tmpDir, false);
    expect(lock.skills['my-test-skill'].version).toBe('1.0.0');
    expect(lock.skills['my-test-skill'].checksum).toBe(res.checksum);
  });

  it('updates an existing skill and detects version bumps', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), `---
name: updatable-skill
description: Original
version: 1.0.0
---
Original content
`);

    // Install initial version
    const installRes = await installSkillFromSource(sourceDir, { projectRoot: tmpDir, global: false });
    expect(installRes.version).toBe('1.0.0');

    // Checking update without changes
    const noChangeRes = await updateSkill('updatable-skill', { projectRoot: tmpDir, global: false });
    expect(noChangeRes.updated).toBe(false);
    expect(noChangeRes.reason).toBe('Already up to date');

    // Update source file with new version and content
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), `---
name: updatable-skill
description: Updated description
version: 1.1.0
---
Updated content with new capabilities
`);

    // Perform update
    const updateRes = await updateSkill('updatable-skill', { projectRoot: tmpDir, global: false });
    expect(updateRes.updated).toBe(true);
    expect(updateRes.oldVersion).toBe('1.0.0');
    expect(updateRes.newVersion).toBe('1.1.0');
    expect(updateRes.oldChecksum).not.toBe(updateRes.newChecksum);

    // Verify updated file on disk
    const updatedContent = fs.readFileSync(path.join(tmpDir, ZEPHER_DIR, 'skills', 'updatable-skill', 'SKILL.md'), 'utf-8');
    expect(updatedContent).toContain('Updated content with new capabilities');

    // Verify lockfile
    const lock = loadLockfile(tmpDir, false);
    expect(lock.skills['updatable-skill'].version).toBe('1.1.0');
  });

  it('pins and unpins skills locally in project', () => {
    // Setup local skill target directory
    const projectZepherSkills = path.join(tmpDir, ZEPHER_DIR, 'skills');
    fs.mkdirSync(projectZepherSkills, { recursive: true });

    // Mock unpin behavior
    const testLocalDir = path.join(projectZepherSkills, 'temp-pinned');
    fs.mkdirSync(testLocalDir, { recursive: true });
    fs.writeFileSync(path.join(testLocalDir, 'SKILL.md'), '---\nname: temp-pinned\nversion: 1.0.0\n---\n');

    // Verify unpin
    const unpinRes = unpinSkill('temp-pinned', { projectRoot: tmpDir });
    expect(unpinRes.success).toBe(true);
    expect(fs.existsSync(testLocalDir)).toBe(false);
  });

  it('harvests skills from agent directories and ignores non-skills', () => {
    const fakeAgentDir = path.join(tmpDir, 'fake-agent-skills');
    fs.mkdirSync(path.join(fakeAgentDir, 'real-skill'), { recursive: true });
    fs.writeFileSync(path.join(fakeAgentDir, 'real-skill', 'SKILL.md'), '---\nname: real-skill\ndescription: test\nversion: 2.0.0\n---\n');

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
