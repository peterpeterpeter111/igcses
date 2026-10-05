import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMatrixAdditionPrototype, buildMatrixAdditionPrototype, validateMatrixAdditionPrototype } from '../server/generators/matrix-addition.ts';
import { generateQuadraticPrototype, validateQuadraticPrototype } from '../server/generators/monic-quadratic.ts';
import { generateWeightPrototype, validateWeightPrototype } from '../server/generators/weight-conversion.ts';
import { generateResultantPrototype, buildResultantPrototype, validateResultantPrototype } from '../server/generators/collinear-resultant.ts';
import { generateGroupedMeanPrototype, buildGroupedMeanPrototype, validateGroupedMeanPrototype } from '../server/generators/grouped-mean.ts';
import { generateRetrievalPrototype, validateRetrievalPrototype } from '../server/generators/retrieve-two-causes.ts';

// Inspect the real packages, including nested row arrays, rubric records and
// parameter arrays. A frozen outer object alone would not protect a scheme.
function checkEveryObject(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  assert.equal(Object.isFrozen(value), true);
  assert.throws(() => Object.defineProperty(value, 'testMutation', { value: 1 }), TypeError);
  return 1 + Object.values(value).reduce<number>((sum, child) => sum + checkEveryObject(child), 0);
}
const fixtures = [
  { name: 'English retrieval', create: () => generateRetrievalPrototype(7), validate: (q: unknown) => validateRetrievalPrototype(q as ReturnType<typeof generateRetrievalPrototype>) },
  { name: 'matrix', create: () => generateMatrixAdditionPrototype(7), validate: (q: unknown) => validateMatrixAdditionPrototype(q as ReturnType<typeof generateMatrixAdditionPrototype>) },
  { name: 'quadratic', create: () => generateQuadraticPrototype(7), validate: (q: unknown) => validateQuadraticPrototype(q as ReturnType<typeof generateQuadraticPrototype>) },
  { name: 'weight', create: () => generateWeightPrototype(7), validate: (q: unknown) => validateWeightPrototype(q as ReturnType<typeof generateWeightPrototype>) },
  { name: 'resultant', create: () => generateResultantPrototype(7), validate: (q: unknown) => validateResultantPrototype(q as ReturnType<typeof generateResultantPrototype>) },
  { name: 'grouped mean', create: () => generateGroupedMeanPrototype(7), validate: (q: unknown) => validateGroupedMeanPrototype(q as ReturnType<typeof generateGroupedMeanPrototype>) },
];
for (const fixture of fixtures) void test(`${fixture.name}: question, parameters and scheme are fixed before the caller can answer`, () => {
  const q = fixture.create(); const before = JSON.stringify(q);
  assert.ok(checkEveryObject(q) >= 7);
  assert.throws(() => Object.assign(q.publicQuestion, { prompt: 'Different task' }), TypeError);
  assert.throws(() => Object.assign(q.validation, { liveEligible: true }), TypeError);
  assert.equal(JSON.stringify(q), before);
  assert.equal(fixture.validate(q), true);
  assert.equal(q.validation.liveEligible, false);
  // Freeze is not an authenticity guarantee. A correct deserialised copy still
  // validates; a later live storage layer must separately bind its identity.
  assert.equal(fixture.validate(structuredClone(q)), true);
});
void test('caller-owned parameter arrays stay separate from the frozen question snapshot', () => {
  const matrix = { magnitudes: [3, 2, 5, 1, 2, 4, 4, 2] };
  const forces = { task: 'resultant' as const, representation: 'table' as const, axis: 'vertical' as const, context: 0, forces: [32, -20] };
  const grouped = { frequencies: [22, 13, 9, 12, 4] };
  const questions = [buildMatrixAdditionPrototype(0, matrix), buildResultantPrototype(0, forces), buildGroupedMeanPrototype(0, grouped)];
  const snapshots = questions.map(q => JSON.stringify(q));
  matrix.magnitudes[0] = 9; forces.forces[0] = 100; grouped.frequencies[0] = 25;
  questions.forEach((q, i) => assert.equal(JSON.stringify(q), snapshots[i]));
  assert.deepEqual(questions[0].parameters, { magnitudes: [3, 2, 5, 1, 2, 4, 4, 2] });
  assert.deepEqual(questions[1].parameters, { task: 'resultant', representation: 'table', axis: 'vertical', context: 0, forces: [32, -20] });
  assert.deepEqual(questions[2].parameters, { frequencies: [22, 13, 9, 12, 4] });
});
void test('nested answer and scheme mutations fail instead of silently changing later marking', () => {
  const matrix = generateMatrixAdditionPrototype(1);
  assert.throws(() => { matrix.privateSolution.sum[0][0] = 999; }, TypeError);
  assert.throws(() => { matrix.publicQuestion.stimulus.A[0].push(3); }, TypeError);
  const quadratic = generateQuadraticPrototype(1);
  assert.throws(() => { quadratic.privateSolution.rubric.partialCredit = 'Credit everything'; }, TypeError);
  const weight = generateWeightPrototype(1);
  assert.throws(() => { weight.privateSolution.criteria[0].description = 'Credit everything'; }, TypeError);
  const resultant = generateResultantPrototype(1);
  assert.throws(() => { resultant.privateSolution.working.splice(0); }, TypeError);
  const grouped = generateGroupedMeanPrototype(1);
  assert.throws(() => { grouped.privateSolution.exactMean.numerator = 0; }, TypeError);
});
