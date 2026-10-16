import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  encryptPayload, decryptPayload, 
  reconcileEnvFiles, generateSafeEnvSchema,
  trackVaultFile, sealVault, unsealVault, checkVaultDirtyStatus
} from './vault.js';
import { trackAsset, stashLocalAsset, restoreLocalAsset } from './assets.js';

describe('Zepher Team Vault & Asset Hub', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-vault-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('encrypts and decrypts payload using AES-256-GCM envelope', () => {
    const rawData = 'SECRET_API_KEY=sk_live_9988771122';
    const passphrase = 'super-secret-team-password';
    const envelope = encryptPayload(rawData, passphrase, '.env');

    expect(envelope.algorithm).toBe('aes-256-gcm');
    expect(envelope.encryptedData).not.toBe(rawData);
    expect(envelope.checksum).toBeDefined();

    const decrypted = decryptPayload(envelope, passphrase);
    expect(decrypted.toString('utf-8')).toBe(rawData);
  });

  it('performs smart 3-way key-value reconciliation on .env files', () => {
    const localEnv = 'PORT=3000\nDATABASE_URL=postgres://local/db\n';
    const incomingEnv = 'PORT=3000\nSTRIPE_KEY=sk_test_12345\nREDIS_URL=redis://localhost:6379\n';

    const { merged, conflicts } = reconcileEnvFiles(localEnv, incomingEnv);

    expect(merged).toContain('PORT=3000');
    expect(merged).toContain('DATABASE_URL=postgres://local/db');
    expect(merged).toContain('STRIPE_KEY=sk_test_12345');
    expect(merged).toContain('REDIS_URL=redis://localhost:6379');
    expect(conflicts.length).toBe(0);
  });

  it('generates safe masked environment variable schemas for AI agents', () => {
    const envContent = `
PORT=8080
DATABASE_URL=postgres://user:pass@localhost/mydb
API_KEY=sk_live_supersecret
ENABLE_ANALYTICS=true
`;
    const schema = generateSafeEnvSchema(envContent);

    // Verifies schema contains keys and inferred types
    expect(schema).toContain('`PORT`: `number`');
    expect(schema).toContain('`DATABASE_URL`: `string (URL/Host)`');
    expect(schema).toContain('`API_KEY`: `string (Sensitive Secret)`');
    expect(schema).toContain('`ENABLE_ANALYTICS`: `boolean`');

    // Crucial: Verifies actual raw secret values are NEVER in the schema!
    expect(schema).not.toContain('sk_live_supersecret');
    expect(schema).not.toContain('postgres://user:pass@localhost/mydb');
  });

  it('tracks, seals, and unseals vault files with dirty tracking', () => {
    // 1. Create a dummy .env
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'SECRET_TOKEN=xyz123\n');

    // 2. Track in vault
    const trackRes = trackVaultFile(tmpDir, '.env', 'secret');
    expect(trackRes.success).toBe(true);

    // Verify .gitignore updated
    const gitignoreContent = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.env');

    // 3. Before seal, dirty status is true
    let dirty = checkVaultDirtyStatus(tmpDir);
    expect(dirty.isDirty).toBe(true);
    expect(dirty.dirtyFiles).toContain('.env');

    // 4. Seal vault
    const sealRes = sealVault(tmpDir, 'test-passphrase');
    expect(sealRes.sealedCount).toBe(1);

    // After seal, dirty is false
    dirty = checkVaultDirtyStatus(tmpDir);
    expect(dirty.isDirty).toBe(false);

    // 5. Delete plaintext .env and unseal
    fs.unlinkSync(envFile);
    expect(fs.existsSync(envFile)).toBe(false);

    const unsealRes = unsealVault(tmpDir, 'test-passphrase');
    expect(unsealRes.unsealedCount).toBe(1);
    expect(fs.existsSync(envFile)).toBe(true);
    expect(fs.readFileSync(envFile, 'utf-8')).toContain('SECRET_TOKEN=xyz123');
  });

  it('tracks and verifies heavy binary assets with SHA-256 checksums', () => {
    // 1. Create dummy binary file
    const binDir = path.join(tmpDir, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const binFile = path.join(binDir, 'engine.bin');
    fs.writeFileSync(binFile, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x02, 0x03]));

    // 2. Track asset
    const trackRes = trackAsset(tmpDir, 'bin/engine.bin', { tag: 'v1.0' });
    expect(trackRes.success).toBe(true);
    expect(trackRes.pointer?.sha256).toBeDefined();

    // 3. Stash asset
    const stashRes = stashLocalAsset(tmpDir, 'bin/engine.bin');
    expect(stashRes.success).toBe(true);

    // 4. Corrupt local file, then restore and verify SHA-256
    fs.writeFileSync(binFile, 'corrupted data');
    const restoreRes = restoreLocalAsset(tmpDir, 'bin/engine.bin');
    expect(restoreRes.success).toBe(true);

    const restoredData = fs.readFileSync(binFile);
    expect(restoredData[0]).toBe(0x7f);
    expect(restoredData[1]).toBe(0x45);
  });

  it('normalizes Windows backslash paths to POSIX format for vault and assets', () => {
    // 1. Create nested file for vault
    const nestedVaultDir = path.join(tmpDir, 'nested', 'config');
    fs.mkdirSync(nestedVaultDir, { recursive: true });
    const nestedSecret = path.join(nestedVaultDir, 'secrets.json');
    fs.writeFileSync(nestedSecret, '{"apiKey":"12345"}');

    // 2. Track with Windows backslashes
    const trackVaultRes = trackVaultFile(tmpDir, 'nested\\config\\secrets.json', 'secret');
    expect(trackVaultRes.success).toBe(true);

    // Verify .gitignore has POSIX forward slashes
    const gitignoreContent = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('nested/config/secrets.json');
    expect(gitignoreContent).not.toContain('nested\\config\\secrets.json');

    // Seal and unseal
    const sealRes = sealVault(tmpDir, 'test-pass');
    expect(sealRes.sealedCount).toBe(1);

    fs.unlinkSync(nestedSecret);
    expect(fs.existsSync(nestedSecret)).toBe(false);

    const unsealRes = unsealVault(tmpDir, 'test-pass');
    expect(unsealRes.unsealedCount).toBe(1);
    expect(fs.existsSync(nestedSecret)).toBe(true);

    // 3. Asset tracking with Windows backslashes
    const nestedAssetDir = path.join(tmpDir, 'data', 'models');
    fs.mkdirSync(nestedAssetDir, { recursive: true });
    const modelFile = path.join(nestedAssetDir, 'weights.bin');
    fs.writeFileSync(modelFile, 'mock-model-weights');

    const trackAssetRes = trackAsset(tmpDir, 'data\\models\\weights.bin');
    expect(trackAssetRes.success).toBe(true);
    expect(trackAssetRes.pointer?.path).toBe('data/models/weights.bin');

    const stashRes = stashLocalAsset(tmpDir, 'data\\models\\weights.bin');
    expect(stashRes.success).toBe(true);

    fs.unlinkSync(modelFile);
    const restoreRes = restoreLocalAsset(tmpDir, 'data\\models\\weights.bin');
    expect(restoreRes.success).toBe(true);
    expect(fs.existsSync(modelFile)).toBe(true);
  });

  it('safely handles directories in trackVaultFile and trackAsset with helpful error messages', () => {
    const testDir = path.join(tmpDir, 'sample_dir');
    fs.mkdirSync(testDir, { recursive: true });

    const vaultDirRes = trackVaultFile(tmpDir, 'sample_dir');
    expect(vaultDirRes.success).toBe(false);
    expect(vaultDirRes.message).toContain('is a directory');
    expect(vaultDirRes.message).toContain('tar -czf');

    const assetDirRes = trackAsset(tmpDir, 'sample_dir');
    expect(assetDirRes.success).toBe(false);
    expect(assetDirRes.message).toContain('is a directory');
    expect(assetDirRes.message).toContain('tar -czf');
  });
});


