// Offline source-derived prototype. Not registered for live quizzes.
export const GROUPED_MEAN_FAMILY = Object.freeze({ id: '4MB1.statistics.grouped-mean', version: '0.1.0', status: 'provisional', sourceTaskId: '4MB1-2024-summer-01-candidate.Q23.c' } as const);
export type GroupedMeanParameters = { frequencies: number[] };
const BOUNDS = [0, 2, 5, 10, 20, 40] as const;
const MIDPOINTS = [1, 3.5, 7.5, 15, 30];
const SOURCE = [22, 13, 9, 12, 4];
const RANGES = [[12, 27], [8, 19], [5, 15], [5, 17], [2, 10]];
export type GroupedMeanPrototype = {
  family: typeof GROUPED_MEAN_FAMILY;
  seed: number;
  parameters: GroupedMeanParameters;
  publicQuestion: { prompt: string; stimulus: { classes: { lower: number; upper: number; frequency: number }[]; lowerInclusive: false; upperInclusive: true; total: 60; unit: 'km' }; maximumMarks: 4 };
  privateSolution: { midpoints: number[]; products: number[]; weightedSum: number; exactMean: { numerator: number; denominator: 120 }; mean: number; rubric: string[] };
  validation: { liveEligible: false; markingCalibrated: false };
};
function assertSeed(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
}
function assertParameters(p: GroupedMeanParameters) {
  if (!p || Object.keys(p).join(',') !== 'frequencies' || !Array.isArray(p.frequencies) || p.frequencies.length !== 5 ||
    Array.from(p.frequencies).some((f, i) => !Number.isInteger(f) || f < RANGES[i][0] || f > RANGES[i][1]) ||
    p.frequencies.reduce((a, b) => a + b, 0) !== 60 ||
    p.frequencies.reduce((s, f, i) => s + 2 * MIDPOINTS[i] * f, 0) % 6 !== 0) throw new Error('Frequencies outside the finite grouped-mean domain');
}
// Enumerate a small finite domain once. Half-integer midpoints and total 60
// make twice the product sum integral; divisibility by 6 gives exact 2dp means.
const domain: number[][] = [];
for (let a = 12; a <= 27; a++) for (let b = 8; b <= 19; b++) for (let c = 5; c <= 15; c++) for (let d = 5; d <= 17; d++) {
  const f = [a, b, c, d, 60 - a - b - c - d];
  if (f[4] < 2 || f[4] > 10 || f.every((v, i) => v === SOURCE[i]) || f.reduce((s, v, i) => s + 2 * MIDPOINTS[i] * v, 0) % 6 !== 0) continue;
  domain.push(f);
}
export const GROUPED_MEAN_PARAMETER_SPACE = domain.length;
function content(p: GroupedMeanParameters) {
  const products = MIDPOINTS.map((m, i) => m * p.frequencies[i]);
  const weightedSum = products.reduce((a, b) => a + b, 0);
  return {
    publicQuestion: { prompt: 'A walking club records the distances travelled by 60 members. Calculate an estimate of the mean distance from the grouped table.',
      stimulus: { classes: p.frequencies.map((frequency, i) => ({ lower: BOUNDS[i], upper: BOUNDS[i + 1], frequency })), lowerInclusive: false as const, upperInclusive: true as const, total: 60 as const, unit: 'km' as const }, maximumMarks: 4 as const },
    privateSolution: { midpoints: [...MIDPOINTS], products, weightedSum, exactMean: { numerator: weightedSum * 2, denominator: 120 as const }, mean: weightedSum / 60,
      rubric: ['Non-additive M2/M1 band: M2 for at least three correct midpoint products with intention to add; M1 for at least three within-class representatives in products with addition, or three correct midpoint products without addition.',
        'M1 for dividing their sum by 60, dependent on at least M1 in the first band.',
        'A1 for the correct estimated mean. Correct answer alone can imply full credit unless obviously obtained incorrectly.'] },
  };
}
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freezeDeep(child); Object.freeze(value); }
  return value;
}
export function buildGroupedMeanPrototype(seed: number, p: GroupedMeanParameters): GroupedMeanPrototype {
  assertSeed(seed); assertParameters(p);
  return freezeDeep({ family: GROUPED_MEAN_FAMILY, seed, parameters: structuredClone(p), ...content(p), validation: { liveEligible: false, markingCalibrated: false } });
}
export function generateGroupedMeanPrototype(seed: number): GroupedMeanPrototype {
  assertSeed(seed);
  return buildGroupedMeanPrototype(seed, { frequencies: [...domain[seed % domain.length]] });
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function validateGroupedMeanPrototype(q: GroupedMeanPrototype): boolean {
  try {
    assertSeed(q.seed); assertParameters(q.parameters); const expected = content(q.parameters);
    return Object.keys(q).sort().join(',') === 'family,parameters,privateSolution,publicQuestion,seed,validation' &&
      equal(q.family, GROUPED_MEAN_FAMILY) && equal(q.publicQuestion, expected.publicQuestion) && equal(q.privateSolution, expected.privateSolution) &&
      equal(q.validation, { liveEligible: false, markingCalibrated: false });
  } catch { return false; }
}
