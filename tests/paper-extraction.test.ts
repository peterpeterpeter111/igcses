import { test } from 'node:test';
import assert from 'node:assert/strict';
import extracted from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import syllabus from '../research/syllabus/4PH1-forces-and-motion.json' with { type: 'json' };
import leafIndex from '../research/reviews/2026-09-10-physics-leaf-index.json' with { type: 'json' };

void test('text leaf index reconciles all 110 marks without promoting processing status', () => {
  assert.equal(leafIndex.indexedLeafCount, leafIndex.tasks.length);
  assert.equal(new Set(leafIndex.tasks.map((t) => t.taskId)).size, 51);
  assert.equal(
    leafIndex.tasks.reduce((n, t) => n + t.originalMarks, 0),
    110,
  );
  for (const group of leafIndex.questionTotals) {
    assert.equal(
      leafIndex.tasks
        .filter((t) => t.questionPath.split('.')[0] === String(group.question))
        .reduce((n, t) => n + t.originalMarks, 0),
      group.marks,
    );
  }
  for (const task of extracted.tasks) {
    const indexed = leafIndex.tasks.find((t) => t.taskId === task.taskId);
    assert.equal(indexed?.originalMarks, task.originalMarks);
  }
  assert.equal(leafIndex.questionPaperSha256, extracted.documents[0].sha256);
  assert.equal(leafIndex.markSchemeSha256, extracted.documents[1].sha256);
  assert.equal(leafIndex.fullyProcessed, false);
  assert.equal(leafIndex.visualPageAuditComplete, false);
});

void test('Physics extraction keeps source pages, documents, task marks and raw index distinct', () => {
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
