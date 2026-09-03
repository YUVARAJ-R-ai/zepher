import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, CONTEXT_DIR, MEMORY_DIR } from '@zepher/core';

export function generateContext(projectRoot: string): string {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  const contextPath = path.join(zepherPath, CONTEXT_DIR, 'current.md');
  
  const readMem = (file: string) => {
    const p = path.join(zepherPath, MEMORY_DIR, file);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
  };
  
  const project = readMem('project.md');
  const arch = readMem('architecture.md');
  const constraints = readMem('constraints.md');
  
  // Here we would also load tasks, decisions, etc.
  
  const content = `# Current Context

## Project
${project}

## Architecture
${arch}

## Constraints
${constraints}

## Recent Work
(No recent handoffs recorded)

## Known Problems
(No current blockers)

## Next Steps
Check active tasks.
`;
  
  fs.writeFileSync(contextPath, content);
  return content;
}
