import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import yaml from 'yaml';
import { ZEPHER_DIR, ASSETS_LOCKFILE } from './constants.js';
import { AssetsLockfile, AssetPointer } from './types.js';
import { ensureGitIgnored } from './vault.js';

export function getAssetsLockfilePath(projectRoot: string): string {
  return path.join(projectRoot, ZEPHER_DIR, ASSETS_LOCKFILE);
}

export function loadAssetsLockfile(projectRoot: string): AssetsLockfile {
  const filePath = getAssetsLockfilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    return { version: '1.0', assets: {} };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.parse(raw);
    return {
      version: '1.0',
      assets: parsed?.assets || {}
    };
  } catch {
    return { version: '1.0', assets: {} };
  }
}

export function saveAssetsLockfile(projectRoot: string, lockfile: AssetsLockfile): void {
  const filePath = getAssetsLockfilePath(projectRoot);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, yaml.stringify(lockfile), 'utf-8');
}

export function trackAsset(
  projectRoot: string,
  relPath: string,
  options: { tag?: string; storage?: 'local' | 'r2' | 's3' | 'ssh' } = {}
): { success: boolean; message: string; pointer?: AssetPointer } {
  const normalizedRelPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.join(projectRoot, normalizedRelPath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, message: `Asset file "${normalizedRelPath}" does not exist.` };
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return {
      success: false,
      message: `"${normalizedRelPath}" is a directory. Zepher Asset Hub tracks individual binary files or archives. Please bundle the directory first (e.g. tar -czf ${normalizedRelPath}.tar.gz ${normalizedRelPath}/).`
    };
  }
  const data = fs.readFileSync(fullPath);
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');

  const lockfile = loadAssetsLockfile(projectRoot);

  const pointer: AssetPointer = {
    path: normalizedRelPath,
    sha256,
    size: stat.size,
    storage: options.storage || 'local',
    location: `.zepher/assets/blobs/${sha256.slice(0, 16)}`,
    tag: options.tag,
    updatedAt: new Date().toISOString()
  };

  lockfile.assets[normalizedRelPath] = pointer;
  saveAssetsLockfile(projectRoot, lockfile);
  ensureGitIgnored(projectRoot, normalizedRelPath);

  return {
    success: true,
    message: `Tracked asset "${normalizedRelPath}" (${(stat.size / 1024).toFixed(1)} KB) in Zepher Asset Hub.`,
    pointer
  };
}

export function stashLocalAsset(
  projectRoot: string,
  relPath: string
): { success: boolean; message: string } {
  const normalizedRelPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.join(projectRoot, normalizedRelPath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, message: `Source file "${normalizedRelPath}" not found.` };
  }

  const lockfile = loadAssetsLockfile(projectRoot);
  const pointer = lockfile.assets[normalizedRelPath];
  if (!pointer) {
    return { success: false, message: `Asset "${normalizedRelPath}" is not registered. Run "zepher asset track ${normalizedRelPath}" first.` };
  }

  const blobDir = path.join(projectRoot, ZEPHER_DIR, 'assets', 'blobs');
  if (!fs.existsSync(blobDir)) fs.mkdirSync(blobDir, { recursive: true });

  const destBlob = path.join(projectRoot, pointer.location);
  fs.copyFileSync(fullPath, destBlob);

  return { success: true, message: `Stashed asset "${normalizedRelPath}" to blob store (${pointer.location}).` };
}

function fetchMissingBlob(projectRoot: string, pointer: AssetPointer): { success: boolean; message: string } {
  const { location, storage } = pointer;
  if (storage !== 's3' && storage !== 'r2') {
    return {
      success: false,
      message: `Missing blob at ${location}. Run "zepher asset stash <path>" on a machine that has the file, or copy the blob there.`
    };
  }

  const envNames = storage === 's3' ? ['ZEPHER_S3_BUCKET', 'AWS_S3_BUCKET'] : ['R2_BUCKET', 'ZEPHER_S3_BUCKET'];
  const bucket = envNames.map((n) => process.env[n]).find(Boolean);
  const blobName = path.basename(location);
  const blobPath = path.join(projectRoot, location);
  const blobDir = path.join(projectRoot, ZEPHER_DIR, 'assets', 'blobs');
  const bucketName = bucket ?? '<bucket>';
  const tool = storage === 's3' ? 'aws' : 'rclone';
  const source = storage === 's3' ? `s3://${bucketName}/blobs/${blobName}` : `r2:${bucketName}/blobs/${blobName}`;
  const verb = storage === 's3' ? ['s3', 'cp'] : ['copyto'];
  const manual = `${tool} ${verb.join(' ')} ${source} ${location}`;

  // The lockfile is repo content: never let it point the download outside the blob store.
  if (path.dirname(blobPath) !== blobDir || !/^[A-Za-z0-9._-]+$/.test(blobName)) {
    return { success: false, message: `Refusing to download blob with unsafe location "${location}".` };
  }
  if (!bucket) {
    return {
      success: false,
      message: `Missing blob at ${location}. Set ${envNames.join(' or ')}, or download with:\n  ${manual}`
    };
  }

  const tmpPath = `${blobPath}.tmp`;
  fs.mkdirSync(blobDir, { recursive: true });
  try {
    try {
      execFileSync(tool, [...verb, source, tmpPath], { stdio: 'pipe' });
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { stderr?: Buffer };
      const why = e.code === 'ENOENT'
        ? `"${tool}" is not installed`
        : `${tool} failed: ${e.stderr?.toString().split('\n')[0] || e.message}`;
      return { success: false, message: `Missing blob at ${location}; ${why}. Download manually with:\n  ${manual}` };
    }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(tmpPath)).digest('hex');
    if (sha !== pointer.sha256) {
      return { success: false, message: `Downloaded blob for ${location} failed SHA-256 verification; discarded.` };
    }
    fs.renameSync(tmpPath, blobPath);
    return { success: true, message: '' };
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
}

export function restoreLocalAsset(
  projectRoot: string,
  relPath: string
): { success: boolean; message: string } {
  const normalizedRelPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const lockfile = loadAssetsLockfile(projectRoot);
  const pointer = lockfile.assets[normalizedRelPath];
  if (!pointer) {
    return { success: false, message: `Asset "${normalizedRelPath}" not found in assets.lock.yaml.` };
  }

  const blobPath = path.join(projectRoot, pointer.location);
  if (!fs.existsSync(blobPath)) {
    const fetched = fetchMissingBlob(projectRoot, pointer);
    if (!fetched.success) return fetched;
  }

  const blobData = fs.readFileSync(blobPath);
  const actualSha = crypto.createHash('sha256').update(blobData).digest('hex');

  if (actualSha !== pointer.sha256) {
    return { success: false, message: `Checksum verification failed for "${normalizedRelPath}".` };
  }

  const destPath = path.join(projectRoot, normalizedRelPath);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  fs.writeFileSync(destPath, blobData);
  return { success: true, message: `Restored asset "${normalizedRelPath}" successfully (verified SHA-256).` };
}

export interface AssetStatus extends AssetPointer {
  blobPresent: boolean;
}

export function getAssetStatuses(projectRoot: string): AssetStatus[] {
  return Object.values(loadAssetsLockfile(projectRoot).assets).map((pointer) => ({
    ...pointer,
    blobPresent: fs.existsSync(path.join(projectRoot, pointer.location))
  }));
}
