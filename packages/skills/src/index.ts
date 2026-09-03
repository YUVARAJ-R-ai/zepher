import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  ZEPHER_DIR, GLOBAL_ZEPHER_DIR, SKILLS_DIR, 
  loadSkillsFromDir, loadLockfile, saveLockfile, SkillMeta 
} from '@zepher/core';

export function installSkill(projectRoot: string, name: string, content: string): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const targetPath = path.join(dirPath, name);
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  const mdPath = path.join(targetPath, 'SKILL.md');
  fs.writeFileSync(mdPath, content);
  
  return mdPath;
}

export async function installSkillFromSource(
  source: string,
  options: { global?: boolean; projectRoot?: string; name?: string } = {}
): Promise<{ skillName: string; path: string; checksum: string }> {
  const isGlobal = Boolean(options.global);
  const baseDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, SKILLS_DIR);

  let content = '';
  let derivedName = options.name;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    let fetchUrl = source;
    // Handle github repository/blob url to raw conversion
    if (fetchUrl.includes('github.com') && !fetchUrl.includes('raw.githubusercontent.com')) {
      fetchUrl = fetchUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
      if (!fetchUrl.endsWith('.md') && !fetchUrl.endsWith('SKILL.md')) {
        fetchUrl = fetchUrl.replace(/\/$/, '') + '/main/SKILL.md';
      }
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch skill from ${fetchUrl} (status: ${res.status})`);
    }
    content = await res.text();

    if (!derivedName) {
      const urlParts = source.replace(/\/$/, '').split('/');
      const lastPart = urlParts[urlParts.length - 1];
      derivedName = lastPart.replace(/\.md$/, '').replace(/^SKILL$/, urlParts[urlParts.length - 2] || 'skill');
    }
  } else {
    // Local path
    const resolvedPath = path.resolve(source);
    let skillFile = resolvedPath;
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      skillFile = path.join(resolvedPath, 'SKILL.md');
    }

    if (!fs.existsSync(skillFile)) {
      throw new Error(`Skill file not found at ${skillFile}`);
    }

    content = fs.readFileSync(skillFile, 'utf-8');
    if (!derivedName) {
      derivedName = path.basename(path.dirname(skillFile));
      if (derivedName === '.' || derivedName === SKILLS_DIR) {
        derivedName = path.basename(skillFile, '.md');
      }
    }
  }

  // Parse skill name from frontmatter if not specified
  const nameMatch = content.match(/^name:\s*([a-zA-Z0-9_-]+)/m);
  const finalName = derivedName || (nameMatch ? nameMatch[1] : 'unnamed-skill');

  const targetDir = path.join(baseDir, finalName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const skillFilePath = path.join(targetDir, 'SKILL.md');
  fs.writeFileSync(skillFilePath, content, 'utf-8');

  // Compute checksum
  const checksum = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);

  // Update lockfile
  const projectRoot = options.projectRoot || process.cwd();
  const lockfile = loadLockfile(projectRoot);
  lockfile.skills[finalName] = {
    source,
    checksum,
    installedAt: new Date().toISOString(),
    scope: isGlobal ? 'global' : 'local'
  };
  saveLockfile(projectRoot, lockfile);

  return {
    skillName: finalName,
    path: skillFilePath,
    checksum
  };
}

export function listAllSkills(projectRoot: string): { global: SkillMeta[]; local: SkillMeta[] } {
  const globalDir = path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR);
  const localDir = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);

  return {
    global: loadSkillsFromDir(globalDir, 'global'),
    local: loadSkillsFromDir(localDir, 'local')
  };
}

export function removeSkill(name: string, options: { global?: boolean; projectRoot?: string } = {}): boolean {
  const isGlobal = Boolean(options.global);
  const baseDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, SKILLS_DIR);

  const skillDir = path.join(baseDir, name);
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });

    // Update lockfile
    const projectRoot = options.projectRoot || process.cwd();
    const lockfile = loadLockfile(projectRoot);
    if (lockfile.skills[name]) {
      delete lockfile.skills[name];
      saveLockfile(projectRoot, lockfile);
    }
    return true;
  }
  return false;
}

export function getFrontendSkillContent(): string {
  return `---
name: frontend
description: Generates production-grade frontend features without AI slop
---

# Frontend Skill

This skill helps AI agents write high-quality frontend code.

## Procedure
1. Define Requirements
2. Map User Roles
3. Design Information Architecture
4. Create Screen Inventory
5. Interaction Model
6. Visual Direction
7. Prototype
8. Implementation

## Anti-patterns
- generic gradients
- random cards
- meaningless glassmorphism
- AI-slop aesthetics

## Output
Clean, hierarchical, task-oriented screens with consistent typography.
`;
}
