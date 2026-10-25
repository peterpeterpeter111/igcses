import { validateFormulaMassQuestion, type FormulaMassQuestion, type MassTerm } from './relative-formula-mass.ts';
export type FormulaMassResponse = { finalAnswer: string; terms: MassTerm[]; additionalEvidence: string };
export type FormulaMassMark = { status: 'scored'; score: 0 | 1 | 2; maximum: 2 }
  | { status: 'needs-review'; score: null; reason: string };

/** Bounded structured transcription, not a natural-language examiner marker. */
export function markFormulaMassResponse(q: FormulaMassQuestion, response: FormulaMassResponse): FormulaMassMark {
  if (!validateFormulaMassQuestion(q)) throw new Error('Invalid formula-mass package');
  return markFormulaMassEvidence(q.privateSolution.terms, q.privateSolution.relativeFormulaMass, response);
}

/** Server-owned source references allow regression against published examples. */
export function markFormulaMassEvidence(terms: MassTerm[], relativeFormulaMass: number, response: FormulaMassResponse): FormulaMassMark {
  if (terms.length !== 4 || new Set(terms.map((t) => t.symbol)).size !== 4 ||
      terms.some((t) => !['C', 'H', 'N', 'O'].includes(t.symbol) || !Number.isInteger(t.count) || t.count < 1 || !Number.isInteger(t.relativeAtomicMass) || t.relativeAtomicMass < 1) ||
      relativeFormulaMass !== terms.reduce((sum, t) => sum + t.count * t.relativeAtomicMass, 0)) throw new Error('Invalid private formula-mass reference');
  const review = (reason: string): FormulaMassMark => ({ status: 'needs-review', score: null, reason });
  if (!response || Object.keys(response).sort().join(',') !== 'additionalEvidence,finalAnswer,terms' ||
      typeof response.finalAnswer !== 'string' || response.finalAnswer.length > 100 ||
      typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 500 ||
      !Array.isArray(response.terms) || response.terms.length > 4 || Array.from(response.terms).some((t) =>
        !t || Object.keys(t).sort().join(',') !== 'count,relativeAtomicMass,symbol' ||
        typeof t.symbol !== 'string' || !['C', 'H', 'N', 'O'].includes(t.symbol) ||
        !Number.isInteger(t.count) || t.count < 0 || t.count > 99 ||
        !Number.isInteger(t.relativeAtomicMass) || t.relativeAtomicMass < 1 || t.relativeAtomicMass > 250) ||
      new Set(response.terms.map((t) => t.symbol)).size !== response.terms.length)
    return review('Outside the bounded structured transcription format.');
  if (response.additionalEvidence.trim()) return review('Additional evidence must be reviewed, not silently discarded.');
  const line = response.finalAnswer.trim();
  if (line && !/^[+]?\d{1,4}(?:\.0{1,3})?$/.test(line)) return review('Unsupported answer notation or units; no automatic penalty.');
  const correctTerms = response.terms.length === 4 && terms.every((t) =>
    response.terms.some((r) => r.symbol === t.symbol && r.count === t.count && r.relativeAtomicMass === t.relativeAtomicMass));
  const correctAnswer = !!line && Number(line) === relativeFormulaMass;
  if (correctAnswer && response.terms.length && !correctTerms) return review('Correct result with conflicting or incomplete transcribed working needs review.');
  if (correctAnswer) return { status: 'scored', score: 2, maximum: 2 };
  return { status: 'scored', score: correctTerms ? 1 : 0, maximum: 2 };
}
