import fs from 'fs';
import path from 'path';
import { containsSecret } from './secrets.js';
import { ZEPHER_DIR, MEMORY_DIR } from '@zepher/core';

export function saveMemory(projectRoot: string, type: string, content: string): boolean {
  if (containsSecret(content)) {
    console.error(`Error: Potential secret detected. Memory write rejected.`);
    return false;
  }

  const memoryPath = path.join(projectRoot, ZEPHER_DIR, MEMORY_DIR, `${type}.md`);
  
  if (!fs.existsSync(memoryPath)) {
    console.error(`Error: Memory type ${type} does not exist.`);
    return false;
  }
  
  const timestamp = new Date().toISOString();
  const memoryEntry = `\n## [${timestamp}]\n${content}\n`;
  
  fs.appendFileSync(memoryPath, memoryEntry);
  return true;
}

export function readMemory(projectRoot: string, type: string): string {
  const memoryPath = path.join(projectRoot, ZEPHER_DIR, MEMORY_DIR, `${type}.md`);
  if (!fs.existsSync(memoryPath)) {
    return `Memory type ${type} not found.`;
  }
  return fs.readFileSync(memoryPath, 'utf-8');
}
