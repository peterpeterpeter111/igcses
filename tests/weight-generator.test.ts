import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeightPrototype, generateWeightPrototype, validateWeightPrototype, type WeightParameters, type WeightPrototype } from '../server/generators/weight-conversion.ts';

void test('weight conversion matches independently specified answers in both representations', () => {
  for (const [grams, field, kg, answer] of [
    [5, 980, '0.005', '0.049'], [250, 1000, '0.25', '2.5'],
    [250, 980, '0.25', '2.45'], [250, 981, '0.25', '2.4525'],
    [375, 980, '0.375', '3.675'], [5000, 981, '5', '49.05'],
  ] as const) {
    for (const representation of ['prose', 'table'] as const) {
      const q = buildWeightPrototype(0, { massGrams: grams, fieldHundredths: field, representation, context: 0 });
      assert.equal(q.privateSolution.massKg, kg);
      assert.equal(q.privateSolution.weightN, answer);
      assert.equal(q.validation.liveEligible, false);
      assert.equal(q.validation.markingCalibrated, false);
      assert.deepEqual(Object.keys(q.publicQuestion).sort(), ['maximumMarks', 'prompt', 'stimulus']);
      assert.equal(q.privateSolution.criteria.reduce((n, c) => n + c.marks, 0), 2);
    }
  }
});

void test('weight generation is deterministic, varied and bounded without live activation', () => {
  const seen = new Set<string>(), structures = new Set<string>(), fields = new Set<number>(), contexts = new Set<number>();
  for (let seed = 0; seed < 200; seed++) {
    const q = generateWeightPrototype(seed);
    assert.deepEqual(q, generateWeightPrototype(seed));
    assert.ok(validateWeightPrototype(q));
    seen.add(JSON.stringify(q.publicQuestion));
    structures.add(q.structuralSignature); fields.add(q.parameters.fieldHundredths); contexts.add(q.parameters.context);
    assert.equal(q.family.status, 'provisional');
    assert.equal(q.validation.liveEligible, false);
  }
  assert.ok(seen.size > 100);
  assert.equal(structures.size, 2); assert.equal(fields.size, 3); assert.equal(contexts.size, 3);
  let boundaryCases = 0;
  for (const massGrams of [5, 10, 995, 1000, 4995, 5000])
    for (const fieldHundredths of [980, 981, 1000] as const)
      for (const representation of ['prose', 'table'] as const)
        for (const context of [0, 1, 2]) {
          assert.ok(validateWeightPrototype(buildWeightPrototype(0xffffffff, { massGrams, fieldHundredths, representation, context })));
          boundaryCases++;
        }
  assert.equal(boundaryCases, 108);
});

void test('weight prototype rejects invalid domains and altered givens, scheme or readiness', () => {
  const params: WeightParameters = { massGrams: 250, fieldHundredths: 1000, representation: 'prose', context: 0 };
  for (const massGrams of [0, 4, 6, 5005, Infinity, NaN]) assert.throws(() => buildWeightPrototype(0, { ...params, massGrams }));
  for (const fieldHundredths of [979, 982, 1001, 980.1]) assert.throws(() => buildWeightPrototype(0, { ...params, fieldHundredths } as WeightParameters));
  for (const seed of [-1, 0.5, 2 ** 32, NaN]) assert.throws(() => generateWeightPrototype(seed));
  for (const context of [-1, 0.5, 3]) assert.throws(() => buildWeightPrototype(0, { ...params, context }));
  for (const mutate of [
    (q: WeightPrototype) => { q.publicQuestion.stimulus += ' The answer is 2.5 N.'; },
    (q: WeightPrototype) => { q.publicQuestion.prompt = 'Find the mass.'; },
    (q: WeightPrototype) => { q.parameters.massGrams = 500; },
    (q: WeightPrototype) => { q.privateSolution.weightN = '25'; },
    (q: WeightPrototype) => { q.privateSolution.massKg = '250'; },
    (q: WeightPrototype) => { q.privateSolution.working = []; },
    (q: WeightPrototype) => { q.privateSolution.criteria[0].description = 'Any answer earns a mark.'; },
    (q: WeightPrototype) => { q.privateSolution.sourceNotes = []; },
    (q: WeightPrototype) => { (q.validation as { liveEligible: boolean }).liveEligible = true; },
    (q: WeightPrototype) => { (q.validation as { markingCalibrated: boolean }).markingCalibrated = true; },
  ]) {
    const q = structuredClone(buildWeightPrototype(0, params)); mutate(q); assert.equal(validateWeightPrototype(q), false);
  }
});
