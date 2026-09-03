import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZEPHER_DIR, GLOBAL_ZEPHER_DIR, RULES_DIR } from './constants.js';
import { Rule } from './types.js';
import { loadRulesFromDir } from './state-resolver.js';

export function addRule(
  options: {
    content: string;
    title?: string;
    id?: string;
    priority?: number;
    tags?: string[];
    global?: boolean;
    projectRoot?: string;
  }
): { filePath: string; rule: Rule } {
  const baseDir = options.global
    ? path.join(GLOBAL_ZEPHER_DIR, RULES_DIR)
    : path.join(options.projectRoot || process.cwd(), ZEPHER_DIR, RULES_DIR);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const cleanTitle = options.title || options.id || 'rule';
  const cleanId = (options.id || cleanTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')).replace(/^-|-$/g, '');
  const fileName = `${cleanId}.md`;
  const filePath = path.join(baseDir, fileName);

  const frontmatter = {
    id: cleanId,
    title: options.title || cleanId,
    priority: options.priority ?? 50,
    tags: options.tags || []
  };

  const fileContent = `---\n${yaml.stringify(frontmatter)}---\n\n${options.content.trim()}\n`;
  fs.writeFileSync(filePath, fileContent, 'utf-8');

  const rule: Rule = {
    id: cleanId,
    title: options.title || cleanId,
    content: options.content.trim(),
    tags: options.tags || [],
    priority: options.priority ?? 50,
    scope: options.global ? 'global' : 'local',
    sourceFile: fileName
  };

  return { filePath, rule };
}

export function listAllRules(projectRoot: string): { global: Rule[]; local: Rule[] } {
  const globalRulesDir = path.join(GLOBAL_ZEPHER_DIR, RULES_DIR);
  const localRulesDir = path.join(projectRoot, ZEPHER_DIR, RULES_DIR);

  return {
    global: loadRulesFromDir(globalRulesDir, 'global'),
    local: loadRulesFromDir(localRulesDir, 'local')
  };
}

export function removeRule(ruleId: string, global: boolean = false, projectRoot: string = process.cwd()): boolean {
  const baseDir = global
    ? path.join(GLOBAL_ZEPHER_DIR, RULES_DIR)
    : path.join(projectRoot, ZEPHER_DIR, RULES_DIR);

  if (!fs.existsSync(baseDir)) return false;

  const files = fs.readdirSync(baseDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    if (base === ruleId) {
      fs.unlinkSync(path.join(baseDir, file));
      return true;
    }
  }

  return false;
}
