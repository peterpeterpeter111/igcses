import { validateIsotopeMassQuestion, type IsotopeMassQuestion } from './isotope-mass.ts';

export type IsotopeMassResponse = {
  massNumbers: number[]; weightedNumerator: number | null; denominator: number | null;
  finalAnswer: string; additionalEvidence: string;
};
export type IsotopeMassMark = { status: 'scored'; score: number; maximum: 4; basis: string }
  | { status: 'needs-review'; score: null; reason: string };
type Reference = { massNumbers: number[]; weightedNumerator: number; unrounded: string; rounded: string };

// Shared research policy, not a student route. References are server-owned.
export function markIsotopeMassEvidence(reference: Reference, response: IsotopeMassResponse): IsotopeMassMark {
  const review = (reason: string): IsotopeMassMark => ({ status: 'needs-review', score: null, reason });
  const scored = (score: number, basis: string): IsotopeMassMark => ({ status: 'scored', score, maximum: 4, basis });
  if (!reference || reference.massNumbers.length !== 3 || !reference.massNumbers.every((v) => Number.isInteger(v) && v > 0) ||
      !Number.isInteger(reference.weightedNumerator) || reference.weightedNumerator <= 0 ||
      reference.unrounded !== (reference.weightedNumerator / 100).toFixed(2) ||
      reference.rounded !== (Math.floor((reference.weightedNumerator + 5) / 10) / 10).toFixed(1)) throw new Error('Invalid private isotope reference');
  if (!response || Object.keys(response).sort().join(',') !== 'additionalEvidence,denominator,finalAnswer,massNumbers,weightedNumerator' ||
      !Array.isArray(response.massNumbers) || ![0, 3].includes(response.massNumbers.length) ||
      Array.from(response.massNumbers).some((v) => !Number.isInteger(v) || v < 0 || v > 300) ||
      (response.weightedNumerator !== null && (!Number.isInteger(response.weightedNumerator) || response.weightedNumerator < 0 || response.weightedNumerator > 100000)) ||
      (response.denominator !== null && (!Number.isInteger(response.denominator) || response.denominator < 1 || response.denominator > 1000)) ||
      typeof response.finalAnswer !== 'string' || response.finalAnswer.length > 100 ||
      typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 500) return review('Outside bounded structured transcription.');
  if (response.additionalEvidence.trim()) return review('Additional evidence must not be discarded.');
  const final = response.finalAnswer.trim();
  if (final && !/^\d{1,3}(?:\.\d{1,2})?$/.test(final)) return review('Unsupported units, notation or multiple answers.');
  const correctMasses = response.massNumbers.length === 3 && response.massNumbers.every((v, i) => v === reference.massNumbers[i]);
  if (response.massNumbers.length && !correctMasses) return review('Wrong-mass ECF requires source-specific review; no generic transfer of the published three-mark example.');
  if (response.weightedNumerator !== null && response.weightedNumerator !== reference.weightedNumerator) return review('Incorrect numerator or arithmetic needs fuller working.');
  if (response.denominator !== null && (response.denominator !== 100 || response.weightedNumerator === null)) return review('Unsupported or incomplete division evidence.');
  if (final && Number(final) === Number(reference.rounded) && final !== reference.rounded) return review('Equivalent number with unsupported precision; no automatic precision penalty.');
  if (final === reference.rounded) return scored(4, 'Correct one-decimal result; source result-only concession.');
  if (final === reference.unrounded) return scored(3, 'Correct unrounded result; source result-only concession.');
  if (final) return review('Other final results require the complete expression, not an inferred mark.');
  const numeratorCorrect = response.weightedNumerator === reference.weightedNumerator;
  return scored((correctMasses || numeratorCorrect ? 1 : 0) + (numeratorCorrect ? 1 : 0) + (response.denominator === 100 ? 1 : 0), 'Bounded partial evidence; correct M2 subsumes M1.');
}
export function markIsotopeMassResponse(q: IsotopeMassQuestion, response: IsotopeMassResponse): IsotopeMassMark {
  if (!validateIsotopeMassQuestion(q)) throw new Error('Invalid isotope package');
  return markIsotopeMassEvidence(q.privateSolution, response);
}
