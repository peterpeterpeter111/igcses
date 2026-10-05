import { validateCubePrototype, type CubePrototype } from './cube-measure.ts';

// This accepts a faithful transcription, not a semantic reading of free text.
export type CubeWorking = { factors: number[]; evaluatedProduct: number | null };
export type CubeResponse = { answerLine: string; working: CubeWorking | null; additionalEvidence: string };
export type CubeMark = { status: 'scored'; score: 0 | 1 | 2; maximum: 2; impliedByCorrectAnswer: boolean } | { status: 'needs-review'; score: null; reason: string };
const keys = (o: object, expected: string) => Object.keys(o).sort().join(',') === expected;
const boundedInteger = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && Math.abs(n) <= 100000;
function parseAnswer(raw: string, unit: 'cm²' | 'cm³'): number | null {
  const exponent = unit === 'cm²' ? '2' : '3';
  const suffix = new RegExp(`\\s*cm(?:\\^?${exponent}|${unit.at(-1)})$`, 'i');
  const s = raw.trim().replaceAll('−', '-').replace(suffix, '').trim();
  if (!/^[+-]?(?:\d{1,7}(?:\.\d{1,6})?|\.\d{1,6})$/.test(s)) return null;
  return Number(s);
}
export function markCubeResponse(q: CubePrototype, response: CubeResponse): CubeMark {
  if (!validateCubePrototype(q)) throw new Error('Invalid cube package');
  const review = (reason: string): CubeMark => ({ status: 'needs-review', score: null, reason });
  const scored = (score: 0 | 1 | 2, impliedByCorrectAnswer = false): CubeMark => ({ status: 'scored', score, maximum: 2, impliedByCorrectAnswer });
  if (!response || !keys(response, 'additionalEvidence,answerLine,working') || typeof response.answerLine !== 'string' || response.answerLine.length > 200 || typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 500) return review('Outside the bounded transcription format.');
  if (response.additionalEvidence.trim()) return review('Additional, alternative or crossed-out evidence requires review.');
  const answer = response.answerLine.trim() ? parseAnswer(response.answerLine, q.privateSolution.unit) : null;
  if (response.answerLine.trim() && answer === null) return review('Unrecognised notation or unit issue requires review, not an automatic zero.');
  const correct = answer === q.privateSolution.answer;
  if (response.working === null) return correct ? scored(2, true) : scored(0);
  const w = response.working;
  if (!w || !keys(w, 'evaluatedProduct,factors') || !Array.isArray(w.factors) || w.factors.length !== 3 || Array.from(w.factors).some(n => !boundedInteger(n)) || (w.evaluatedProduct !== null && !boundedInteger(w.evaluatedProduct))) return review('Working requires exactly three bounded transcribed factors.');
  const expected = [...q.privateSolution.factors].sort((a, b) => a - b);
  if (JSON.stringify([...w.factors].sort((a, b) => a - b)) !== JSON.stringify(expected)) return review('Different factors may represent an equivalent method, a dimension error or ecf; examiner review is required.');
  if (w.evaluatedProduct !== null && answer !== null && w.evaluatedProduct !== answer) return review('The shown evaluation conflicts with the final answer.');
  if (correct && w.evaluatedProduct !== null && w.evaluatedProduct !== q.privateSolution.answer) return review('A correct final answer with contradictory working needs review.');
  if (correct) return scored(2);
  if (w.evaluatedProduct === q.privateSolution.answer) return review('Correct result in working with a missing or different final answer needs review.');
  return scored(1);
}
