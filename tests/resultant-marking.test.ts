import { test } from 'node:test';
import assert from 'node:assert/strict';
import cases from '../research/validation/resultant-marking-cases.json' with { type: 'json' };
import structures from '../research/validation/resultant-structure-cases.json' with { type: 'json' };
import {
  buildResultantPrototype,
  type ForceParameters,
} from '../server/generators/collinear-resultant.ts';
import { markResultantResponse } from '../server/generators/resultant-marking.ts';

void test('force marking matches hand-specified final-answer calibration cases', () => {
  for (const item of cases.cases) {
    const question = buildResultantPrototype(
      0,
      item.parameters as ForceParameters,
    );
    const frozen = JSON.stringify(question);
    const result = markResultantResponse(question, item.response);
    assert.equal(result.score, item.expectedScore, item.id);
    assert.equal(
      result.status,
      item.expectedScore === null ? 'needs-review' : 'scored',
      item.id,
    );
    assert.equal(JSON.stringify(question), frozen);
    if (result.status === 'scored') {
      assert.equal(
        result.score,
        result.criteria.magnitude + result.criteria.direction,
      );
      assert.ok(result.score >= 0 && result.score <= 2);
    }
  }
});

void test('force marking refuses tampered schemes and does not register a live family', () => {
  const question = buildResultantPrototype(0, {
    task: 'resultant',
    axis: 'vertical',
    representation: 'table',
    context: 0,
    forces: [32, -20],
  });
  question.privateSolution.criteria[0].description =
    'Award full marks for any answer.';
  assert.throws(
    () =>
      markResultantResponse(question, { magnitude: '1.2', direction: 'up' }),
    /Invalid force package/,
  );
  assert.equal(question.validation.liveEligible, false);
});

void test('all 16 force structures match independent answers and separate-credit outcomes', () => {
  const seen = new Set<string>();
  let outcomes = 0;
  for (const fixture of structures.fixtures) {
    const question = buildResultantPrototype(0, fixture.parameters as ForceParameters);
    seen.add(question.structuralSignature);
    assert.equal(question.privateSolution.magnitudeN, Number(fixture.independentAnswer.magnitude), fixture.id);
    assert.equal(question.privateSolution.direction, fixture.independentAnswer.direction, fixture.id);
    for (const response of fixture.responses) {
      const result = markResultantResponse(question, response);
      assert.equal(result.score, response.expectedScore, fixture.id);
      assert.equal(result.status, response.expectedScore === null ? 'needs-review' : 'scored', fixture.id);
      outcomes++;
    }
    assert.equal(question.validation.liveEligible, false);
  }
  assert.equal(seen.size, 16);
  assert.equal(outcomes, 96);
});
