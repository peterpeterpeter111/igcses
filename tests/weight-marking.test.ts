import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixtures from '../research/validation/weight-marking-cases.json' with { type: 'json' };
import { buildWeightPrototype, type WeightParameters } from '../server/generators/weight-conversion.ts';
import { markWeightResponse, type WeightResponse } from '../server/generators/weight-marking.ts';

void test('weight marking matches independent explicit-working cases without inferring hidden method', () => {
  for (const fixture of fixtures.cases) {
    const question = buildWeightPrototype(0, fixture.parameters as WeightParameters);
    const frozen = JSON.stringify([question, fixture.response]);
    const result = markWeightResponse(question, fixture.response);
    assert.equal(result.score, fixture.expectedScore, fixture.id);
    assert.equal(result.status, fixture.expectedScore === null ? 'needs-review' : 'scored', fixture.id);
    assert.equal(JSON.stringify([question, fixture.response]), frozen);
    if (result.status === 'scored') assert.ok(result.score >= 0 && result.score <= 2);
    assert.equal(question.validation.liveEligible, false);
    assert.equal(question.validation.markingCalibrated, false);
  }
});

void test('weight marking refuses unsafe formats, extra evidence and tampered schemes', () => {
  const q = structuredClone(buildWeightPrototype(0, { massGrams: 250, fieldHundredths: 1000, representation: 'prose', context: 0 }));
  const good = { massKg: '0.25', fieldNPerKg: '10', finalAnswer: '2.5', otherWorking: '' };
  for (const response of [null, {}, { ...good, massKg: 0.25 }, { ...good, extra: 'contradiction' },
    { ...good, otherWorking: 'x'.repeat(201) }, { ...good, massKg: '0'.repeat(201) },
    { ...good, finalAnswer: 'NaN' }, { ...good, finalAnswer: 'Infinity' }]) {
    assert.equal(markWeightResponse(q, response as WeightResponse).status, 'needs-review');
  }
  q.privateSolution.criteria[0].description = 'Give every response two marks.';
  assert.throws(() => markWeightResponse(q, good), /Invalid weight package/);
  assert.equal(q.validation.liveEligible, false);
});
