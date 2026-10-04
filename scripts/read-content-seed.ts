import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/** Read the generated SQL without buffering a growing curriculum in the
 * subprocess stdout pipe. This never replaces a prepared deployment file. */
export function readContentSeed(): string {
  const directory = mkdtempSync(join(tmpdir(), 'igcses-seed-check-'));
  const file = join(directory, 'seed.sql');
  let descriptor: number | undefined;
  try {
    descriptor = openSync(file, 'wx');
    execFileSync(process.execPath,
      ['--experimental-strip-types', 'scripts/seed-content.ts', '--stdout'],
      { stdio: ['ignore', descriptor, 'pipe'], encoding: 'utf8' });
    closeSync(descriptor); descriptor = undefined;
    return readFileSync(file, 'utf8');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    // Only this invocation's newly created temporary directory is removed.
    rmSync(directory, { recursive: true, force: true });
  }
}
