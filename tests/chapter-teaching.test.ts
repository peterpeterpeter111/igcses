import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { coverageSummary } from '../lib/coverage.ts';
import { getChapterTeachingReview } from '../lib/chapter-teaching.ts';

import chapterReview from '../research/chapter-teaching-reviews/4BI1-living-organisms-2026-10-09.json' with { type: 'json' };
import chapterNote from '../content/notes/biology.json' with { type: 'json' };
import publicProjection from '../content/chapter-teaching-reviews.json' with { type: 'json' };
import pointReview from '../research/teaching-reviews/4BI1-organism-groups-2026-10-09.json' with { type: 'json' };

const reviewPath = 'research/chapter-teaching-reviews/4BI1-living-organisms-2026-10-09.json';
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'igcses-chapter-review-'));
  for (const directory of ['research/syllabus', 'research/teaching-reviews', 'research/chapter-teaching-reviews', 'research/curriculum-audits', 'public/diagrams'])
    cpSync(directory, join(root, directory), { recursive: true });
  for (const path of ['scripts/chapter_teaching_review.py', 'scripts/teaching_review.py', 'scripts/note_io.py', 'content/notes/biology.json', 'content/chapter-teaching-reviews.json']) {
    mkdirSync(join(root, path, '..'), { recursive: true }); cpSync(path, join(root, path));
  }
  const run = () => spawnSync('python3', ['scripts/chapter_teaching_review.py'], { cwd: root, encoding: 'utf8' });
  const edit = <T = typeof chapterReview,>(path: string, change: (value: T) => void) => {
    const value = JSON.parse(readFileSync(join(root, path), 'utf8')); change(value);
    writeFileSync(join(root, path), JSON.stringify(value));
  };
  return { root, run, edit, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
void test('whole authored chapter review is distinct from source-point, exam and human readiness', () => {
  const f = fixture();
  try {
    const r = f.run(); assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), { completeAuthoredChapters: 1, examReadyChapters: 0 });
    const review = getChapterTeachingReview('biology', 'living-organisms')!;
    assert.equal(review.reviewedPoints, 4); assert.equal(review.humanReviewed, false);
    assert.equal(review.examReadinessCertified, false);
    assert.equal(getChapterTeachingReview('human-biology', 'cells-and-tissues'), undefined);
    assert.equal(coverageSummary().reduce((n, row) => n + row.reviewedAuthoredChapters, 0), 1);
    assert.equal(coverageSummary().reduce((n, row) => n + row.completeChapters, 0), 0);
  } finally { f.cleanup(); }
});
void test('chapter gate rejects omitted scope, changed goals, unfinished decisions and inflated publication', () => {
  const cases: [string, (f: ReturnType<typeof fixture>) => void][] = [
    ['omitted source point', (f) => f.edit(reviewPath, (r) => { r.sourcePointIds.pop(); })],
    ['unfinished topic boundaries', (f) => f.edit(reviewPath, (r) => { r.sourceBoundary.wholeTopicPointInventoryReviewed = false; })],
    ['wrong next-topic page', (f) => f.edit(reviewPath, (r) => { r.sourceBoundary.nextTopicPdfPage = 18; })],
    ['unreviewed goal', (f) => f.edit<typeof chapterNote>('content/notes/biology.json', (n) => { n.goals.push('Unreviewed new goal'); })],
    ['pending sequence judgement', (f) => f.edit(reviewPath, (r) => { r.coherenceReview.verdict = 'pending'; })],
    ['missing goal decision', (f) => f.edit(reviewPath, (r) => { r.goalDecisions.pop(); })],
    ['unsupported human review', (f) => f.edit(reviewPath, (r) => { r.humanReviewed = true; })],
    ['unsupported exam readiness', (f) => f.edit(reviewPath, (r) => { r.examReadinessCertified = true; })],
    ['inflated public count', (f) => f.edit<typeof publicProjection>('content/chapter-teaching-reviews.json', (r) => { r[0].reviewedPoints = 400; })],
    ['changed teaching clause', (f) => f.edit<typeof pointReview>('research/teaching-reviews/4BI1-organism-groups-2026-10-09.json', (r) => { r.points[2].requirements[0].verdict = 'pending'; })],
    ['escaped note', (f) => f.edit(reviewPath, (r) => { r.noteRef = '../notes.json'; })],
  ];
  for (const [name, mutate] of cases) {
    const f = fixture();
    try { assert.equal(f.run().status, 0); mutate(f); assert.notEqual(f.run().status, 0, name); }
    finally { f.cleanup(); }
  }
});
