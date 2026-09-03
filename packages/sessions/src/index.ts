import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, HANDOFFS_DIR } from '@zepher/core';

export function createHandoff(projectRoot: string): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, HANDOFFS_DIR);
  
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').substring(0, 16);
  const fileName = `${dateStr}.md`;
  
  const content = `# Agent Handoff

## Objective

## Completed

## Current State

## Important Discoveries

## Architecture Decisions

## Files Changed
(Run git status to see)

## Failed Approaches

## Known Problems

## Remaining Work

## Recommended Next Action
`;

  fs.writeFileSync(path.join(dirPath, fileName), content);
  return fileName;
}
