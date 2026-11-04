import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { trackAsset, restoreLocalAsset, loadAssetsLockfile, saveAssetsLockfile } from './assets.js';

const CONTENT = 'hello blob';

describe('restoreLocalAsset cloud download', () => {
  let root: string;
  let binDir: string;
  let argsLog: string;
  const savedEnv = { ...process.env };

  const fakeTool = (name: string, body: string): void => {
    const p = path.join(binDir, name);
    fs.writeFileSync(p, `#!/bin/sh\necho "$@" > "${argsLog}"\n${body}\n`, { mode: 0o755 });
  };
  const writeDest = `for last; do :; done; printf '${CONTENT}' > "$last"`;
  const setup = (storage: 's3' | 'r2' | 'local'): string => {
    fs.writeFileSync(path.join(root, 'data.bin'), CONTENT);
    trackAsset(root, 'data.bin', { storage });
    fs.rmSync(path.join(root, 'data.bin'));
    return loadAssetsLockfile(root).assets['data.bin'].location;
  };
  const blobsDir = (): string => path.join(root, '.zepher/assets/blobs');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-assets-test-'));
    binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zepher-bin-'));
    argsLog = path.join(binDir, 'args.log');
    process.env.PATH = `${binDir}:${savedEnv.PATH}`;
    for (const k of ['ZEPHER_S3_BUCKET', 'AWS_S3_BUCKET', 'R2_BUCKET']) delete process.env[k];
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(binDir, { recursive: true, force: true });
  });

  it('downloads a missing s3 blob with aws and restores', () => {
    const loc = setup('s3');
    process.env.AWS_S3_BUCKET = 'my-bucket';
    fakeTool('aws', writeDest);
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(true);
    expect(fs.readFileSync(path.join(root, 'data.bin'), 'utf-8')).toBe(CONTENT);
    const args = fs.readFileSync(argsLog, 'utf-8').trim();
    expect(args).toBe(`s3 cp s3://my-bucket/blobs/${path.basename(loc)} ${path.join(root, loc)}.tmp`);
    expect(fs.readdirSync(blobsDir())).toEqual([path.basename(loc)]);
  });

  it('uses rclone for r2', () => {
    const loc = setup('r2');
    process.env.R2_BUCKET = 'r2b';
    fakeTool('rclone', writeDest);
    expect(restoreLocalAsset(root, 'data.bin').success).toBe(true);
    expect(fs.readFileSync(argsLog, 'utf-8')).toContain(`copyto r2:r2b/blobs/${path.basename(loc)} `);
  });

  it('prints an actionable command when no bucket is set and runs nothing', () => {
    const loc = setup('s3');
    fakeTool('aws', writeDest);
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(false);
    expect(res.message).toBe(
      `Missing blob at ${loc}. Set ZEPHER_S3_BUCKET or AWS_S3_BUCKET, or download with:\n  aws s3 cp s3://<bucket>/blobs/${path.basename(loc)} ${loc}`
    );
    expect(fs.existsSync(argsLog)).toBe(false);
  });

  it('reports the manual command when the tool is not installed', () => {
    const loc = setup('r2');
    process.env.R2_BUCKET = 'r2b';
    process.env.PATH = binDir; // no rclone anywhere
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(false);
    expect(res.message).toContain('"rclone" is not installed');
    expect(res.message).toContain(`rclone copyto r2:r2b/blobs/${path.basename(loc)} ${loc}`);
  });

  it('fails and leaves no temp file when the tool exits non-zero', () => {
    setup('s3');
    process.env.ZEPHER_S3_BUCKET = 'b';
    fakeTool('aws', `for last; do :; done; printf partial > "$last"; echo "AccessDenied" >&2; echo more >&2; exit 1`);
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(false);
    expect(res.message).toContain('aws failed: AccessDenied');
    expect(res.message).not.toContain('more');
    expect(fs.readdirSync(blobsDir())).toEqual([]);
  });

  it('rejects a download with the wrong checksum and leaves nothing behind', () => {
    setup('s3');
    process.env.ZEPHER_S3_BUCKET = 'b';
    fakeTool('aws', `for last; do :; done; printf tampered > "$last"`);
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(false);
    expect(res.message).toContain('SHA-256');
    expect(fs.readdirSync(blobsDir())).toEqual([]);
    expect(fs.existsSync(path.join(root, 'data.bin'))).toBe(false);
  });

  it('refuses a malicious lockfile location without running the tool', () => {
    setup('s3');
    process.env.ZEPHER_S3_BUCKET = 'b';
    fakeTool('aws', writeDest);
    const lock = loadAssetsLockfile(root);
    lock.assets['data.bin'].location = '../../evil';
    lock.assets['data.bin'].sha256 = crypto.createHash('sha256').update(CONTENT).digest('hex');
    saveAssetsLockfile(root, lock);
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.success).toBe(false);
    expect(res.message).toContain('unsafe location');
    expect(fs.existsSync(argsLog)).toBe(false);
  });

  it('gives stash guidance for local storage', () => {
    const loc = setup('local');
    const res = restoreLocalAsset(root, 'data.bin');
    expect(res.message).toBe(
      `Missing blob at ${loc}. Run "zepher asset stash <path>" on a machine that has the file, or copy the blob there.`
    );
  });
});
