import { validateMatrixAdditionPrototype, type MatrixAdditionPrototype } from './matrix-addition.ts';
export type MatrixResponse = { answerLine: string; workingLines: string[]; additionalEvidence: string };
export type MatrixMark = { status: 'scored'; score: 0 | 1; maximum: 1 } | { status: 'needs-review'; score: null; reason: string };
export function markMatrixAdditionResponse(q: MatrixAdditionPrototype, response: MatrixResponse): MatrixMark {
  if (!validateMatrixAdditionPrototype(q)) throw new Error('Invalid matrix package');
  const review = (reason: string): MatrixMark => ({ status: 'needs-review', score: null, reason });
  if (!response || Object.keys(response).sort().join(',') !== 'additionalEvidence,answerLine,workingLines' ||
    typeof response.answerLine !== 'string' || response.answerLine.length > 200 ||
    typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 200 ||
    !Array.isArray(response.workingLines) || response.workingLines.length > 20 ||
    Array.from(response.workingLines).some(x => typeof x !== 'string' || x.length > 200)) return review('Outside the bounded transcription format.');
  if (response.additionalEvidence.trim() || response.workingLines.some(x => x.trim())) return review('Working, contradictions or extra evidence need review; do not silently discard them.');
  const answer = response.answerLine.trim().replaceAll('−', '-');
  if (!answer) return { status: 'scored', score: 0, maximum: 1 };
  // Strict nested-row format; no eval, expression execution, reshaping or numeric coercion.
  const n = '([+-]?\\d{1,2})';
  const pattern = new RegExp(`^\\[\\s*\\[\\s*${n}\\s*,\\s*${n}\\s*\\]\\s*,\\s*\\[\\s*${n}\\s*,\\s*${n}\\s*\\]\\s*\\]$`);
  const match = answer.match(pattern);
  if (!match) return review('Use an explicitly transcribed two-by-two integer matrix; other notation is not automatically wrong.');
  const values = match.slice(1).map(Number);
  return { status: 'scored', score: values.every((v, i) => v === q.privateSolution.sum.flat()[i]) ? 1 : 0, maximum: 1 };
}
