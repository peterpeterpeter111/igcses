import { test } from 'node:test';
import assert from 'node:assert/strict';
import extracted from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import syllabus from '../research/syllabus/4PH1-forces-and-motion.json' with { type: 'json' };

test('Physics extraction keeps source pages, documents, task marks and raw index distinct', () => {
  const raw = batch.records.find((row) => row.paperId === extracted.paperId)!;
  assert.equal(raw.processingStatus, 'indexed-only');
  assert.equal(extracted.fullyProcessed, false);
  assert.equal(extracted.wholePaperLeafCount, null);
  assert.ok(extracted.blockers.length);
  assert.equal(extracted.detailedLeafTasks, extracted.tasks.length);
  assert.equal(
    new Set(extracted.tasks.map((task) => task.taskId)).size,
    extracted.tasks.length,
  );
  assert.equal(
    extracted.tasks.reduce((sum, task) => sum + task.originalMarks, 0),
    extracted.detailedOriginalMarks,
  );
  for (const [question, total] of Object.entries(
    extracted.reviewedQuestionTotals,
  )) {
    assert.equal(
      extracted.tasks
        .filter((task) => task.questionPath.split('.')[0] === question)
        .reduce((sum, task) => sum + task.originalMarks, 0),
      total,
    );
  }
  for (const [document, original] of [
    [extracted.documents[0], raw.questionPaper],
    [extracted.documents[1], raw.markScheme],
  ] as const) {
    assert.equal(document.sha256, original.sha256);
    assert.equal(document.pageCount, original.pageCount);
    assert.equal(document.url, original.url);
  }
  for (const task of extracted.tasks) {
    assert.ok(
      task.questionPaperPages.every((page) =>
        extracted.pageAudit.questionPaper.visuallyReviewedPages.includes(page),
      ),
    );
    assert.ok(
      task.markSchemePages.every((page) =>
        extracted.pageAudit.markScheme.visuallyReviewedPages.includes(page),
      ),
    );
    assert.equal(
      task.criteria.reduce((sum, criterion) => sum + criterion.marks, 0),
      task.originalMarks,
    );
    assert.ok(
      task.syllabusMappings.every((mapping) =>
        syllabus.points.some((point) => point.id === mapping.pointId),
      ),
    );
    assert.equal(task.humanReviewed, false);
    assert.equal(task.templateLinkStatus, 'candidate-only');
  }
});
