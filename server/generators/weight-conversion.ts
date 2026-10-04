import { freezeQuestionPackage } from './freeze-package.ts';
// Offline, source-derived prototype. Never imported by the live family registry.
export const WEIGHT_FAMILY = Object.freeze({
  id: '4PH1.weight.convert-mass',
  version: '0.1.0',
  status: 'provisional',
  sourceTaskId: '4PH1-2024-June-1-standard.Q10.a',
} as const);
export type WeightParameters = {
  massGrams: number;
  fieldHundredths: 980 | 981 | 1000;
  representation: 'prose' | 'table';
  context: number;
};
export type WeightPrototype = {
  family: typeof WEIGHT_FAMILY;
  seed: number;
  parameters: WeightParameters;
  structuralSignature: string;
  publicQuestion: { prompt: string; stimulus: string; maximumMarks: 2 };
  privateSolution: {
    massKg: string;
    fieldNPerKg: string;
    weightN: string;
    working: string[];
    criteria: { id: string; marks: 1; description: string }[];
    sourceNotes: string[];
  };
  validation: { arithmeticChecked: boolean; liveEligible: false; markingCalibrated: false };
};
const contexts = ['a calibration mass', 'an equipment pack', 'a sample container'] as const;

function decimal(integer: number, places: number): string {
  const digits = String(integer).padStart(places + 1, '0');
  return (digits.slice(0, -places) + '.' + digits.slice(-places)).replace(/\.?0+$/, '');
}
function assertInput(seed: number, p: WeightParameters) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Invalid unsigned seed');
  if (!p || !Number.isInteger(p.massGrams) || p.massGrams < 5 || p.massGrams > 5000 ||
      p.massGrams % 5 !== 0 || ![980, 981, 1000].includes(p.fieldHundredths) ||
      !['prose', 'table'].includes(p.representation) ||
      !Number.isInteger(p.context) || p.context < 0 || p.context >= contexts.length)
    throw new Error('Parameters are outside the gram-conversion domain');
}
function display(p: WeightParameters) {
  const g = decimal(p.fieldHundredths, 2);
  return {
    prompt: 'Calculate the weight. Use weight = mass × gravitational field strength. Show your working and give your answer in newtons.',
    stimulus: p.representation === 'prose'
      ? `Find the weight of ${contexts[p.context]}. Its mass is ${p.massGrams} g. Use the stated gravitational field strength, ${g} N/kg, for this calculation.`
      : `Find the weight of ${contexts[p.context]}. Use the stated values.\n\nQuantity | Value\nMass | ${p.massGrams} g\nGravitational field strength | ${g} N/kg`,
    maximumMarks: 2 as const,
  };
}
function solution(p: WeightParameters): WeightPrototype['privateSolution'] {
  const m = decimal(p.massGrams, 3), g = decimal(p.fieldHundredths, 2);
  const w = decimal(p.massGrams * p.fieldHundredths, 5);
  return {
    massKg: m, fieldNPerKg: g, weightN: w,
    working: [
      `Mass = ${p.massGrams} ÷ 1000 = ${m} kg.`,
      `Weight = ${m} × ${g} = ${w} N.`,
    ],
    criteria: [
      { id: 'substitution', marks: 1, description: 'Substitute the mass and gravitational field strength into W = mg; interpret conversion errors using the source-specific rule.' },
      { id: 'evaluation', marks: 1, description: `Correct evaluation gives ${w} N using the stated field strength; complete marking interpretation remains uncalibrated.` },
    ],
    sourceNotes: [
      'Original Q10(a): units ignored; one mark deducted for a clear power-of-ten error in mass units. Do not impose multiple penalties for that one error.',
      'Original source accepts g = 10, 9.8 or 9.81. This generated prompt explicitly selects one value; that change requires adaptation review.',
      'No automatic scoring, rounding band or implied-method-credit policy is implemented by this prototype.',
    ],
  };
}
function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }

export function validateWeightPrototype(q: WeightPrototype): boolean {
  try {
    assertInput(q.seed, q.parameters);
    if (!same(q.family, WEIGHT_FAMILY) ||
        q.structuralSignature !== 'grams-to-weight:' + q.parameters.representation ||
        !same(q.publicQuestion, display(q.parameters)) ||
        !same(q.privateSolution, solution(q.parameters)) ||
        !same(q.validation, { arithmeticChecked: true, liveEligible: false, markingCalibrated: false }))
      return false;
    // Independent quantity relationship, in addition to exact integer-decimal formatting.
    const mass = Number(q.privateSolution.massKg), field = Number(q.privateSolution.fieldNPerKg);
    const weight = Number(q.privateSolution.weightN);
    return mass === q.parameters.massGrams / 1000 &&
      field === q.parameters.fieldHundredths / 100 &&
      Math.abs(weight - mass * field) <= 1e-12;
  } catch { return false; }
}
export function buildWeightPrototype(seed: number, p: WeightParameters): WeightPrototype {
  assertInput(seed, p);
  const q: WeightPrototype = {
    family: WEIGHT_FAMILY, seed, parameters: structuredClone(p),
    structuralSignature: 'grams-to-weight:' + p.representation,
    publicQuestion: display(p), privateSolution: solution(p),
    validation: { arithmeticChecked: true, liveEligible: false, markingCalibrated: false },
  };
  if (!validateWeightPrototype(q)) throw new Error('Weight package validation failed');
  return freezeQuestionPackage(q);
}
export function generateWeightPrototype(seed: number): WeightPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  let state = seed >>> 0;
  const pick = (size: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * size);
  };
  return buildWeightPrototype(seed, {
    massGrams: 5 * (1 + pick(1000)),
    fieldHundredths: ([980, 981, 1000] as const)[pick(3)],
    representation: pick(2) === 0 ? 'prose' : 'table',
    context: pick(3),
  });
}
