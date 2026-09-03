import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR } from './constants.js';

export function runDoctor(projectRoot: string) {
  console.log('Running Zepher Doctor...\n');
  
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  const isInit = fs.existsSync(zepherPath);
  
  console.log(isInit ? '✓ Zepher initialized' : '✗ Zepher not initialized');
  console.log('✓ Node.js (' + process.version + ')');
  console.log(fs.existsSync(path.join(projectRoot, '.git')) ? '✓ Git repository' : '✗ Not a Git repository');
  
  console.log(fs.existsSync(path.join(projectRoot, 'AGENTS.md')) ? '✓ AGENTS.md' : '✗ AGENTS.md missing');
  
  console.log('~ codebase-memory-mcp (optional)');
  console.log('~ Graphify (optional)');
}
