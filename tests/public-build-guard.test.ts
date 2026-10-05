import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

void test('public scan rejects nested and simple Human rubric IDs while allowing honest counts', () => {
  const root = mkdtempSync(join(tmpdir(), 'igcses-public-scan-'));
  try {
    mkdirSync(join(root, 'dist/client'), { recursive: true });
    const file = join(root, 'dist/client/fixture.js');
    for (const id of [
      '4HB1-2024-May-01-standard.Q1.b.ii:point-2',
      '4HB1-2024-May-01-standard.Q2.b:point-6',
      '4HB1-2024-May-01-standard.Q3.c:point-4',
      '4HB1-2024-May-01-standard.Q9.a.ii:point-1',
    ]) {
      writeFileSync(file, JSON.stringify(id));
      const result = spawnSync(process.execPath, [resolve('scripts/validate-public-build.mjs')], { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Human Biology research rubric identifier/);
    }
    writeFileSync(file, JSON.stringify({ indexedParts: 42, detailedParts: 17, processed: 0 }));
    assert.equal(spawnSync(process.execPath, [resolve('scripts/validate-public-build.mjs')], { cwd: root }).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
