import assert from 'node:assert/strict';
import fs from 'node:fs';

const plan = JSON.parse(
  fs.readFileSync(
    'research/batches/2026-09-08-cross-subject-lower-01.plan.json',
    'utf8',
  ),
);
const ledger = JSON.parse(
  fs.readFileSync('research/paper-ledger.json', 'utf8'),
);
const byId = new Map(ledger.map((row) => [row.id, row]));
assert.equal(plan.status, 'blocked-before-download');
assert.equal(plan.pairs.length, 5);
assert.equal(plan.counts.paperDocumentsObtained, 0);
assert.equal(plan.counts.markSchemeDocumentsObtained, 0);
assert.equal(plan.counts.pairsIndexed, 0);
assert.equal(plan.counts.pairsFullyProcessed, 0);
assert.equal(new Set(plan.pairs.map((p) => p.qualification)).size, 5);
for (const pair of plan.pairs) {
  const qp = byId.get(pair.qpLegacyLinkId);
  const ms = byId.get(pair.msLegacyLinkId);
  assert(qp && ms, `missing ledger id for ${pair.paperId}`);
  assert.equal(qp.qualification, pair.qualification);
  assert.equal(ms.qualification, pair.qualification);
  assert.equal(qp.documentType, 'question-paper');
  assert.equal(ms.documentType, 'mark-scheme');
  assert.equal(qp.accessStatus, 'discovered');
  assert.equal(ms.accessStatus, 'discovered');
}
assert(!plan.pairs.some((p) => p.qualification === '4MB1'));
console.log(
  JSON.stringify(
    {
      plan: plan.batchId,
      valid: true,
      pairs: plan.pairs.length,
      obtained: 0,
      indexed: 0,
      processed: 0,
      astraFilesChanged: false,
    },
    null,
    2,
  ),
);
