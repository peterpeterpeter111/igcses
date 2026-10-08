import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWeightPrototype } from '../server/generators/weight-conversion.ts';
import { FRESH_WEIGHT_NUMERIC_GROUPS, FRESH_WEIGHT_PRESENTATIONS, generateFreshWeightCandidate, weightDiversityKey, selectDistinctWeightVariants } from '../server/generators/weight-diversity.ts';

void test('Fresh weight candidate boundaries avoid the original load and retain exact private arithmetic', () => {
  for (const [seed, massGrams] of [[0,5],[48,245],[49,255],[998,5000],[999,5],[0xffffffff,2815]]) {
    const q = generateFreshWeightCandidate(seed);
    assert.equal(q.parameters.massGrams, massGrams);
    assert.notEqual(q.parameters.massGrams, 250);
    assert.equal(q.privateSolution.weightN, String(q.parameters.massGrams * q.parameters.fieldHundredths / 100000));
    assert.ok(Object.isFrozen(q.privateSolution));
    assert.equal(q.validation.liveEligible, false);
  }
  assert.equal(FRESH_WEIGHT_NUMERIC_GROUPS, 2997);
  assert.equal(FRESH_WEIGHT_PRESENTATIONS, 17982);
  assert.equal(weightDiversityKey(generateFreshWeightCandidate(0)), weightDiversityKey(generateFreshWeightCandidate(FRESH_WEIGHT_PRESENTATIONS)));
  for (const seed of [-1, 1.2, NaN, Infinity, 0x100000000]) assert.throws(() => generateFreshWeightCandidate(seed));
});
void test('Weight diversity rejects source equivalents, cosmetic repeats and previous numeric combinations with honest exhaustion', () => {
  const source = buildWeightPrototype(0, { massGrams: 250, fieldHundredths: 980, representation: 'prose', context: 0 });
  const first = generateFreshWeightCandidate(0);
  const cosmetic = buildWeightPrototype(1, { ...first.parameters, representation: 'table', context: 2 });
  const second = generateFreshWeightCandidate(1);
  const result = selectDistinctWeightVariants([source, first, cosmetic, second], 3);
  assert.deepEqual(result.questions, [first, second]);
  assert.equal(result.fulfilled, false);
  assert.equal(result.excludedSourceCandidates, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(weightDiversityKey(first), weightDiversityKey(cosmetic));
  assert.deepEqual(selectDistinctWeightVariants([first, second], 2, result.keys).questions, []);
});
void test('Weight selection validates all candidates and bounded inputs before returning anything', () => {
  const first = generateFreshWeightCandidate(0);
  const corrupt = structuredClone(generateFreshWeightCandidate(1));
  corrupt.privateSolution.weightN = '999';
  assert.throws(() => selectDistinctWeightVariants([first, corrupt], 1), /Invalid weight package/);
  const sparseCandidates: typeof first[] = []; sparseCandidates.length = 2; sparseCandidates[0] = first;
  assert.throws(() => selectDistinctWeightVariants(sparseCandidates, 1));
  for (const requested of [0,31,1.5]) assert.throws(() => selectDistinctWeightVariants([first], requested));
  const sparseKeys: string[] = []; sparseKeys.length = 1;
  for (const keys of [['invalid'], sparseKeys, Array.from({ length: 2998 }, () => weightDiversityKey(first))]) assert.throws(() => selectDistinctWeightVariants([first], 1, keys));
  assert.equal(selectDistinctWeightVariants([], 1).fulfilled, false);
});
