import { freezeQuestionPackage } from './freeze-package.ts';

// Research-only: no import into the live registry or a public question route.
export const CUBE_FAMILY = Object.freeze({ id: '4HB1.cube.measure', version: '0.1.0', status: 'provisional' } as const);
export type CubeParameters = { edgeCm: number; measure: 'surface-area' | 'volume' };
const EDGES = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => n !== 3);
export const CUBE_PARAMETER_SPACE = EDGES.length * 2;
export type CubePrototype = {
  family: typeof CUBE_FAMILY;
  seed: number;
  parameters: CubeParameters;
  publicQuestion: { prompt: string; stimulus: { shape: 'cube'; edgeLengthCm: number }; maximumMarks: 2 };
  privateSolution: { sourceTaskId: string; factors: number[]; answer: number; unit: 'cm²' | 'cm³'; rubric: string[] };
  validation: { liveEligible: false; markingCalibrated: false };
};
function assertSeed(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
}
function assertParameters(p: CubeParameters) {
  if (!p || Object.keys(p).sort().join(',') !== 'edgeCm,measure' || !Number.isInteger(p.edgeCm) || p.edgeCm < 1 || p.edgeCm > 20 || !['surface-area', 'volume'].includes(p.measure)) throw new Error('Outside the bounded cube domain');
}
function content(p: CubeParameters) {
  const area = p.measure === 'surface-area';
  const factors = [p.edgeCm, p.edgeCm, area ? 6 : p.edgeCm];
  return {
    publicQuestion: {
      prompt: `A geometry model used to study surface area and volume is a solid cube. Every edge is ${p.edgeCm} cm. Calculate its ${area ? 'total surface area in cm²' : 'volume in cm³'}.`,
      stimulus: { shape: 'cube' as const, edgeLengthCm: p.edgeCm }, maximumMarks: 2 as const,
    },
    privateSolution: {
      sourceTaskId: `4HB1-2024-May-01-standard.Q6.a.${area ? 'i' : 'ii'}`,
      factors, answer: factors.reduce((a, b) => a * b, 1), unit: (area ? 'cm²' : 'cm³') as 'cm²' | 'cm³',
      rubric: ['One mark for the correct cube multiplication method; one for its correct result.', 'The source explicitly permits full marks for the correct final answer alone.', 'Unrecognised equivalent methods, unit issues, contradictions, rounding and ecf pathways require review.'],
    },
  };
}
// The builder also permits the historical edge 3 for regression checks. The
// fresh-question generator excludes it, and enumerates only 38 question forms.
export function buildCubePrototype(seed: number, p: CubeParameters): CubePrototype {
  assertSeed(seed); assertParameters(p);
  return freezeQuestionPackage({ family: CUBE_FAMILY, seed, parameters: structuredClone(p), ...content(p), validation: { liveEligible: false, markingCalibrated: false } });
}
export function generateCubePrototype(seed: number): CubePrototype {
  assertSeed(seed);
  return buildCubePrototype(seed, { edgeCm: EDGES[Math.floor(seed / 2) % EDGES.length], measure: seed % 2 === 0 ? 'surface-area' : 'volume' });
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function validateCubePrototype(q: CubePrototype): boolean {
  try {
    assertSeed(q.seed); assertParameters(q.parameters); const expected = content(q.parameters);
    return Object.keys(q).sort().join(',') === 'family,parameters,privateSolution,publicQuestion,seed,validation' && equal(q.family, CUBE_FAMILY) && equal(q.publicQuestion, expected.publicQuestion) && equal(q.privateSolution, expected.privateSolution) && equal(q.validation, { liveEligible: false, markingCalibrated: false });
  } catch { return false; }
}
