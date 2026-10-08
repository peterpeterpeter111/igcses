import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/validation/2026-09-18-resultant-demand-review.json' with { type: 'json' };
import fixtures from '../research/validation/resultant-structure-cases.json' with { type: 'json' };
import family from '../research/templates/4PH1-collinear-resultant.v0.1.0.json' with { type: 'json' };
import { buildResultantPrototype, type ForceParameters } from '../server/generators/collinear-resultant.ts';

void test('demand review covers every implemented structure without claiming difficulty equivalence', () => {
  assert.equal(review.sourceTaskId, family.sourceTasks[0].taskId);
  assert.deepEqual(review.sourceEvidence.questionPaper, family.sourceTasks[0].questionPaper);
  assert.deepEqual(review.sourceEvidence.markScheme, family.sourceTasks[0].markScheme);
  assert.equal(review.structures.length, 16);
  assert.equal(new Set(review.structures.map((s) => s.signature)).size, 16);
  let matches = 0;
  for (const fixture of fixtures.fixtures) {
    const entry = review.structures.find((s) => s.fixtureId === fixture.id)!;
    assert.ok(entry, fixture.id);
    const question = buildResultantPrototype(0, fixture.parameters as ForceParameters);
    assert.equal(entry.signature, question.structuralSignature);
    const sameCore = fixture.parameters.task === 'resultant' && fixture.parameters.forces.length === 2;
    assert.equal(entry.sourceRelation, sameCore ? 'same-core-operations-with-representation-adaptation' : 'extended-demand');
    matches += sameCore ? 1 : 0;
    assert.equal(entry.proposedMarkBasis.validated, false);
    assert.equal(entry.requiresSeparateDifficultyCalibration, true);
    assert.equal(entry.proposedMarkBasis.magnitude + entry.proposedMarkBasis.direction, 2);
    assert.equal(entry.proposedMarkBasis.methodCredit, 0);
    assert.equal(question.validation.liveEligible, false);
  }
  assert.equal(matches, review.conclusions.closestOperationMatches);
  assert.equal(review.structures.length - matches, review.conclusions.extendedDemandStructures);
  assert.equal(family.status, 'provisional');
  assert.deepEqual(family.customQuiz.validatedMarks, []);
  assert.equal(review.humanReviewed, false);
});

void test('template ledgers exactly reflect saved families, provisional links and implementation status', () => {
  const result = JSON.parse(execFileSync('python3', ['scripts/export-template-ledger.py', '--date', '2026-10-08', '--check'], { encoding: 'utf8' }));
  assert.equal(result.families, 15);
  assert.equal(result.sourceLinks, 19);
  assert.equal(result.activeTemplates, 0);
  assert.equal(result.checkOnly, true);
});
