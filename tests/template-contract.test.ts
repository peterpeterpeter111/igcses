import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateContractErrors } from '../scripts/template-contract.mjs';
import physics from '../research/templates/4PH1-collinear-resultant.v0.1.0.json' with { type: 'json' };
import english from '../research/templates/4EB1-retrieve-two-causes.v0.1.0.json' with { type: 'json' };

// Hypothetical metadata fixture tests the gate; it is never saved as evidence,
// imported by the registry, or counted as an actually validated family.
function promotionFixture() {
  const f = structuredClone(physics);
  f.status = 'validated';
  f.customQuiz.adaptationStatus = 'validated';
  f.validation.status = 'passed';
  f.review.pedagogyStatus = 'agent-reviewed';
  f.review.blockers = [];
  f.assessmentObjectives = ['AO2'];
  f.transformations.forEach((t) => { if (t.status === 'candidate') t.status = 'validated'; });
  return { ...f, customQuiz: { ...f.customQuiz, validatedMarks: [2] } };
}

void test('saved families remain valid provisional contracts', () => {
  for (const f of [physics, english]) {
    assert.deepEqual(templateContractErrors(f), []);
    assert.equal(f.status, 'provisional');
    assert.deepEqual(f.customQuiz.validatedMarks, []);
  }
});

void test('promotion rejects missing maxima, unfinished review and invented mapping readiness', () => {
  assert.deepEqual(templateContractErrors(promotionFixture()), []);
  const cases: ((f: ReturnType<typeof promotionFixture>) => void)[] = [
    (f) => { f.customQuiz.validatedMarks = []; },
    (f) => { f.customQuiz.adaptationStatus = 'pending'; },
    (f) => { f.customQuiz.validatedMarks = [4]; },
    (f) => { f.customQuiz.candidateMarks = [2, 4]; f.customQuiz.validatedMarks = [2, 4]; },
    (f) => { f.review.reviewer = ' '; },
    (f) => { f.review.humanReviewed = true; },
    (f) => { f.review.pedagogyStatus = 'human-reviewed'; },
    (f) => { f.syllabusRefs[0].mappingStatus = 'provisional'; },
    (f) => { f.assessmentObjectives = ['unassigned-pending-official-AO-review']; },
    (f) => { f.transformations[0].status = 'candidate'; },
    (f) => { f.runtime.generatorId = ''; },
    (f) => { f.validation.testedSeeds = [1]; },
  ];
  for (const [index, mutate] of cases.entries()) {
    const f = promotionFixture();
    mutate(f);
    assert.ok(templateContractErrors(f).length > 0, `mutation ${index} must fail`);
  }
});

void test('contract rejects unreachable totals and invalid parameter ranges', () => {
  for (const mutate of [
    (f: typeof physics) => { f.marking.maximum = 4; },
    (f: typeof physics) => { f.marking.criteria[1].id = f.marking.criteria[0].id; },
    (f: typeof physics) => { f.parameters[0].domain.minimum = 300; },
    (f: typeof physics) => { f.parameters[0].domain.step = 0.5; },
    (f: typeof physics) => { f.parameters[1].id = f.parameters[0].id; },
  ]) {
    const f = structuredClone(physics);
    mutate(f);
    assert.ok(templateContractErrors(f).length > 0);
  }
});

void test('level rubric must cover each score once without gaps or overlap', () => {
  const f = { ...promotionFixture(), marking: {
    ...physics.marking, method: 'levels', criteria: [],
    levelRubric: [
      { level: 0, minMarks: 0, maxMarks: 0, descriptor: 'No creditable response.' },
      { level: 1, minMarks: 1, maxMarks: 2, descriptor: 'One or two linked creditable elements.' },
    ],
  } };
  assert.deepEqual(templateContractErrors(f), []);
  for (const band of [
    { level: 1, minMarks: 0, maxMarks: 2, descriptor: 'Overlap' },
    { level: 1, minMarks: 2, maxMarks: 2, descriptor: 'Gap' },
    { level: 1, minMarks: 1, maxMarks: 3, descriptor: 'Beyond maximum' },
  ]) {
    f.marking.levelRubric[1] = band;
    assert.ok(templateContractErrors(f).length > 0);
  }
});
