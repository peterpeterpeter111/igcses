import { freezeQuestionPackage } from './freeze-package.ts';
// Offline source-derived prototype; not imported by the live quiz registry.
export const MATRIX_ADDITION_FAMILY = Object.freeze({ id: '4MB1.matrices.add-two-by-two', version: '0.1.0', status: 'provisional', sourceTaskId: '4MB1-2024-summer-01-candidate.Q4.a' } as const);
export type Matrix2 = [[number, number], [number, number]];
export type MatrixParameters = { magnitudes: number[] };
export type MatrixAdditionPrototype = {
  family: typeof MATRIX_ADDITION_FAMILY;
  seed: number;
  parameters: MatrixParameters;
  publicQuestion: { prompt: string; stimulus: { A: Matrix2; B: Matrix2 }; maximumMarks: 1 };
  privateSolution: { sum: Matrix2; working: string[]; rubric: string };
  validation: { liveEligible: false; markingCalibrated: false };
};
const SOURCE = [3, 2, 5, 1, 2, 4, 4, 2];
const signs = [1, -1, -1, 1, -1, -1, -1, 1];
export const MATRIX_PARAMETER_SPACE = 9 ** 8;
function assertInput(seed: number, p: MatrixParameters) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  if (!p || Object.keys(p).join(',') !== 'magnitudes' || !Array.isArray(p.magnitudes) || p.magnitudes.length !== 8 ||
    Array.from(p.magnitudes).some(v => !Number.isInteger(v) || v < 1 || v > 9)) throw new Error('Expected eight integer magnitudes from 1 to 9');
}
function content(p: MatrixParameters) {
  const v = p.magnitudes.map((m, i) => signs[i] * m);
  const A: Matrix2 = [[v[0], v[1]], [v[2], v[3]]];
  const B: Matrix2 = [[v[4], v[5]], [v[6], v[7]]];
  const sum: Matrix2 = [[v[0] + v[4], v[1] + v[5]], [v[2] + v[6], v[3] + v[7]]];
  return { publicQuestion: { prompt: 'Calculate A + B.', stimulus: { A, B }, maximumMarks: 1 as const },
    privateSolution: { sum, working: v.slice(0, 4).map((x, i) => `${x} + (${v[i + 4]}) = ${x + v[i + 4]}`),
      rubric: 'One mark for the complete correct two-by-two matrix. No partial-entry marks. Unsupported notation or additional evidence requires review.' } };
}
export function buildMatrixAdditionPrototype(seed: number, p: MatrixParameters): MatrixAdditionPrototype {
  assertInput(seed, p);
  return freezeQuestionPackage({ family: MATRIX_ADDITION_FAMILY, seed, parameters: structuredClone(p), ...content(p), validation: { liveEligible: false, markingCalibrated: false } });
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function validateMatrixAdditionPrototype(q: MatrixAdditionPrototype): boolean {
  try {
    assertInput(q.seed, q.parameters);
    const expected = content(q.parameters);
    return Object.keys(q).sort().join(',') === 'family,parameters,privateSolution,publicQuestion,seed,validation' &&
      equal(q.family, MATRIX_ADDITION_FAMILY) && equal(q.publicQuestion, expected.publicQuestion) &&
      equal(q.privateSolution, expected.privateSolution) && equal(q.validation, { liveEligible: false, markingCalibrated: false });
  } catch { return false; }
}
function encode(v: number[]) { return v.reduce((n, x, i) => n + (x - 1) * 9 ** i, 0); }
/** Seeds repeat by domain size; source parameters are excluded from fresh generation. */
export function generateMatrixAdditionPrototype(seed: number): MatrixAdditionPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  let index = seed % (MATRIX_PARAMETER_SPACE - 1);
  if (index >= encode(SOURCE)) index++;
  const magnitudes = Array.from({ length: 8 }, (_, i) => Math.floor(index / 9 ** i) % 9 + 1);
  return buildMatrixAdditionPrototype(seed, { magnitudes });
}
