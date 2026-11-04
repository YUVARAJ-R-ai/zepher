import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { trackVaultFile, sealVault, trackAsset, stashLocalAsset, saveVaultConfig, loadVaultConfig, saveAssetsLockfile } from '@zepher/core';
import { generateContext } from './index.js';

describe('generateContext vault & asset section', () => {
  let root: string;
  const write = (rel: string, data: string): void => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), data);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-context-test-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('omits the section when neither file exists', () => {
    expect(generateContext(root)).not.toContain('Team Vault & Asset Status');
  });

  it('reports sealed and clean secrets', () => {
    write('.env', 'A=1');
    trackVaultFile(root, '.env');
    write('a.env', 'B=2');
    trackVaultFile(root, 'a.env');
    sealVault(root, 'pw');
    const out = generateContext(root);
    expect(out).toContain('## Team Vault & Asset Status\n- Tracked Secrets: 2 (All sealed & clean)');
    expect(out).not.toContain('Tracked Assets');
    expect(out.indexOf('Team Vault')).toBeLessThan(out.indexOf('## Next Steps'));
  });

  it('lists dirty and unsealed secrets', () => {
    write('.env', 'A=1');
    trackVaultFile(root, '.env');
    sealVault(root, 'pw');
    write('.env', 'A=changed');
    const cfg = loadVaultConfig(root);
    cfg.items.push({ path: 'db/seed.sql', type: 'seed' });
    saveVaultConfig(root, cfg);
    const out = generateContext(root);
    expect(out).toContain('- Tracked Secrets: 2 (1 dirty: .env, 1 unsealed: db/seed.sql)');
    expect(out).not.toContain('A=changed');
  });

  it('reports assets with and without tag, present and missing', () => {
    write('data/dataset.csv', 'x');
    trackAsset(root, 'data/dataset.csv', { tag: 'v1.0' });
    stashLocalAsset(root, 'data/dataset.csv');
    write('other.bin', 'y');
    trackAsset(root, 'other.bin', {});
    const out = generateContext(root);
    expect(out).toContain('- Tracked Assets: 2 (data/dataset.csv [v1.0] - blob present; other.bin - blob missing)');
    expect(out).not.toContain('Tracked Secrets');
  });

  it('reports zero counts for empty files', () => {
    saveVaultConfig(root, { version: '1.0', members: [], items: [] });
    saveAssetsLockfile(root, { version: '1.0', assets: {} });
    const out = generateContext(root);
    expect(out).toContain('- Tracked Secrets: 0\n');
    expect(out).toContain('- Tracked Assets: 0\n');
  });

  it('does not crash on a vault item without path or an asset without location', () => {
    write('.zepher/vault.config.yaml', 'version: "1.0"\nmembers: []\nitems:\n  - type: secret\n');
    write('.zepher/assets.lock.yaml', 'version: "1.0"\nassets:\n  a.bin:\n    sha256: abc\n');
    expect(generateContext(root)).toContain('- Vault/asset status unavailable:');
  });

  it('does not crash on an unreadable tracked file', () => {
    if (process.getuid?.() === 0) return; // root ignores file modes
    write('.env', 'A=1');
    trackVaultFile(root, '.env');
    sealVault(root, 'pw');
    fs.chmodSync(path.join(root, '.env'), 0o000);
    try {
      expect(generateContext(root)).toContain('- Vault/asset status unavailable:');
    } finally {
      fs.chmodSync(path.join(root, '.env'), 0o644);
    }
  });
});
