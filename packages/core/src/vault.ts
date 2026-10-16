import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'yaml';
import { ZEPHER_DIR, VAULT_DIR, VAULT_CONFIG_FILE, VAULT_LOCKFILE } from './constants.js';
import { VaultConfig, VaultLockfile, VaultFileType, VaultTrackedItem, VaultLockEntry } from './types.js';

// --- File & Config Management ---

export function getVaultDir(projectRoot: string): string {
  return path.join(projectRoot, ZEPHER_DIR, VAULT_DIR);
}

export function getVaultConfigPath(projectRoot: string): string {
  return path.join(projectRoot, ZEPHER_DIR, VAULT_CONFIG_FILE);
}

export function getVaultLockfilePath(projectRoot: string): string {
  return path.join(projectRoot, ZEPHER_DIR, VAULT_LOCKFILE);
}

export function loadVaultConfig(projectRoot: string): VaultConfig {
  const configPath = getVaultConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) {
    return { version: '1.0', members: [], items: [] };
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.parse(raw);
    return {
      version: '1.0',
      members: Array.isArray(parsed?.members) ? parsed.members : [],
      items: Array.isArray(parsed?.items) ? parsed.items : []
    };
  } catch {
    return { version: '1.0', members: [], items: [] };
  }
}

export function saveVaultConfig(projectRoot: string, config: VaultConfig): void {
  const configPath = getVaultConfigPath(projectRoot);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, yaml.stringify(config), 'utf-8');
}

export function loadVaultLockfile(projectRoot: string): VaultLockfile {
  const lockfilePath = getVaultLockfilePath(projectRoot);
  if (!fs.existsSync(lockfilePath)) {
    return { version: '1.0', files: {} };
  }
  try {
    const raw = fs.readFileSync(lockfilePath, 'utf-8');
    const parsed = yaml.parse(raw);
    return {
      version: '1.0',
      files: parsed?.files || {}
    };
  } catch {
    return { version: '1.0', files: {} };
  }
}

export function saveVaultLockfile(projectRoot: string, lockfile: VaultLockfile): void {
  const lockfilePath = getVaultLockfilePath(projectRoot);
  const dir = path.dirname(lockfilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(lockfilePath, yaml.stringify(lockfile), 'utf-8');
}

// --- Git Shield: Ensure Tracked Files Are Ignored ---

export function ensureGitIgnored(projectRoot: string, relativePath: string): boolean {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const lines = content.split('\n').map(l => l.trim());

  if (lines.includes(normalized) || lines.includes(`/${normalized}`)) {
    return false; // Already ignored
  }

  const header = '\n# Zepher Vault Protected Files (Do Not Commit Plaintext)\n';
  const addition = content.includes('# Zepher Vault Protected Files') ? `${normalized}\n` : `${header}${normalized}\n`;

  fs.appendFileSync(gitignorePath, addition, 'utf-8');
  return true;
}

// --- Track New File in Vault ---

export function trackVaultFile(
  projectRoot: string,
  relPath: string,
  type: VaultFileType = 'secret',
  autoSeal: boolean = true
): { success: boolean; message: string } {
  const normalizedRelPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.join(projectRoot, normalizedRelPath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, message: `File "${normalizedRelPath}" does not exist in project root.` };
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return {
      success: false,
      message: `"${normalizedRelPath}" is a directory. Zepher Vault tracks individual files. Either track files individually or bundle the directory first (e.g. tar -czf ${normalizedRelPath}.tar.gz ${normalizedRelPath}/ && zepher vault track ${normalizedRelPath}.tar.gz).`
    };
  }

  const config = loadVaultConfig(projectRoot);
  const existingIdx = config.items.findIndex(i => i.path === normalizedRelPath);

  if (existingIdx !== -1) {
    config.items[existingIdx].type = type;
    config.items[existingIdx].autoSeal = autoSeal;
  } else {
    config.items.push({ path: normalizedRelPath, type, autoSeal });
  }

  saveVaultConfig(projectRoot, config);
  ensureGitIgnored(projectRoot, normalizedRelPath);

  return { success: true, message: `Tracked "${normalizedRelPath}" as ${type} in Zepher Vault and added to .gitignore.` };
}

// --- Cryptographic Envelope (AES-256-GCM + PBKDF2) ---

export interface EncryptedEnvelope {
  version: '1.0';
  targetPath: string;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  salt: string;
  encryptedData: string;
  checksum: string;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
}

export function encryptPayload(data: Buffer | string, passphrase: string, targetPath: string): EncryptedEnvelope {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    version: '1.0',
    targetPath,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    salt: salt.toString('hex'),
    encryptedData: encrypted.toString('base64'),
    checksum
  };
}

export function decryptPayload(envelope: EncryptedEnvelope, passphrase: string): Buffer {
  const salt = Buffer.from(envelope.salt, 'hex');
  const iv = Buffer.from(envelope.iv, 'hex');
  const tag = Buffer.from(envelope.tag, 'hex');
  const encryptedData = Buffer.from(envelope.encryptedData, 'base64');
  const key = deriveKey(passphrase, salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

// --- Seal & Unseal Vault Files ---

export function sealVault(
  projectRoot: string,
  passphrase: string = 'zepher-team-key'
): { sealedCount: number; errors: string[] } {
  const config = loadVaultConfig(projectRoot);
  const lockfile = loadVaultLockfile(projectRoot);
  const vaultDir = getVaultDir(projectRoot);

  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }

  let sealedCount = 0;
  const errors: string[] = [];

  for (const item of config.items) {
    const fullPath = path.join(projectRoot, item.path);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing source file: ${item.path}`);
      continue;
    }

    try {
      const data = fs.readFileSync(fullPath);
      const envelope = encryptPayload(data, passphrase, item.path);
      const safeName = item.path.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') + '.enc';
      const envelopePath = path.join(vaultDir, safeName);

      fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2), 'utf-8');

      lockfile.files[item.path] = {
        path: item.path,
        sha256: envelope.checksum,
        sealedAt: new Date().toISOString(),
        envelopeFile: path.relative(projectRoot, envelopePath)
      };

      sealedCount++;
    } catch (err: any) {
      errors.push(`Failed to seal ${item.path}: ${err.message}`);
    }
  }

  saveVaultLockfile(projectRoot, lockfile);
  return { sealedCount, errors };
}

export function unsealVault(
  projectRoot: string,
  passphrase: string = 'zepher-team-key'
): { unsealedCount: number; errors: string[] } {
  const lockfile = loadVaultLockfile(projectRoot);
  let unsealedCount = 0;
  const errors: string[] = [];

  for (const [relPath, entry] of Object.entries(lockfile.files)) {
    const envelopePath = path.join(projectRoot, entry.envelopeFile);
    if (!fs.existsSync(envelopePath)) {
      errors.push(`Missing envelope file: ${entry.envelopeFile}`);
      continue;
    }

    try {
      const raw = fs.readFileSync(envelopePath, 'utf-8');
      const envelope: EncryptedEnvelope = JSON.parse(raw);
      const decrypted = decryptPayload(envelope, passphrase);

      const destPath = path.join(projectRoot, relPath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      // If it's an environment file and already exists, perform smart K-V reconciliation!
      if (relPath.endsWith('.env') || relPath.includes('.env.')) {
        if (fs.existsSync(destPath)) {
          const existingContent = fs.readFileSync(destPath, 'utf-8');
          const incomingContent = decrypted.toString('utf-8');
          const { merged } = reconcileEnvFiles(existingContent, incomingContent);
          fs.writeFileSync(destPath, merged, 'utf-8');
        } else {
          fs.writeFileSync(destPath, decrypted);
        }
      } else {
        fs.writeFileSync(destPath, decrypted);
      }

      unsealedCount++;
    } catch (err: any) {
      errors.push(`Failed to unseal ${relPath}: ${err.message}`);
    }
  }

  return { unsealedCount, errors };
}

// --- Smart .env Key-Value Reconciliation ---

export function parseEnvKvs(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      map.set(key, val);
    }
  }
  return map;
}

export function reconcileEnvFiles(localContent: string, incomingContent: string): { merged: string; conflicts: string[] } {
  const localMap = parseEnvKvs(localContent);
  const incomingMap = parseEnvKvs(incomingContent);
  const conflicts: string[] = [];

  const mergedMap = new Map<string, string>(localMap);

  for (const [key, incVal] of incomingMap.entries()) {
    if (mergedMap.has(key)) {
      const locVal = mergedMap.get(key)!;
      if (locVal !== incVal) {
        conflicts.push(key);
        // Keep local value, but note conflict
      }
    } else {
      mergedMap.set(key, incVal);
    }
  }

  // Format merged output cleanly
  let output = `# Environment Variables (Reconciled by Zepher Vault)\n`;
  for (const [k, v] of mergedMap.entries()) {
    output += `${k}=${v}\n`;
  }

  return { merged: output, conflicts };
}

// --- AI Context Guard: Generate Safe .env Signatures ---

export function generateSafeEnvSchema(envContent: string): string {
  const map = parseEnvKvs(envContent);
  if (map.size === 0) return '';

  let doc = `## Environment Variable Signatures (Values Masked by Zepher Vault)\n`;
  doc += `_These variables are available at runtime. Never expose raw secret credentials in generated code._\n\n`;

  for (const key of map.keys()) {
    let inferredType = 'string';
    const lower = key.toLowerCase();
    if (lower.includes('port') || lower.includes('timeout') || lower.includes('limit')) {
      inferredType = 'number';
    } else if (lower.includes('enable') || lower.includes('debug') || lower.includes('bool') || lower.includes('flag')) {
      inferredType = 'boolean';
    } else if (lower.includes('url') || lower.includes('uri') || lower.includes('host')) {
      inferredType = 'string (URL/Host)';
    } else if (lower.includes('key') || lower.includes('secret') || lower.includes('token') || lower.includes('password')) {
      inferredType = 'string (Sensitive Secret)';
    }

    doc += `- \`${key}\`: \`${inferredType}\`\n`;
  }

  return doc + '\n';
}

// --- Pre-Commit Dirty Shield ---

export function checkVaultDirtyStatus(projectRoot: string): { isDirty: boolean; dirtyFiles: string[] } {
  const config = loadVaultConfig(projectRoot);
  const lockfile = loadVaultLockfile(projectRoot);
  const dirtyFiles: string[] = [];

  for (const item of config.items) {
    const fullPath = path.join(projectRoot, item.path);
    if (!fs.existsSync(fullPath)) continue;

    const data = fs.readFileSync(fullPath);
    const currentSha = crypto.createHash('sha256').update(data).digest('hex');
    const lockedEntry = lockfile.files[item.path];

    if (!lockedEntry || lockedEntry.sha256 !== currentSha) {
      dirtyFiles.push(item.path);
    }
  }

  return { isDirty: dirtyFiles.length > 0, dirtyFiles };
}
