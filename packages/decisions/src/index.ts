import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, DECISIONS_DIR } from '@zepher/core';

export function createDecision(projectRoot: string, title: string): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, DECISIONS_DIR);
  
  // Find next ADR number
  let nextNum = 1;
  if (fs.existsSync(dirPath)) {
    const existing = fs.readdirSync(dirPath).filter(f => f.startsWith('ADR-'));
    if (existing.length > 0) {
      const maxNum = Math.max(...existing.map(f => parseInt(f.substring(4, 8), 10) || 0));
      nextNum = maxNum + 1;
    }
  }

  const numStr = nextNum.toString().padStart(4, '0');
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `ADR-${numStr}-${safeTitle}.md`;
  
  const content = `# ADR-${numStr}: ${title}

## Status
Proposed

## Context

## Decision

## Alternatives

## Tradeoffs

## Consequences

## Date
${new Date().toISOString().split('T')[0]}
`;

  fs.writeFileSync(path.join(dirPath, fileName), content);
  return fileName;
}
