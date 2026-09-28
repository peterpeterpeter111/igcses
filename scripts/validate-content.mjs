import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
// Read-only by default. An explicit output creates a new report and must never
// replace historical evidence, even when a caller reuses an old filename.
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--output'),
  'Usage: node scripts/validate-content.mjs [--output NEW_REPORT_PATH]');
const sources = JSON.parse(readFileSync('research/sources.json', 'utf8'));
const rows = readdirSync('content/notes')
  .filter((x) => x.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync('content/notes/' + f, 'utf8')));
const checks = [];
for (const n of rows) {
  const s = sources.find((s) => s.id === n.sourceId);
  assert(s);
  assert.equal(n.complete, false);
  assert.equal(n.humanReviewed, false);
  assert(
    n.sourcePages.every((p) => Number.isInteger(p) && p > 0 && p <= s.pages),
  );
  assert(n.sections.length > 0);
  assert.equal(new Set(n.sections.map((s) => s.id)).size, n.sections.length);
  assert(n.sections.every((s) => s.paragraphs.length > 0 && s.title && s.id));
  checks.push({
    subjectId: n.subjectId,
    chapterId: n.chapterId,
    sections: n.sections.length,
    sourceId: n.sourceId,
    sourcePages: n.sourcePages,
    status: 'partial-source-checked',
    complete: false,
    humanReviewed: false,
  });
}
const report = {
  date: new Date().toISOString().slice(0, 10),
  generatedAt: new Date().toISOString(),
  scope:
    'Content shape and provenance references. Educational review is separately recorded; this check does not certify full chapters.',
  chaptersWithPartialNotes: rows.length,
  sections: rows.reduce((n, r) => n + r.sections.length, 0),
  completeChapters: 0,
  fullyCoveredSpecificationPoints: 0,
  checks,
};
if (args.length) writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
