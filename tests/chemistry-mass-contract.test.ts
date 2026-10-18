import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import family from '../research/templates/4CH1-relative-formula-mass.v0.1.0.json' with { type: 'json' };
import evidence from '../research/validation/2026-10-19-chemistry-mass-contract.json' with { type: 'json' };
import q4 from '../research/extractions/4CH1-2024-June-1-standard/Q4.json' with { type: 'json' };
import review from '../research/reviews/2026-10-19-CHEMISTRY-MASS-CONTRACT-REVIEW.json' with { type: 'json' };
import { activeFamilies } from '../server/template-registry.ts';

void test('Chemistry mass contract preserves the exact two-mark source concessions and stays inactive', () => {
  const source = q4.tasks.find((t) => t.questionPath === '4.a.ii');
  assert.ok(source);
  assert.deepEqual(review.blockingContractDefects, []);
  assert.equal(review.promotionAuthorised, false);
  for (const file of review.reviewedFiles) {
    assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.sha256);
  }
  assert.deepEqual(evidence.sourcePolicy, source.sourceScoring);
  assert.equal(createHash('sha256').update(readFileSync(evidence.sourcePartition.path)).digest('hex'), evidence.sourcePartition.sha256);
  assert.equal(family.sourceTasks[0]?.taskId, source.taskId);
  assert.deepEqual(family.sourceTasks[0]?.questionPaper.pdfPages, [2, 8]);
  assert.deepEqual(family.sourceTasks[0]?.markScheme.pdfPages, source.markSchemePages);
  assert.equal(family.marking.maximum, 2);
  assert.equal(evidence.sourceFixture.correctAnswerNoWorkingCredit, 2);
  assert.equal(evidence.sourceFixture.correctSubstitutionWrongEvaluationCredit, 1);
  assert.equal(evidence.sourceFixture.wrongFormulaEcfAllowed, false);
  assert.equal(family.status, 'provisional');
  assert.equal(family.runtime.implemented, false);
  assert.deepEqual(family.customQuiz.validatedMarks, []);
  assert.equal(activeFamilies.length, 0);
});

void test('Every finite chain candidate has independently counted atoms and an exact dimensionless mass', () => {
  assert.equal(evidence.candidateCases.length, 10);
  const results = new Set<number>();
  for (const c of evidence.candidateCases) {
    // One amino end NH2, n CH2 units, one carboxyl end COOH.
    const structural = { C: c.n + 1, H: 2 + 2 * c.n + 1, N: 1, O: 2 };
    assert.deepEqual(c.atomCounts, structural);
    const sum = structural.C * 12 + structural.H + structural.N * 14 + structural.O * 16;
    assert.equal(c.relativeFormulaMass, sum);
    assert.notEqual(sum, evidence.sourceFixture.relativeFormulaMass);
    assert.equal(c.calibrated, false);
    results.add(sum);
  }
  assert.equal(results.size, 10);
  assert.equal(evidence.difficultyEquivalenceValidated, false);
  assert.equal(evidence.generatorImplemented, false);
  assert.equal(evidence.automatedMarkerImplemented, false);
});
