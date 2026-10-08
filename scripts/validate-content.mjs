import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { readNote } from './read-note.mjs';
// Read-only by default. An explicit output creates a new report and must never
// replace historical evidence, even when a caller reuses an old filename.
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--output'),
  'Usage: node scripts/validate-content.mjs [--output NEW_REPORT_PATH]');
const sources = JSON.parse(readFileSync('research/sources.json', 'utf8'));
const rows = readdirSync('content/notes')
  .filter((x) => x.endsWith('.json'))
  .sort()
  .map((f) => readNote('content/notes/' + f));
const checks = [];
const sectionFields = new Set([
  'id', 'title', 'paragraphs', 'terms', 'points', 'example', 'practice',
  'diagram', 'commonMistakes', 'practical', 'answerGuide', 'table',
]);
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
  for (const section of n.sections) {
    for (const field of Object.keys(section)) {
      assert(sectionFields.has(field),
        `${n.subjectId}/${n.chapterId}#${section.id}: unsupported section field ${field}; the reader may silently omit it`);
    }
    if (section.practical) {
      const fields = ['apparatus', 'method', 'variables', 'safety', 'quality'];
      assert.deepEqual(Object.keys(section.practical).sort(), [...fields].sort());
      for (const field of fields) {
        assert(Array.isArray(section.practical[field]) && section.practical[field].length > 0 &&
          section.practical[field].every((item) => typeof item === 'string' && item.trim()),
          `${section.id}: practical ${field} must contain nonempty text`);
      }
    }
    if (section.table) {
      const { headers, rows } = section.table;
      assert.deepEqual(Object.keys(section.table).sort(), ['headers', 'rows']);
      assert(Array.isArray(headers) && headers.length >= 2 && headers.every((h) => typeof h === 'string' && h.trim()));
      assert(new Set(headers).size === headers.length, `${section.id}: duplicate table headings`);
      assert(Array.isArray(rows) && rows.length > 0 && rows.every((row) => Array.isArray(row) && row.length === headers.length && row.every((cell) => typeof cell === 'string' && cell.trim())),
        `${section.id}: table rows must match headings and contain nonempty text`);
    }
  }
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
  completionPromotionsByThisShapeCheck: 0,
  checks,
};
if (args.length) writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
