import { freezeQuestionPackage } from './freeze-package.ts';

// Offline research only. Live sessions do not import this generator.
export const FORMULA_MASS_FAMILY = Object.freeze({
  id: '4CH1.relative-formula-mass', version: '0.2.0', status: 'provisional',
  sourceTaskId: '4CH1-2024-June-1-standard.Q4.a.ii',
} as const);
export const FORMULA_MASS_DOMAIN = 10;
export type FormulaMassParameters = { methyleneCount: number };
export type MassTerm = { symbol: string; count: number; relativeAtomicMass: number };
export type FormulaMassQuestion = {
  family: typeof FORMULA_MASS_FAMILY;
  seed: number;
  parameters: FormulaMassParameters;
  publicQuestion: {
    prompt: string;
    stimulus: { molecularFormula: string; relativeAtomicMasses: { symbol: string; value: number }[] };
    maximumMarks: 2;
  };
  privateSolution: { terms: MassTerm[]; relativeFormulaMass: number; working: string; creditPolicy: string };
  validation: { liveEligible: false; markingCalibrated: false; finiteFormulaVariants: 10 };
};
const atoms = [{ symbol: 'C', value: 12 }, { symbol: 'H', value: 1 }, { symbol: 'N', value: 14 }, { symbol: 'O', value: 16 }];
function requireInput(seed: number, p: FormulaMassParameters) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  if (!p || Object.keys(p).join(',') !== 'methyleneCount' || !Number.isInteger(p.methyleneCount) || p.methyleneCount < 1 || p.methyleneCount > 10)
    throw new Error('Expected an integer methylene count from 1 to 10');
}
function content(p: FormulaMassParameters) {
  const n = p.methyleneCount;
  const counts = [n + 1, 2 * n + 3, 1, 2];
  const formula = atoms.map((a, i) => a.symbol + (counts[i] === 1 ? '' : counts[i])).join('');
  const terms = atoms.map((a, i) => ({ symbol: a.symbol, count: counts[i], relativeAtomicMass: a.value }));
  return {
    publicQuestion: {
      prompt: 'An unfamiliar compound has the molecular formula shown. Calculate its relative formula mass using the supplied relative atomic masses. Show your working.',
      stimulus: { molecularFormula: formula, relativeAtomicMasses: structuredClone(atoms) }, maximumMarks: 2 as const,
    },
    privateSolution: {
      terms, relativeFormulaMass: terms.reduce((s, t) => s + t.count * t.relativeAtomicMass, 0),
      working: terms.map((t) => `${t.count} × ${t.relativeAtomicMass}`).join(' + '),
      creditPolicy: 'Two marks for the correct final result alone; one for the complete correct substitution with an evaluation error. No ECF from wrong formula or atomic masses. Conflicting or unsupported evidence needs review.',
    },
  };
}
export function buildFormulaMassQuestion(seed: number, parameters: FormulaMassParameters): FormulaMassQuestion {
  requireInput(seed, parameters);
  return freezeQuestionPackage({ family: FORMULA_MASS_FAMILY, seed, parameters: structuredClone(parameters), ...content(parameters),
    validation: { liveEligible: false, markingCalibrated: false, finiteFormulaVariants: 10 } });
}
export function generateFormulaMassQuestion(seed: number): FormulaMassQuestion {
  return buildFormulaMassQuestion(seed, { methyleneCount: (seed % FORMULA_MASS_DOMAIN) + 1 });
}
export function validateFormulaMassQuestion(q: FormulaMassQuestion): boolean {
  try {
    requireInput(q.seed, q.parameters);
    const expected = buildFormulaMassQuestion(q.seed, q.parameters);
    return JSON.stringify(q) === JSON.stringify(expected);
  } catch { return false; }
}
