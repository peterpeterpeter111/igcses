import { test } from 'node:test';
import assert from 'node:assert/strict';
import review from '../research/teaching-reviews/4EB1-reading-foundations.json' with { type: 'json' };
import sources from '../research/sources.json' with { type: 'json' };
import { getNotes, type NoteSection } from '../content/notes.ts';
import { reviewedInventories } from '../lib/syllabus.ts';

void test('English AO teaching review resolves to saved source and lesson identities without claiming numbered coverage', () => {
  const source = sources.find((item) => item.id === review.source.documentId);
  const note = getNotes('english', review.chapterId);
  assert.ok(source && note);
  assert.equal(source.qualification, review.subject);
  assert.equal(review.source.sha256, source.sha256);
  assert.equal(note.sourceId, source.id);
  assert.ok(review.source.pdfPages.every((page) => note.sourcePages.includes(page)));
  assert.deepEqual(review.source.printedPages, review.source.pdfPages.map((page) => page - 4));
  assert.deepEqual(review.sections.map((item) => item.sectionId).sort(),
    note.sections.map((section) => section.id).sort());
  for (const row of review.sections) {
    const section: NoteSection | undefined = note.sections.find((item) => item.id === row.sectionId);
    assert.ok(section);
    assert.deepEqual(row.assessmentObjectiveRefs, section.points);
    assert.ok(row.assessmentObjectiveRefs.every((ref) => ['AO1', 'AO2', 'AO3'].includes(ref)));
    assert.equal(row.status, 'partial');
    assert.equal(row.contentOrigin, 'original-teaching');
  }
  assert.equal(review.humanReviewed, false);
  assert.equal(review.fullyProcessedPapers, 0);
  assert.equal(review.activeTemplates, 0);
  assert.equal(reviewedInventories.filter((inventory) => inventory.qualification === '4EB1').length, 0);
});
