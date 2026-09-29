import { test } from 'node:test';
import assert from 'node:assert/strict';
import { additionalPaperCandidates, obtainedPaperCandidates, paperCoverReview } from '../lib/paper-discovery.ts';
import rawLedger from '../research/paper-ledger.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };

void test('new Mathematics downloads remain unreviewed candidates outside the original index', () => {
  assert.equal(additionalPaperCandidates.length, 1);
  const [candidate] = obtainedPaperCandidates('4MB1');
  assert.ok(candidate);
  assert.equal(obtainedPaperCandidates('4PH1').length, 0);
  assert.equal(candidate.identityStatus, 'candidate-awaiting-review');
  assert.equal(candidate.processingStatus, 'obtained-only');
  assert.equal(candidate.coverVisuallyReviewed, false);
  assert.equal(candidate.pairingVerified, false);
  assert.equal(candidate.indexedTasks, 0);
  assert.equal(candidate.detailedTasks, 0);
  assert.equal(candidate.fullyProcessed, false);
  assert.equal(candidate.activeTemplates, 0);
  assert.equal(candidate.textObservations.reviewStatus, 'unverified-text-only');
  assert.notEqual(candidate.textObservations.printedDate, candidate.textObservations.questionPaperFilenameDate);
  assert.ok(candidate.downloadAttempts.some((attempt) => attempt.accessStatus === 'blocked'));
  for (const document of [candidate.questionPaper, candidate.markScheme]) {
    assert.equal(new URL(document.url).hostname, 'qualifications.pearson.com');
    assert.equal(document.httpStatus, 200);
    assert.match(document.sha256, /^[a-f0-9]{64}$/);
    assert.ok(document.byteCount > 0 && document.pageCount > 0);
  }
  assert.equal(rawLedger.length, 390);
  assert.equal(rawLedger.filter((row) => row.qualification === '4MB1').length, 0);
  assert.equal(batch.records.length, 5);
  assert.equal(batch.records.filter((row) => row.qualification === '4MB1').length, 0);
});

void test('cover review binds to exact downloaded bytes and never claims whole-paper review', () => {
  const candidate = obtainedPaperCandidates('4MB1')[0];
  const review = paperCoverReview(candidate);
  assert.ok(review);
  assert.equal(review.identityStatus, 'cover-checked');
  assert.equal(review.coverPairingStatus, 'matched');
  assert.equal(review.wholePaperSchemeMatchVerified, false);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.fullyProcessed, false);
  assert.equal(review.activeTemplates, 0);
  assert.deepEqual(review.questionPaperVisualPages, [1]);
  assert.deepEqual(review.markSchemeVisualPages, [1, 2]);
  assert.equal(review.printedDate, '2024-05-14');
  assert.equal(review.printedTotalMarks, 100);
  assert.equal(paperCoverReview({ ...candidate, questionPaper: { ...candidate.questionPaper, sha256: 'different' } }), null);
  assert.equal(paperCoverReview({ ...candidate, markScheme: { ...candidate.markScheme, sha256: 'different' } }), null);
});
