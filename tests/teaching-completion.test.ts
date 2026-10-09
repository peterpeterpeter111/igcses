import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import transport from '../content/note-sections/biology-structures/03-transport.json' with { type: 'json' };
import inventory from '../research/syllabus/4BI1-cell-transport.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-cell-transport-2026-10-08.json' with { type: 'json' };
import audit from '../research/curriculum-audits/4BI1-cell-transport.json' with { type: 'json' };
import { coverageSummary } from '../lib/coverage.ts';

const inventoryPath = 'research/syllabus/4BI1-cell-transport.json';
const reviewPath = 'research/teaching-reviews/4BI1-cell-transport-2026-10-08.json';
const auditPath = 'research/curriculum-audits/4BI1-cell-transport.json';
const notePath = 'content/note-sections/biology-structures/03-transport.json';
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'igcses-teaching-review-'));
  for (const folder of ['scripts', 'research/syllabus', 'research/teaching-reviews', 'research/curriculum-audits', 'content/notes'])
    mkdirSync(join(root, folder), { recursive: true });
  for (const path of ['scripts/teaching_review.py', 'scripts/note_io.py', inventoryPath, reviewPath, auditPath, 'content/notes/biology-structures.json'])
    cpSync(path, join(root, path));
  cpSync('content/note-sections/biology-structures', join(root, 'content/note-sections/biology-structures'), { recursive: true });
  cpSync('public/diagrams', join(root, 'public/diagrams'), { recursive: true });
  const run = () => spawnSync('python3', ['-c', "import sys,json;from pathlib import Path;sys.path.insert(0,'scripts');from teaching_review import validate_inventory_completion;print(json.dumps(validate_inventory_completion(Path('.'),json.loads(Path(sys.argv[1]).read_text()))))", inventoryPath], { cwd: root, encoding: 'utf8' });
  const edit = <T,>(path: string, mutate: (value: T) => void) => {
    const value = JSON.parse(readFileSync(join(root, path), 'utf8')); mutate(value);
    writeFileSync(join(root, path), JSON.stringify(value));
  };
  return { root, run, edit, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
void test('cell-transport review stays bounded while aggregate teaching counts include the separate molecules review', () => {
  const f = fixture();
  try {
    const r = f.run(); assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), ['4BI1:issue3:2.15', '4BI1:issue3:2.16', '4BI1:issue3:2.17']);
    const summary = coverageSummary();
    assert.equal(summary.find((r) => r.subject.code === '4BI1')!.completePoints, 15);
    assert.equal(summary.find((r) => r.subject.code === '4HB1')!.completePoints, 14);
    assert.equal(summary.reduce((sum, r) => sum + r.completePoints, 0), 29);
    assert.ok(summary.every((r) => r.completeChapters === 0));
    assert.equal(summary.reduce((sum, r) => sum + r.fullyProcessed, 0), 2);
  } finally { f.cleanup(); }
});
void test('teaching review refuses stale lessons, incomplete decisions and inflated reviewer claims', () => {
  const cases: [string, (f: ReturnType<typeof fixture>) => void][] = [
    ['changed diagram bytes', (f) => writeFileSync(join(f.root, 'public', Object.keys(review.diagramSha256)[0]), '<svg>Unreviewed replacement</svg>')],
    ['changed explanation', (f) => f.edit<typeof transport>(notePath, (d) => { d.sections[0].paragraphs[0] = 'Incorrect replacement'; })],
    ['missing worked example', (f) => f.edit<typeof transport>(notePath, (d) => { Reflect.deleteProperty(d.sections[0], 'example'); })],
    ['missing requirement decision', (f) => f.edit<typeof review>(reviewPath, (d) => { d.points[0].requirements.pop(); })],
    ['review pending', (f) => f.edit<typeof review>(reviewPath, (d) => { d.points[0].requirements[0].verdict = 'pending'; })],
    ['no judgement', (f) => f.edit<typeof review>(reviewPath, (d) => { d.points[0].requirements[0].judgement = ''; })],
    ['false human review', (f) => f.edit<typeof review>(reviewPath, (d) => { d.humanReviewed = true; })],
    ['false trial claim', (f) => f.edit<typeof review>(reviewPath, (d) => { d.practicalTrialsPerformed = true; })],
    ['false exam calibration claim', (f) => f.edit<typeof review>(reviewPath, (d) => { d.examTemplateCalibrationComplete = true; })],
    ['changed source scope', (f) => f.edit<typeof inventory>(inventoryPath, (d) => { d.points[0].components = ['2B']; })],
    ['changed requirement', (f) => f.edit<typeof audit>(auditPath, (d) => { d.parents[0].requirements[0].summary = 'Different scope'; })],
    ['no review reference', (f) => f.edit<typeof inventory>(inventoryPath, (d) => { Reflect.deleteProperty(d, 'completionReviewRef'); })],
  ];
  for (const [label, mutate] of cases) {
    const f = fixture();
    try { assert.equal(f.run().status, 0); mutate(f); assert.notEqual(f.run().status, 0, label); }
    finally { f.cleanup(); }
  }
});
