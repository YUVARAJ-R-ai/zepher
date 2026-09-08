import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, GLOBAL_ZEPHER_DIR, MEMORY_DIR, DECISIONS_DIR, SESSIONS_DIR, TASKS_DIR, HANDOFFS_DIR, RESEARCH_DIR } from '@zepher/core';

export interface SearchResult {
  file: string;
  scope: 'local' | 'global';
  relevance: number;
  content: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchMemory(
  projectRoot: string,
  query: string,
  options: { includeGlobal?: boolean } = { includeGlobal: true }
): SearchResult[] {
  const dirsToSearch = [MEMORY_DIR, DECISIONS_DIR, SESSIONS_DIR, TASKS_DIR, HANDOFFS_DIR, RESEARCH_DIR];
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const safeRegex = new RegExp(escapeRegExp(queryLower), 'gi');

  // 1. Search local project
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  for (const dir of dirsToSearch) {
    const dirPath = path.join(zepherPath, dir);
    if (fs.existsSync(dirPath)) {
      searchInDirectory(dirPath, queryLower, safeRegex, 'local', results);
    }
  }

  // 2. Search global memory if enabled and not redundant
  if (options.includeGlobal !== false && fs.existsSync(GLOBAL_ZEPHER_DIR) && path.resolve(projectRoot) !== path.resolve(GLOBAL_ZEPHER_DIR)) {
    for (const dir of [MEMORY_DIR, RESEARCH_DIR]) {
      const globalDirPath = path.join(GLOBAL_ZEPHER_DIR, dir);
      if (fs.existsSync(globalDirPath)) {
        searchInDirectory(globalDirPath, queryLower, safeRegex, 'global', results);
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

function searchInDirectory(
  dirPath: string,
  queryLower: string,
  safeRegex: RegExp,
  scope: 'local' | 'global',
  results: SearchResult[]
) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      searchInDirectory(fullPath, queryLower, safeRegex, scope, results);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lower = content.toLowerCase();
      if (lower.includes(queryLower)) {
        const matches = content.match(safeRegex);
        const occurrences = matches ? matches.length : 1;

        // Extract snippet centered around first occurrence
        const index = lower.indexOf(queryLower);
        const start = Math.max(0, index - 60);
        const end = Math.min(content.length, index + queryLower.length + 100);
        let snippet = content.substring(start, end).replace(/\r?\n/g, ' ').trim();
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        results.push({
          file: fullPath,
          scope,
          relevance: occurrences,
          content: snippet
        });
      }
    }
  }
}
