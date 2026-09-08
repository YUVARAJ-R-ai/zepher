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

export interface ParsedSkillMetadata {
  name?: string;
  description?: string;
  version?: string;
  trigger?: string;
}

export function parseSkillMetadata(content: string): ParsedSkillMetadata {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    const name = content.match(/^name:\s*([a-zA-Z0-9_.-]+)/m)?.[1]?.trim();
    const desc = content.match(/^description:\s*([^\r\n]+)/m)?.[1]?.trim();
    const ver = content.match(/^version:\s*["']?([^"'\r\n]+)["']?/m)?.[1]?.trim();
    const trig = content.match(/^trigger:\s*([^\r\n]+)/m)?.[1]?.trim();
    return { name, description: desc, version: ver, trigger: trig };
  }
  const fmText = fmMatch[1];
  const name = fmText.match(/^name:\s*([a-zA-Z0-9_.-]+)/m)?.[1]?.trim();
  const desc = fmText.match(/^description:\s*([^\r\n]+)/m)?.[1]?.trim();
  const ver = fmText.match(/^version:\s*["']?([^"'\r\n]+)["']?/m)?.[1]?.trim();
  const trig = fmText.match(/^trigger:\s*([^\r\n]+)/m)?.[1]?.trim();
  return { name, description: desc, version: ver, trigger: trig };
}

export async function installSkillFromSource(
  source: string,
  options: { global?: boolean; projectRoot?: string; name?: string } = {}
): Promise<{ skillName: string; path: string; checksum: string; version?: string }> {
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

  // Parse skill metadata from frontmatter
  const meta = parseSkillMetadata(content);
  const finalName = options.name || meta.name || derivedName || 'unnamed-skill';
  const version = meta.version;

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
  const lockfile = loadLockfile(projectRoot, isGlobal);
  lockfile.skills[finalName] = {
    source,
    version,
    checksum,
    installedAt: new Date().toISOString(),
    scope: isGlobal ? 'global' : 'local'
  };
  saveLockfile(projectRoot, lockfile, isGlobal);

  return {
    skillName: finalName,
    path: skillFilePath,
    checksum,
    version
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
    const lockfile = loadLockfile(projectRoot, isGlobal);
    if (lockfile.skills[name]) {
      delete lockfile.skills[name];
      saveLockfile(projectRoot, lockfile, isGlobal);
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

// --- Multi-Agent Skill Harvester & Linker ---

import os from 'os';

export interface HarvestResult {
  discovered: Array<{ name: string; sourcePath: string; agent: string }>;
  harvested: string[];
  skipped: string[];
  destinationDir: string;
}

export function harvestAgentSkills(
  options: { global?: boolean; projectRoot?: string; overwrite?: boolean } = {}
): HarvestResult {
  const isGlobal = options.global !== false;
  const destDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, SKILLS_DIR);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const homedir = os.homedir();
  const searchLocations: Array<{ path: string; agent: string }> = [
    { path: path.join(homedir, '.gemini', 'config', 'skills'), agent: 'antigravity-config' },
    { path: path.join(homedir, '.gemini', 'antigravity-cli', 'skills'), agent: 'antigravity-cli' },
    { path: path.join(homedir, '.claude', 'skills'), agent: 'claude-code' }
  ];

  if (options.projectRoot) {
    searchLocations.push(
      { path: path.join(options.projectRoot, '.agents', 'skills'), agent: 'project-agents' },
      { path: path.join(options.projectRoot, '.claude', 'skills'), agent: 'project-claude' }
    );
  }

  const result: HarvestResult = {
    discovered: [],
    harvested: [],
    skipped: [],
    destinationDir: destDir
  };

  const projectRoot = options.projectRoot || process.cwd();
  const lockfile = loadLockfile(projectRoot, isGlobal);

  for (const loc of searchLocations) {
    if (!fs.existsSync(loc.path)) continue;

    const entries = fs.readdirSync(loc.path);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue; // Ignore hidden directories (.antigravitycli, etc.)

      const fullSkillDir = path.join(loc.path, entry);
      try {
        const stat = fs.statSync(fullSkillDir);
        if (!stat.isDirectory()) continue;

        const skillMd = path.join(fullSkillDir, 'SKILL.md');
        if (!fs.existsSync(skillMd)) continue; // Must be a valid skill directory

        result.discovered.push({ name: entry, sourcePath: fullSkillDir, agent: loc.agent });

        const targetDir = path.join(destDir, entry);

        if (!fs.existsSync(targetDir) || options.overwrite) {
          fs.cpSync(fullSkillDir, targetDir, { recursive: true });
          if (!result.harvested.includes(entry)) {
            result.harvested.push(entry);
          }

          // Compute lockfile entry with version & checksum
          const content = fs.readFileSync(skillMd, 'utf-8');
          const checksum = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
          const meta = parseSkillMetadata(content);
          lockfile.skills[entry] = {
            source: fullSkillDir,
            version: meta.version,
            checksum,
            installedAt: new Date().toISOString(),
            scope: isGlobal ? 'global' : 'local'
          };
        } else {
          if (!result.skipped.includes(entry)) {
            result.skipped.push(entry);
          }
        }
      } catch {
        // Skip unreadable
      }
    }
  }

  saveLockfile(projectRoot, lockfile, isGlobal);
  return result;
}

export interface LinkResult {
  linkedCount: number;
  targets: Array<{ agent: string; path: string; status: string }>;
  errors: string[];
}

export function linkAgentSkills(
  options: { global?: boolean; copy?: boolean } = {}
): LinkResult {
  const sourceDir = path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR);
  if (!fs.existsSync(sourceDir)) {
    return { linkedCount: 0, targets: [], errors: ['No global skills found in ~/.zepher/skills/ to link.'] };
  }

  const homedir = os.homedir();
  const agentTargetDirs = [
    { name: 'antigravity', dir: path.join(homedir, '.gemini', 'config', 'skills') },
    { name: 'claude', dir: path.join(homedir, '.claude', 'skills') }
  ];

  const result: LinkResult = {
    linkedCount: 0,
    targets: [],
    errors: []
  };

  const skills = fs.readdirSync(sourceDir).filter(s => {
    return !s.startsWith('.') && fs.existsSync(path.join(sourceDir, s, 'SKILL.md'));
  });

  for (const agent of agentTargetDirs) {
    if (!fs.existsSync(agent.dir)) {
      try {
        fs.mkdirSync(agent.dir, { recursive: true });
      } catch (err: any) {
        result.errors.push(`Could not create ${agent.dir}: ${err.message}`);
        continue;
      }
    }

    // Clean up junk files in target directory
    const junkPath = path.join(agent.dir, '.antigravitycli');
    if (fs.existsSync(junkPath)) {
      try { fs.rmSync(junkPath, { recursive: true, force: true }); } catch {}
    }

    for (const skillName of skills) {
      const srcSkillPath = path.join(sourceDir, skillName);
      const destSkillPath = path.join(agent.dir, skillName);

      try {
        if (fs.existsSync(destSkillPath)) {
          const lstat = fs.lstatSync(destSkillPath);
          if (lstat.isSymbolicLink()) {
            const target = fs.readlinkSync(destSkillPath);
            if (target === srcSkillPath) {
              result.targets.push({ agent: agent.name, path: destSkillPath, status: 'already-linked' });
              continue;
            }
            fs.unlinkSync(destSkillPath);
          } else if (options.copy) {
            fs.cpSync(srcSkillPath, destSkillPath, { recursive: true });
            result.targets.push({ agent: agent.name, path: destSkillPath, status: 'copied' });
            result.linkedCount++;
            continue;
          } else {
            fs.rmSync(destSkillPath, { recursive: true, force: true });
          }
        }

        if (options.copy) {
          fs.cpSync(srcSkillPath, destSkillPath, { recursive: true });
          result.targets.push({ agent: agent.name, path: destSkillPath, status: 'copied' });
        } else {
          fs.symlinkSync(srcSkillPath, destSkillPath, 'dir');
          result.targets.push({ agent: agent.name, path: destSkillPath, status: 'symlinked' });
        }
        result.linkedCount++;
      } catch (err: any) {
        result.errors.push(`Failed to link ${skillName} in ${agent.name}: ${err.message}`);
      }
    }
  }

  return result;
}

// --- Skill Versioning, Updates & Pinning ---

export interface UpdateSkillResult {
  skillName: string;
  updated: boolean;
  reason?: string;
  oldVersion?: string;
  newVersion?: string;
  oldChecksum?: string;
  newChecksum?: string;
  source?: string;
}

export async function updateSkill(
  name: string,
  options: { global?: boolean; projectRoot?: string } = {}
): Promise<UpdateSkillResult> {
  const projectRoot = options.projectRoot || process.cwd();

  // If scope not explicitly specified, check local first then global
  let isGlobal = options.global;
  if (isGlobal === undefined) {
    const localLock = loadLockfile(projectRoot, false);
    if (localLock.skills[name]) {
      isGlobal = false;
    } else {
      const globalLock = loadLockfile(projectRoot, true);
      if (globalLock.skills[name]) {
        isGlobal = true;
      } else {
        isGlobal = false;
      }
    }
  }

  const baseDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR)
    : path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);

  const lockfile = loadLockfile(projectRoot, isGlobal);
  const entry = lockfile.skills[name];
  const skillDir = path.join(baseDir, name);
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillDir) && !entry) {
    return {
      skillName: name,
      updated: false,
      reason: `Skill "${name}" is not installed in ${isGlobal ? 'global' : 'local'} scope.`
    };
  }

  const source = entry?.source;
  if (!source) {
    return {
      skillName: name,
      updated: false,
      reason: `No source recorded in lockfile for skill "${name}". Re-install with "zepher skill install <source>".`
    };
  }

  const oldChecksum = entry.checksum || (fs.existsSync(skillMdPath) ? crypto.createHash('sha256').update(fs.readFileSync(skillMdPath, 'utf-8')).digest('hex').slice(0, 12) : undefined);
  const oldVersion = entry.version;

  let newContent = '';
  if (source.startsWith('http://') || source.startsWith('https://')) {
    let fetchUrl = source;
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
      return {
        skillName: name,
        updated: false,
        reason: `Failed to fetch latest content from ${fetchUrl} (status: ${res.status})`,
        source
      };
    }
    newContent = await res.text();
  } else {
    // Local source
    const resolvedSource = path.resolve(source);
    let srcFile = resolvedSource;
    if (fs.existsSync(resolvedSource) && fs.statSync(resolvedSource).isDirectory()) {
      srcFile = path.join(resolvedSource, 'SKILL.md');
    }
    if (!fs.existsSync(srcFile)) {
      return {
        skillName: name,
        updated: false,
        reason: `Source path no longer exists: ${srcFile}`,
        source
      };
    }
    newContent = fs.readFileSync(srcFile, 'utf-8');
  }

  const newChecksum = crypto.createHash('sha256').update(newContent).digest('hex').slice(0, 12);
  const meta = parseSkillMetadata(newContent);
  const newVersion = meta.version;

  if (oldChecksum && newChecksum === oldChecksum && oldVersion === newVersion) {
    return {
      skillName: name,
      updated: false,
      reason: 'Already up to date',
      oldVersion,
      newVersion,
      oldChecksum,
      newChecksum,
      source
    };
  }

  // Update files
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  if (!source.startsWith('http://') && !source.startsWith('https://') && fs.existsSync(source) && fs.statSync(source).isDirectory()) {
    fs.cpSync(source, skillDir, { recursive: true });
  } else {
    fs.writeFileSync(skillMdPath, newContent, 'utf-8');
  }

  // Update lockfile
  lockfile.skills[name] = {
    source,
    version: newVersion || oldVersion,
    checksum: newChecksum,
    installedAt: new Date().toISOString(),
    scope: isGlobal ? 'global' : 'local'
  };
  saveLockfile(projectRoot, lockfile, isGlobal);

  return {
    skillName: name,
    updated: true,
    oldVersion,
    newVersion: newVersion || oldVersion,
    oldChecksum,
    newChecksum,
    source
  };
}

export async function updateAllSkills(
  options: { global?: boolean; projectRoot?: string } = {}
): Promise<UpdateSkillResult[]> {
  const isGlobal = Boolean(options.global);
  const projectRoot = options.projectRoot || process.cwd();
  const lockfile = loadLockfile(projectRoot, isGlobal);
  const skillNames = Object.keys(lockfile.skills);

  const results: UpdateSkillResult[] = [];
  for (const name of skillNames) {
    const res = await updateSkill(name, { ...options, global: isGlobal });
    results.push(res);
  }
  return results;
}

export interface PinSkillResult {
  skillName: string;
  success: boolean;
  message: string;
  path?: string;
  version?: string;
  checksum?: string;
}

export function pinSkill(
  name: string,
  options: { projectRoot?: string } = {}
): PinSkillResult {
  const projectRoot = options.projectRoot || process.cwd();
  const globalSkillDir = path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR, name);
  const localSkillsDir = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);
  const localSkillDir = path.join(localSkillsDir, name);

  if (!fs.existsSync(globalSkillDir)) {
    return {
      skillName: name,
      success: false,
      message: `Skill "${name}" is not installed in global ~/.zepher/skills/`
    };
  }

  if (!fs.existsSync(localSkillsDir)) {
    fs.mkdirSync(localSkillsDir, { recursive: true });
  }

  // Copy directory recursively
  fs.cpSync(globalSkillDir, localSkillDir, { recursive: true });

  const skillMd = path.join(localSkillDir, 'SKILL.md');
  let checksum = '';
  let version: string | undefined;

  if (fs.existsSync(skillMd)) {
    const content = fs.readFileSync(skillMd, 'utf-8');
    checksum = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
    version = parseSkillMetadata(content).version;
  }

  // Update local lockfile
  const localLockfile = loadLockfile(projectRoot, false);
  const globalLockfile = loadLockfile(projectRoot, true);
  const globalEntry = globalLockfile.skills[name];

  localLockfile.skills[name] = {
    source: globalEntry?.source || globalSkillDir,
    version: version || globalEntry?.version,
    checksum: checksum || globalEntry?.checksum || '',
    installedAt: new Date().toISOString(),
    scope: 'local'
  };
  saveLockfile(projectRoot, localLockfile, false);

  return {
    skillName: name,
    success: true,
    message: `Pinned skill "${name}"${version ? ` (v${version})` : ''} into .zepher/skills/`,
    path: localSkillDir,
    version: version || globalEntry?.version,
    checksum
  };
}

export function unpinSkill(
  name: string,
  options: { projectRoot?: string } = {}
): { skillName: string; success: boolean; message: string } {
  const projectRoot = options.projectRoot || process.cwd();
  const localSkillDir = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR, name);

  if (!fs.existsSync(localSkillDir)) {
    return {
      skillName: name,
      success: false,
      message: `Skill "${name}" is not pinned in project .zepher/skills/`
    };
  }

  fs.rmSync(localSkillDir, { recursive: true, force: true });

  const localLockfile = loadLockfile(projectRoot, false);
  if (localLockfile.skills[name]) {
    delete localLockfile.skills[name];
    saveLockfile(projectRoot, localLockfile, false);
  }

  return {
    skillName: name,
    success: true,
    message: `Unpinned skill "${name}". Project now inherits global version.`
  };
}
