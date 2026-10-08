import { test } from 'node:test';
import assert from 'node:assert/strict';
import directed from '../research/templates/4EB1.source-directed-letter.v0.1.0.json' with { type: 'json' };
import argument from '../research/templates/4EB1.argumentative-extended-writing.v0.1.0.json' with { type: 'json' };
import { templateContractErrors } from '../scripts/template-contract.mjs';

void test('English writing preserves independent official objective grids without certifying a generator', () => {
  for (const family of [directed, argument]) {
    assert.deepEqual(templateContractErrors(family), []);
    assert.equal(family.status, 'provisional');
    assert.equal(family.runtime.implemented, false);
    assert.deepEqual(family.customQuiz.validatedMarks, []);
    assert.equal(family.marking.method, 'composite-levels');
    assert.deepEqual(family.marking.criteria, []);
    assert.deepEqual(family.marking.levelRubric, []);
  }
  assert.deepEqual(directed.marking.componentRubrics.map((c) => [c.objective, c.maximum]), [['AO1', 10], ['AO4', 12], ['AO5', 8]]);
  assert.deepEqual(argument.marking.componentRubrics.map((c) => [c.objective, c.maximum]), [['AO4', 20], ['AO5', 10]]);
});

void test('composite contract rejects collapsed objectives, wrong totals and unreachable band scores', () => {
  const cases: Array<(f: typeof directed) => void> = [
    (f) => { f.marking.componentRubrics.pop(); },
    (f) => { f.marking.componentRubrics[1].objective = 'AO1'; },
    (f) => { f.marking.componentRubrics[2].objective = 'AO3'; },
    (f) => { f.marking.maximum = 31; },
    (f) => { f.marking.componentRubrics[0].maximum = 11; },
    (f) => { f.marking.componentRubrics[0].levelRubric[2].minMarks += 1; },
    (f) => { f.marking.componentRubrics[1].levelRubric[0].maxMarks = 1; },
    (f) => { f.marking.componentRubrics[2].levelRubric[1].level = 0; },
    (f) => { Object.assign(f.marking, { levelRubric: f.marking.componentRubrics[0].levelRubric }); },
    (f) => { f.marking.method = 'levels'; },
    (f) => { f.assessmentObjectives.pop(); },
  ];
  for (const [index, mutate] of cases.entries()) {
    const family = structuredClone(directed);
    mutate(family);
    assert.ok(templateContractErrors(family).length > 0, `mutation ${index} must fail`);
  }
});
