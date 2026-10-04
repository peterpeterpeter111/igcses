import { freezeQuestionPackage } from './freeze-package.ts';
// Bounded offline prototype derived from Q15(b). Not registered for live quizzes.
export const QUADRATIC_FAMILY = Object.freeze({
  id: '4MB1.factorisation.monic-quadratic', version: '0.1.0', status: 'provisional',
  sourceTaskId: '4MB1-2024-summer-01-candidate.Q15.b',
} as const);
export type QuadraticParameters = { smallerRoot: number; largerRoot: number };
export type QuadraticPrototype = {
  family: typeof QUADRATIC_FAMILY;
  seed: number;
  parameters: QuadraticParameters;
  structuralSignature: 'monic-distinct-positive-integer-roots';
  publicQuestion: { prompt: string; stimulus: string; maximumMarks: 2 };
  privateSolution: {
    coefficients: [number, number, number];
    factors: string;
    working: string[];
    rubric: { maximum: 2; fullCredit: string; partialCredit: string; answerSelection: string };
  };
  validation: { arithmeticChecked: true; liveEligible: false; markingCalibrated: false };
};
function assertInput(seed: number, p: QuadraticParameters) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  if (!p || Object.keys(p).sort().join(',') !== 'largerRoot,smallerRoot' ||
      !Number.isInteger(p.smallerRoot) || !Number.isInteger(p.largerRoot) ||
      p.smallerRoot < 1 || p.largerRoot > 12 || p.smallerRoot >= p.largerRoot)
    throw new Error('Outside the distinct positive integer root domain');
}
function packageContent(p: QuadraticParameters) {
  const { smallerRoot: r, largerRoot: s } = p;
  return {
    publicQuestion: { prompt: 'Factorise fully.', stimulus: `x² − ${r + s}x + ${r * s}`, maximumMarks: 2 as const },
    privateSolution: {
      coefficients: [1, -(r + s), r * s] as [number, number, number],
      factors: `(x − ${r})(x − ${s})`,
      working: [`Find two integers with sum −${r + s} and product ${r * s}: −${r} and −${s}.`,
        `The factors are (x − ${r})(x − ${s}); expand to check all three coefficients.`],
      rubric: { maximum: 2 as const,
        fullCredit: 'Two marks for the correct factorised product, including reversed factors or both linear factors negated.',
        partialCredit: 'Otherwise one mark for a factorised product expanding to exactly two correct terms of the given quadratic.',
        answerSelection: 'Use the answer line if nonempty; otherwise the final nonempty working line. Do not select the best earlier line.' },
    },
  };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function validateQuadraticPrototype(q: QuadraticPrototype): boolean {
  try {
    assertInput(q.seed, q.parameters);
    const expected = packageContent(q.parameters);
    return Object.keys(q).sort().join(',') === 'family,parameters,privateSolution,publicQuestion,seed,structuralSignature,validation' &&
      same(q.family, QUADRATIC_FAMILY) && q.structuralSignature === 'monic-distinct-positive-integer-roots' &&
      same(q.publicQuestion, expected.publicQuestion) && same(q.privateSolution, expected.privateSolution) &&
      same(q.validation, { arithmeticChecked: true, liveEligible: false, markingCalibrated: false });
  } catch { return false; }
}
/** Explicit parameters allow reproduction of the source for offline calibration only. */
export function buildQuadraticPrototype(seed: number, p: QuadraticParameters): QuadraticPrototype {
  assertInput(seed, p);
  return freezeQuestionPackage({ family: QUADRATIC_FAMILY, seed, parameters: structuredClone(p),
    structuralSignature: 'monic-distinct-positive-integer-roots', ...packageContent(p),
    validation: { arithmeticChecked: true, liveEligible: false, markingCalibrated: false } });
}
export function generateQuadraticPrototype(seed: number): QuadraticPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  const candidates: QuadraticParameters[] = [];
  for (let r = 1; r <= 11; r++) for (let s = r + 1; s <= 12; s++) {
    if (r === 3 && s === 4) continue; // Do not serve the exact source expression as a fresh question.
    candidates.push({ smallerRoot: r, largerRoot: s });
  }
  return buildQuadraticPrototype(seed, candidates[seed % candidates.length]);
}
