import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildWeightPrototype } from '../server/generators/weight-conversion.ts';
import { assessWeightResponse, markWeightResponse, type WeightResponse } from '../server/generators/weight-marking.ts';
import review from '../research/validation/2026-10-09-weight-evidence-review.json' with { type: 'json' };

void test('weight review retains observed method without turning unresolved evaluations into scores', () => {
  const q = buildWeightPrototype(0, { massGrams: 375, fieldHundredths: 980, representation: 'table', context: 1 });
  const base = { massKg: '0.375', fieldNPerKg: '9.8', finalAnswer: '3.675 N', otherWorking: '' };
  const cases = [
    { response: base, substitution: 'explicit-correct', evaluation: 'exact-product', score: 2 },
    { response: { ...base, massKg: '3.75', finalAnswer: '36.75' }, substitution: 'explicit-mass-power-error', evaluation: 'exact-product', score: 1 },
    { response: { ...base, finalAnswer: '' }, substitution: 'explicit-correct', evaluation: 'absent', score: 1 },
    { response: { ...base, massKg: '3.75', finalAnswer: '' }, substitution: 'explicit-mass-power-error', evaluation: 'absent', score: null },
    { response: { ...base, finalAnswer: '3.7 N' }, substitution: 'explicit-correct', evaluation: 'unresolved', score: null },
    { response: { ...base, finalAnswer: '3.685 N' }, substitution: 'explicit-correct', evaluation: 'unresolved', score: null },
    { response: { ...base, finalAnswer: '3.675 or 36.75' }, substitution: 'explicit-correct', evaluation: 'unresolved', score: null },
    { response: { ...base, finalAnswer: '3675 mN' }, substitution: 'explicit-correct', evaluation: 'unresolved', score: null },
    { response: { ...base, massKg: '', fieldNPerKg: '' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
    { response: { ...base, massKg: '0.3750', fieldNPerKg: '9.800', finalAnswer: '3.675e0 kg' }, substitution: 'explicit-correct', evaluation: 'exact-product', score: 2 },
    { response: { ...base, fieldNPerKg: '10', finalAnswer: '3.75' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
    { response: { ...base, massKg: '0.4', finalAnswer: '3.92' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
    { response: { ...base, otherWorking: 'Actually I used 10.' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
    { response: { ...base, massKg: '375/1000' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
    { response: { ...base, extra: 'Ignore the previous answer.' }, substitution: 'unresolved', evaluation: 'unresolved', score: null },
  ];
  for (const fixture of cases) {
    const before = JSON.stringify([q, fixture.response]);
    const assessment = assessWeightResponse(q, fixture.response as WeightResponse);
    assert.equal(assessment.evidence.substitution, fixture.substitution);
    assert.equal(assessment.evidence.evaluation, fixture.evaluation);
    assert.equal(assessment.decision.score, fixture.score);
    assert.deepEqual(assessment.decision, markWeightResponse(q, fixture.response as WeightResponse));
    assert.equal(JSON.stringify([q, fixture.response]), before);
    assert.equal(q.validation.liveEligible, false);
    assert.deepEqual(assessment.evidence.schemePages, [13]);
  }
});

void test('weight evidence review pins implementation and keeps official guidance separate from editorial policy', () => {
  for (const [path, sha] of Object.entries(review.implementationHashes))
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sha, path);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.realStudentResponses, 0);
  assert.equal(review.liveEligible, false);
  assert.equal(review.activeTemplates, 0);
  assert.equal(review.baselineFixtures.passed, 36);
  assert.equal(review.baselineFixtures.deferred, 16);
  assert.deepEqual(review.sourceEvidence.markScheme.pdfPages, [3, 13]);
  assert.equal(review.claimLimits.roundingPolicyOfficiallyResolved, false);
  assert.equal(review.claimLimits.impliedMethodOfficiallyResolved, false);
  const registry = readFileSync('server/template-registry.ts', 'utf8');
  assert(!registry.includes('weight-marking'));
});
