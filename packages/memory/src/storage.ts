import fs from 'fs';
import path from 'path';
import { containsSecret } from './secrets.js';
import { ZEPHER_DIR, GLOBAL_ZEPHER_DIR, MEMORY_DIR } from '@zepher/core';

export function saveMemory(
  projectRoot: string,
  type: string,
  content: string,
  options: { global?: boolean } | boolean = false
): boolean {
  const isGlobal = typeof options === 'boolean' ? options : Boolean(options?.global);
  if (containsSecret(content)) {
    console.error(`Error: Potential secret detected. Memory write rejected.`);
    return false;
  }

  const baseDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, MEMORY_DIR)
    : path.join(projectRoot, ZEPHER_DIR, MEMORY_DIR);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const memoryPath = path.join(baseDir, `${type}.md`);
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, `# ${type.charAt(0).toUpperCase() + type.slice(1)} Memory\n`, 'utf-8');
  }

  const existingContent = fs.readFileSync(memoryPath, 'utf-8');

  // Basic conflict detection
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('Database =') && existingContent.includes('Database =') && !existingContent.includes(line)) {
      console.log(`Potential memory conflict detected:\nExisting contains Database definition.\nAction required: Confirm which is authoritative.`);
      return false; // Reject silent overwrite
    }
  }

  const timestamp = new Date().toISOString();
  const memoryEntry = `\n## [${timestamp}]\n${content}\n`;
  fs.appendFileSync(memoryPath, memoryEntry);
  return true;
}

export function readMemory(
  projectRoot: string,
  type: string,
  options: { global?: boolean } | boolean = false
): string {
  const isGlobal = typeof options === 'boolean' ? options : Boolean(options?.global);
  const baseDir = isGlobal
    ? path.join(GLOBAL_ZEPHER_DIR, MEMORY_DIR)
    : path.join(projectRoot, ZEPHER_DIR, MEMORY_DIR);

  const memoryPath = path.join(baseDir, `${type}.md`);
  if (!fs.existsSync(memoryPath)) {
    return `Memory type ${type} not found.`;
  }
  return fs.readFileSync(memoryPath, 'utf-8');
}
