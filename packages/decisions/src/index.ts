import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, DECISIONS_DIR } from '@zepher/core';

export interface CreateDecisionOptions {
  status?: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
  context?: string;
  decision?: string;
  alternatives?: string;
  tradeoffs?: string;
  consequences?: string;
}

export interface DecisionSummary {
  id: string;
  fileName: string;
  title: string;
  status: string;
  date: string;
}

export function createDecision(projectRoot: string, title: string, options: CreateDecisionOptions = {}): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, DECISIONS_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Find next ADR number
  let nextNum = 1;
  const existing = fs.readdirSync(dirPath).filter(f => f.startsWith('ADR-'));
  if (existing.length > 0) {
    const maxNum = Math.max(...existing.map(f => parseInt(f.substring(4, 8), 10) || 0));
    nextNum = maxNum + 1;
  }

  const numStr = nextNum.toString().padStart(4, '0');
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `ADR-${numStr}-${safeTitle}.md`;

  const status = options.status || 'Proposed';
  const context = options.context || '';
  const decision = options.decision || '';
  const alternatives = options.alternatives || '';
  const tradeoffs = options.tradeoffs || '';
  const consequences = options.consequences || '';
  const date = new Date().toISOString().split('T')[0];

  const content = `# ADR-${numStr}: ${title}

## Status
${status}

## Context
${context}

## Decision
${decision}

## Alternatives
${alternatives}

## Tradeoffs
${tradeoffs}

## Consequences
${consequences}

## Date
${date}
`;

  fs.writeFileSync(path.join(dirPath, fileName), content, 'utf-8');
  return fileName;
}

export function listDecisions(projectRoot: string): DecisionSummary[] {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, DECISIONS_DIR);
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath)
    .filter(f => f.startsWith('ADR-') && f.endsWith('.md'))
    .sort();

  const results: DecisionSummary[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
    const titleMatch = content.match(/^# (ADR-\d+:\s*.+)$/m);
    const fullTitle = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
    const idMatch = file.match(/^(ADR-\d+)/);
    const id = idMatch ? idMatch[1] : file.substring(0, 8);
    const statusMatch = content.match(/^## Status\s*\n+([^\n]+)/m);
    const status = statusMatch ? statusMatch[1].trim() : 'Unknown';
    const dateMatch = content.match(/^## Date\s*\n+([^\n]+)/m);
    const date = dateMatch ? dateMatch[1].trim() : '';

    results.push({
      id,
      fileName: file,
      title: fullTitle,
      status,
      date
    });
  }
  return results;
}

export function getDecision(projectRoot: string, query: string): { fileName: string; title: string; content: string } | null {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, DECISIONS_DIR);
  if (!fs.existsSync(dirPath)) return null;

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
  const normalized = query.trim().toLowerCase();

  const matchedFile = files.find(f => {
    const low = f.toLowerCase();
    return (
      low === normalized ||
      low === `${normalized}.md` ||
      low.startsWith(normalized) ||
      low.includes(normalized)
    );
  });

  if (!matchedFile) return null;

  const content = fs.readFileSync(path.join(dirPath, matchedFile), 'utf-8');
  const titleMatch = content.match(/^# (ADR-\d+:\s*.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : matchedFile.replace(/\.md$/, '');

  return {
    fileName: matchedFile,
    title,
    content
  };
}

