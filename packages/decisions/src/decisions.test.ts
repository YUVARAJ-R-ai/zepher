import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDecision, listDecisions, getDecision } from './index.js';
import { ZEPHER_DIR, DECISIONS_DIR } from '@zepher/core';

describe('Decisions / ADR Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-adr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates ADR files with incrementing IDs and retrieves them', () => {
    const file1 = createDecision(tmpDir, 'Use PostgreSQL for database', {
      status: 'Accepted',
      context: 'Need relational consistency',
      decision: 'Adopt Postgres 16',
      alternatives: 'MongoDB, SQLite'
    });
    expect(file1).toBe('ADR-0001-use-postgresql-for-database.md');

    const file2 = createDecision(tmpDir, 'Use Redis for caching', {
      status: 'Proposed',
      decision: 'Cache sessions in Redis'
    });
    expect(file2).toBe('ADR-0002-use-redis-for-caching.md');

    const list = listDecisions(tmpDir);
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('ADR-0001');
    expect(list[0].status).toBe('Accepted');
    expect(list[1].id).toBe('ADR-0002');
    expect(list[1].status).toBe('Proposed');

    const adr1 = getDecision(tmpDir, 'ADR-0001');
    expect(adr1).not.toBeNull();
    expect(adr1?.content).toContain('Adopt Postgres 16');

    const adr2BySlug = getDecision(tmpDir, 'redis');
    expect(adr2BySlug).not.toBeNull();
    expect(adr2BySlug?.fileName).toBe('ADR-0002-use-redis-for-caching.md');
  });

  it('returns null when decision does not exist', () => {
    const result = getDecision(tmpDir, 'ADR-9999');
    expect(result).toBeNull();
  });
});
