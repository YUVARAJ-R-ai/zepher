import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { 
  ZEPHER_DIR, GLOBAL_ZEPHER_DIR, RULES_DIR, SKILLS_DIR, HOOKS_DIR, LOCKFILE_NAME 
} from './constants.js';
import { 
  UnifiedZepherState, Rule, SkillMeta, Hook, ZepherLockfile, ProjectMetadata 
} from './types.js';

function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    try {
      const data = yaml.parse(match[1]) || {};
      return { data, content: match[2].trim() };
    } catch {
      return { data: {}, content: raw.trim() };
    }
  }
  return { data: {}, content: raw.trim() };
}

export function loadRulesFromDir(dirPath: string, scope: 'global' | 'local'): Rule[] {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  const rules: Rule[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf-8');
    const baseId = path.basename(file, ext);

    if (ext === '.yaml' || ext === '.yml') {
      try {
        const parsed = yaml.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.content) {
              rules.push({
                id: item.id || `${baseId}-${rules.length}`,
                title: item.title || item.id || baseId,
                content: item.content,
                tags: item.tags || [],
                priority: typeof item.priority === 'number' ? item.priority : 50,
                scope,
                sourceFile: file,
                override: Boolean(item.override)
              });
            }
          }
        } else if (parsed && parsed.content) {
          rules.push({
            id: parsed.id || baseId,
            title: parsed.title || baseId,
            content: parsed.content,
            tags: parsed.tags || [],
            priority: typeof parsed.priority === 'number' ? parsed.priority : 50,
            scope,
            sourceFile: file,
            override: Boolean(parsed.override)
          });
        }
      } catch {
        // Skip invalid yaml
      }
    } else if (ext === '.md' || ext === '.txt') {
      const { data, content } = parseFrontmatter(raw);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = data.title || (titleMatch ? titleMatch[1] : baseId);

      rules.push({
        id: data.id || baseId,
        title,
        content,
        tags: Array.isArray(data.tags) ? data.tags : [],
        priority: typeof data.priority === 'number' ? data.priority : 50,
        scope,
        sourceFile: file,
        override: Boolean(data.override)
      });
    }
  }

  return rules;
}

export function loadSkillsFromDir(dirPath: string, scope: 'global' | 'local'): SkillMeta[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath);
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    const skillDir = path.join(dirPath, entry);
    if (!fs.statSync(skillDir).isDirectory()) continue;

    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const raw = fs.readFileSync(skillFile, 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const name = data.name || entry;
    const description = data.description || (titleMatch ? titleMatch[1] : name);

    skills.push({
      name,
      description,
      trigger: data.trigger,
      scope,
      path: skillDir,
      content: raw
    });
  }

  return skills;
}

export function loadHooksFromDir(dirPath: string, scope: 'global' | 'local'): Hook[] {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  const hooks: Hook[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (!fs.statSync(filePath).isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') continue;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = ext === '.json' ? JSON.parse(raw) : yaml.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.hooks;
      if (Array.isArray(list)) {
        for (const h of list) {
          if (h && h.run && h.stage) {
            hooks.push({
              name: h.name || `${path.basename(file, ext)}-${hooks.length}`,
              stage: h.stage,
              run: h.run,
              scope
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return hooks;
}

export function loadLockfile(projectRoot: string): ZepherLockfile {
  const lockPath = path.join(projectRoot, ZEPHER_DIR, LOCKFILE_NAME);
  if (fs.existsSync(lockPath)) {
    try {
      const raw = fs.readFileSync(lockPath, 'utf-8');
      return yaml.parse(raw) as ZepherLockfile;
    } catch {
      // Fallback
    }
  }
  return { version: '1.0', skills: {} };
}

export function saveLockfile(projectRoot: string, lockfile: ZepherLockfile): void {
  const lockPath = path.join(projectRoot, ZEPHER_DIR, LOCKFILE_NAME);
  fs.writeFileSync(lockPath, yaml.stringify(lockfile), 'utf-8');
}

export async function resolveUnifiedState(projectRoot: string): Promise<UnifiedZepherState> {
  const globalRulesDir = path.join(GLOBAL_ZEPHER_DIR, RULES_DIR);
  const localRulesDir = path.join(projectRoot, ZEPHER_DIR, RULES_DIR);

  const globalRules = loadRulesFromDir(globalRulesDir, 'global');
  const localRules = loadRulesFromDir(localRulesDir, 'local');

  // Merge rules: local overrides global with same id
  const ruleMap = new Map<string, Rule>();
  for (const r of globalRules) {
    ruleMap.set(r.id, r);
  }
  for (const r of localRules) {
    ruleMap.set(r.id, r); // local wins / overrides
  }

  // Sort by priority descending (higher number = higher priority), then title
  const mergedRules = Array.from(ruleMap.values()).sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pb !== pa) return pb - pa;
    return a.title.localeCompare(b.title);
  });

  // Skills
  const globalSkillsDir = path.join(GLOBAL_ZEPHER_DIR, SKILLS_DIR);
  const localSkillsDir = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);

  const globalSkills = loadSkillsFromDir(globalSkillsDir, 'global');
  const localSkills = loadSkillsFromDir(localSkillsDir, 'local');

  const skillMap = new Map<string, SkillMeta>();
  for (const s of globalSkills) {
    skillMap.set(s.name, s);
  }
  for (const s of localSkills) {
    skillMap.set(s.name, s); // local shadows global
  }
  const mergedSkills = Array.from(skillMap.values());

  // Hooks
  const globalHooksDir = path.join(GLOBAL_ZEPHER_DIR, HOOKS_DIR);
  const localHooksDir = path.join(projectRoot, ZEPHER_DIR, HOOKS_DIR);

  const globalHooks = loadHooksFromDir(globalHooksDir, 'global');
  const localHooks = loadHooksFromDir(localHooksDir, 'local');
  const mergedHooks = [...globalHooks, ...localHooks];

  // Lockfile
  const lockfile = loadLockfile(projectRoot);

  // Project meta
  const projectName = path.basename(projectRoot);
  const project: ProjectMetadata = {
    name: projectName,
    root: projectRoot
  };

  return {
    project,
    rules: mergedRules,
    skills: mergedSkills,
    hooks: mergedHooks,
    lockfile
  };
}
