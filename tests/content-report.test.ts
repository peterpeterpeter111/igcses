import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { notes } from '../content/notes.ts';

void test('content reports are current, read-only by default and never overwrite evidence', () => {
  const historicalPath = 'research/reviews/2026-09-09-note-check.json';
  const historical = readFileSync(historicalPath, 'utf8');
  const files = readdirSync('research/reviews').sort();
  const run = (...args: string[]) => spawnSync(process.execPath,
    ['scripts/validate-content.mjs', ...args], { encoding: 'utf8' });
  const start = new Date().toISOString().slice(0, 10);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok([start, new Date().toISOString().slice(0, 10)].includes(report.date));
  assert.equal(report.chaptersWithPartialNotes, notes.length);
  assert.equal(report.sections, notes.reduce((sum, note) => sum + note.sections.length, 0));
  assert.equal(report.completeChapters, 0);
  assert.deepEqual(readdirSync('research/reviews').sort(), files);
  assert.equal(readFileSync(historicalPath, 'utf8'), historical);
  const directory = mkdtempSync(join(tmpdir(), 'igcses-report-test-'));
  try {
    const output = join(directory, 'check.json');
    assert.equal(run('--output', output).status, 0);
    const saved = readFileSync(output, 'utf8');
    assert.notEqual(run('--output', output).status, 0);
    assert.equal(readFileSync(output, 'utf8'), saved);
    assert.notEqual(run('--unknown', output).status, 0);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
