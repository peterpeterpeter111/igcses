import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

void test('content validation accepts real captions and rejects empty, non-text and unknown table fields', () => {
  const directory = mkdtempSync(join(tmpdir(), 'igcses-table-contract-'));
  try {
    for (const path of ['scripts', 'research', 'content/notes']) mkdirSync(join(directory, path), { recursive: true });
    for (const path of ['scripts/validate-content.mjs', 'scripts/read-note.mjs', 'content/compose-note.mjs', 'research/sources.json']) {
      copyFileSync(path, join(directory, path));
    }
    const original = notes.find((note) => note.subjectId === 'chemistry' && note.chapterId === 'inorganic');
    assert.ok(original);
    const note = structuredClone(original);
    const section = note.sections.find((item) => item.id === 'halogen-state-and-extrapolation-evidence');
    assert.ok(section?.table?.caption);
    note.sections = [section];
    const table = structuredClone(section.table);
    const run = (candidate: Record<string, unknown>) => {
      writeFileSync(join(directory, 'content/notes/fixture.json'), JSON.stringify({ ...note,
        sections: [{ ...section, table: candidate }] }));
      return spawnSync(process.execPath, ['scripts/validate-content.mjs'], { cwd: directory, encoding: 'utf8' });
    };
    const valid = run(table);
    assert.equal(valid.status, 0, valid.stderr);
    const { caption: _caption, ...legacy } = table;
    assert.equal(run(legacy).status, 0);
    for (const caption of ['', '   ', 12, null]) {
      const result = run({ ...table, caption });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /table caption must contain nonempty text/);
    }
    assert.notEqual(run({ ...table, unrenderedSource: 'would be silently dropped' }).status, 0);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
