import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, MEMORY_DIR, DECISIONS_DIR, SESSIONS_DIR, TASKS_DIR, HANDOFFS_DIR, RESEARCH_DIR } from '@zepher/core';

interface SearchResult {
  file: string;
  relevance: number;
  content: string;
}

export function searchMemory(projectRoot: string, query: string): SearchResult[] {
  const zepherPath = path.join(projectRoot, ZEPHER_DIR);
  const dirsToSearch = [MEMORY_DIR, DECISIONS_DIR, SESSIONS_DIR, TASKS_DIR, HANDOFFS_DIR, RESEARCH_DIR];
  
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const dir of dirsToSearch) {
    const dirPath = path.join(zepherPath, dir);
    if (fs.existsSync(dirPath)) {
      searchInDirectory(dirPath, queryLower, results);
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

function searchInDirectory(dirPath: string, queryLower: string, results: SearchResult[]) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      searchInDirectory(fullPath, queryLower, results);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.toLowerCase().includes(queryLower)) {
        // Basic relevance: count occurrences
        const occurrences = (content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        results.push({
          file: fullPath,
          relevance: occurrences,
          content: content.substring(0, 200) + '...' // Return a snippet
        });
      }
    }
  }
}
