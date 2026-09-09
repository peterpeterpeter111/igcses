import { test } from 'node:test';
import assert from 'node:assert/strict';
import paperLedger from '../research/paper-ledger.json' with { type: 'json' };
import coverage from '../research/coverage.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with {
  type: 'json',
};

test('raw paper ledger keeps discovery and processing states separate', () => {
  assert.equal(paperLedger.length, 390);
  assert.equal(new Set(paperLedger.map((row) => row.id)).size, 390);
  assert.ok(paperLedger.every((row) => row.accessStatus === 'discovered'));
  assert.ok(paperLedger.every((row) => row.processingStatus === 'unprocessed'));
  assert.deepEqual(
    Object.fromEntries(
      ['4BI1', '4CH1', '4EB1', '4HB1', '4MB1', '4PH1'].map((code) => [
        code,
        paperLedger.filter((row) => row.qualification === code).length,
      ]),
    ),
    {
      '4BI1': 92,
      '4CH1': 84,
      '4EB1': 56,
      '4HB1': 74,
      '4MB1': 0,
      '4PH1': 84,
    },
  );
});

test('candidate syllabus rows remain explicitly unverified', () => {
  assert.equal(coverage.length, 710);
  assert.ok(coverage.every((row) => row.drafted === false));
  assert.ok(coverage.every((row) => row.sourceChecked === false));
  assert.ok(coverage.every((row) => row.humanReviewed === false));
  assert.ok(
    coverage.every((row) => row.extractionStatus === 'candidate-needs-page-verification'),
  );
});

test('the bounded five-pair batch is indexed-only', () => {
  assert.equal(batch.status, 'indexed-only');
  assert.equal(batch.records.length, 5);
  assert.ok(batch.records.every((row) => row.processingStatus === 'indexed-only'));
  assert.ok(batch.records.every((row) => row.fullyProcessed === false));
  assert.equal(batch.counts.pairsFullyProcessed, 0);
  assert.equal(batch.counts.pairsObtained, 5);
});
