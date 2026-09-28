// Offline calibration of explicitly transcribed calculation fields only.
// Not a free-text parser, live marker or replacement for examiner judgement.
import { validateWeightPrototype, type WeightPrototype } from './weight-conversion.ts';

export type WeightResponse = {
  massKg: string;
  fieldNPerKg: string;
  finalAnswer: string;
  otherWorking: string;
};
export type WeightMark =
  | { status: 'scored'; score: 0 | 1 | 2; maximum: 2;
      basis: 'blank' | 'substitution-only' | 'exact-evaluation' | 'single-mass-power-of-ten-error' }
  | { status: 'needs-review'; score: null; reason: string };

type Decimal = { coefficient: bigint; exponent: number };
function normalise(coefficient: bigint, exponent: number): Decimal {
  if (coefficient === BigInt(0)) return { coefficient: BigInt(0), exponent: 0 };
  while (coefficient % BigInt(10) === BigInt(0)) { coefficient /= BigInt(10); exponent++; }
  return { coefficient, exponent };
}
function decimal(text: string): Decimal | null {
  // No Number/EPSILON comparison: every supplied decimal digit is retained.
  const m = text.trim().match(/^\+?(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/);
  if (!m) return null;
  const exponent = Number(m[2] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) return null;
  const places = m[1].split('.')[1]?.length ?? 0;
  return normalise(BigInt(m[1].replace('.', '')), exponent - places);
}
function equal(a: Decimal, b: Decimal): boolean {
  return a.coefficient === b.coefficient && a.exponent === b.exponent;
}
function multiply(a: Decimal, b: Decimal): Decimal {
  return normalise(a.coefficient * b.coefficient, a.exponent + b.exponent);
}

/** Fields describe the learner's stated multiplicands, not an inferred method. */
export function markWeightResponse(q: WeightPrototype, response: WeightResponse): WeightMark {
  if (!validateWeightPrototype(q)) throw new Error('Invalid weight package');
  const review = (reason: string): WeightMark => ({ status: 'needs-review', score: null, reason });
  if (!response || ['massKg', 'fieldNPerKg', 'finalAnswer', 'otherWorking'].some(
    (key) => typeof (response as unknown as Record<string, unknown>)[key] !== 'string',
  )) return review('All calculation fields must be text.');
  if (Object.keys(response).some((key) => !['massKg', 'fieldNPerKg', 'finalAnswer', 'otherWorking'].includes(key)))
    return review('Unexpected response fields may contain unresolved evidence.');
  if (Object.values(response).some((value) => typeof value !== 'string' || value.length > 200))
    return review('Response exceeds the bounded calculation format.');
  const { massKg, fieldNPerKg, finalAnswer, otherWorking } = response;
  if (otherWorking.trim()) return review('Additional working or competing claims require interpretation.');
  const score = (value: 0 | 1 | 2, basis: Extract<WeightMark, { status: 'scored' }>['basis']): WeightMark =>
    ({ status: 'scored', score: value, maximum: 2, basis });
  if (![massKg, fieldNPerKg, finalAnswer].some((v) => v.trim())) return score(0, 'blank');
  if (!massKg.trim() || !fieldNPerKg.trim())
    return review('Incomplete working: implied method credit is not calibrated.');
  const mass = decimal(massKg), field = decimal(fieldNPerKg);
  if (!mass || !field || mass.coefficient <= BigInt(0) || field.coefficient <= BigInt(0))
    return review('The supplied working is outside the positive decimal-product format.');
  const expectedMass = decimal(q.privateSolution.massKg)!;
  const expectedField = decimal(q.privateSolution.fieldNPerKg)!;
  if (!equal(field, expectedField))
    return review('The calculation does not use the explicitly stated field strength; adaptation judgement is required.');
  const correctMass = equal(mass, expectedMass);
  // Equal normalized coefficients prove an exact power-of-ten ratio. A wrong
  // final number alone is never used to infer a mass conversion error.
  const massPowerError = mass.coefficient === expectedMass.coefficient && !correctMass;
  if (!correctMass && !massPowerError)
    return review('A non-power-of-ten mass error needs a separate method-credit decision.');
  if (!finalAnswer.trim())
    return correctMass ? score(1, 'substitution-only') : review('Combined missing evaluation and conversion error needs review.');
  // Source says ignore units. Allow conventional unscaled unit labels here;
  // prefix conversions or prose remain unresolved, never stripped speculatively.
  const final = decimal(finalAnswer.trim().replace(/\s*(?:N|newtons?|kg|g)$/, '').trim());
  if (!final) return review('Final answer has unresolved notation, scale or multiple claims.');
  if (!equal(final, multiply(mass, field)))
    return review('Evaluation differs from the explicit working; rounding, arithmetic error or contradiction needs review.');
  return correctMass ? score(2, 'exact-evaluation') : score(1, 'single-mass-power-of-ten-error');
}
