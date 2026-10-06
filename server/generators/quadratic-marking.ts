// Offline only: a strict two-binomial format, not a general algebra/handwriting parser.
import { validateQuadraticPrototype, type QuadraticPrototype } from './monic-quadratic.ts';
export type QuadraticResponse = { answerLine: string; workingLines: string[]; additionalEvidence: string };
export type QuadraticMark =
  | { status: 'scored'; score: 0 | 1 | 2; maximum: 2; selected: 'answer-line' | 'last-working-line' | 'blank'; matchedTerms: number }
  | { status: 'needs-review'; score: null; reason: string };
function parseProduct(text: string): [number, number, number] | null {
  // Bounded characters/length, no eval, symbolic execution or expression-library coercion.
  if (/\d\s+\d/.test(text)) return null; // Do not merge separate written numbers.
  const value = text.replaceAll('−', '-').replaceAll('×', '*').replace(/\s/g, '');
  const match = value.match(/^\(([^()]*)\)\*?\(([^()]*)\)$/);
  if (!match) return null;
  // Both x - 3 and 3 - x are explicit linear factors. Parse their coefficients
  // rather than silently deferring an equivalent constant-first product.
  const factor = (term: string): [number, number] | null => {
    if (/^[+-]?x$/.test(term)) return [term.startsWith('-') ? -1 : 1, 0];
    const variableFirst = term.match(/^([+-]?)x([+-])(\d{1,3})$/);
    if (variableFirst && Number(variableFirst[3]) <= 100) {
      return [variableFirst[1] === '-' ? -1 : 1,
        (variableFirst[2] === '-' ? -1 : 1) * Number(variableFirst[3])];
    }
    const constantFirst = term.match(/^([+-]?\d{1,3})([+-])x$/);
    if (constantFirst && Math.abs(Number(constantFirst[1])) <= 100) {
      return [constantFirst[2] === '-' ? -1 : 1, Number(constantFirst[1])];
    }
    return null;
  };
  const left = factor(match[1]), right = factor(match[2]);
  if (!left || !right) return null;
  const [a, b] = left, [c, d] = right;
  return [a * c, a * d + b * c, b * d];
}
export function markQuadraticResponse(q: QuadraticPrototype, response: QuadraticResponse): QuadraticMark {
  if (!validateQuadraticPrototype(q)) throw new Error('Invalid quadratic package');
  const review = (reason: string): QuadraticMark => ({ status: 'needs-review', score: null, reason });
  if (!response || Object.keys(response).sort().join(',') !== 'additionalEvidence,answerLine,workingLines' ||
      typeof response.answerLine !== 'string' || typeof response.additionalEvidence !== 'string' ||
      !Array.isArray(response.workingLines) || response.workingLines.length > 20 ||
      response.workingLines.some((line) => typeof line !== 'string' || line.length > 200) ||
      response.answerLine.length > 200 || response.additionalEvidence.length > 200)
    return review('Response is outside the bounded transcription format.');
  if (response.additionalEvidence.trim()) return review('Unordered, crossed-out, contradictory or additional evidence needs interpretation.');
  const answer = response.answerLine.trim();
  const last = response.workingLines.filter((line) => line.trim()).at(-1)?.trim() ?? '';
  const selected = answer ? 'answer-line' : last ? 'last-working-line' : 'blank';
  if (selected === 'blank') return { status: 'scored', score: 0, maximum: 2, selected, matchedTerms: 0 };
  const coefficients = parseProduct(answer || last);
  if (!coefficients) return review('Selected response is not a supported two-binomial product; do not interpret unsupported notation as wrong.');
  const matchedTerms = coefficients.filter((c, i) => c === q.privateSolution.coefficients[i]).length;
  return { status: 'scored', score: matchedTerms === 3 ? 2 : matchedTerms === 2 ? 1 : 0, maximum: 2, selected, matchedTerms };
}
