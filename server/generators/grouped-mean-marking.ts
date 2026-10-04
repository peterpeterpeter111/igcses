import { validateGroupedMeanPrototype, type GroupedMeanPrototype } from './grouped-mean.ts';
// Each entry is a faithfully transcribed multiplication, not an inferred method.
export type GroupedMeanProduct = { representative: number; frequency: number; evaluatedProduct: number | null };
export type GroupedMeanWorking = { products: (GroupedMeanProduct | null)[]; additionShown: boolean; sum: number | null; divisor: number | null };
export type GroupedMeanResponse = { answerLine: string; working: GroupedMeanWorking | null; additionalEvidence: string };
export type GroupedMeanMark = { status: 'scored'; score: number; maximum: 4; band: 0 | 1 | 2; division: 0 | 1; accuracy: 0 | 1; impliedByCorrectAnswer: boolean } | { status: 'needs-review'; score: null; reason: string };
const keys = (value: object, expected: string) => Object.keys(value).sort().join(',') === expected;
const halfNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000 && Number.isInteger(n * 2);
function parseAnswer(raw: string): { numerator: bigint; denominator: bigint } | null {
  const s = raw.trim().replaceAll('−', '-').replace(/\s*km$/i, '').trim();
  const fraction = s.match(/^([+-]?\d{1,7})\s*\/\s*([+-]?\d{1,7})$/);
  if (fraction) { const denominator = BigInt(fraction[2]); return denominator === BigInt(0) ? null : { numerator: BigInt(fraction[1]), denominator }; }
  const decimal = s.match(/^([+-]?)(?:(\d{1,7})(?:\.(\d{1,6}))?|\.(\d{1,6}))$/);
  if (!decimal) return null;
  const digits = decimal[3] ?? decimal[4] ?? '';
  return { numerator: BigInt((decimal[2] ?? '0') + digits) * (decimal[1] === '-' ? BigInt(-1) : BigInt(1)), denominator: BigInt(10) ** BigInt(digits.length) };
}
export function markGroupedMeanResponse(q: GroupedMeanPrototype, response: GroupedMeanResponse): GroupedMeanMark {
  if (!validateGroupedMeanPrototype(q)) throw new Error('Invalid grouped-mean package');
  const review = (reason: string): GroupedMeanMark => ({ status: 'needs-review', score: null, reason });
  const scored = (band: 0 | 1 | 2, division: 0 | 1, accuracy: 0 | 1, impliedByCorrectAnswer = false): GroupedMeanMark => ({ status: 'scored', score: band + division + accuracy, maximum: 4, band, division, accuracy, impliedByCorrectAnswer });
  if (!response || !keys(response, 'additionalEvidence,answerLine,working') || typeof response.answerLine !== 'string' || response.answerLine.length > 200 || typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 500) return review('Outside the bounded transcription format.');
  if (response.additionalEvidence.trim()) return review('Additional, alternative or crossed-out evidence requires review.');
  const parsed = response.answerLine.trim() ? parseAnswer(response.answerLine) : null;
  if (response.answerLine.trim() && !parsed) return review('Unsupported numeric notation or units; do not mark them automatically wrong.');
  const correct = !!parsed && parsed.numerator * BigInt(120) === BigInt(q.privateSolution.exactMean.numerator) * parsed.denominator;
  if (response.working === null) return correct ? scored(2, 1, 1, true) : scored(0, 0, 0);
  const w = response.working;
  if (!w || !keys(w, 'additionShown,divisor,products,sum') || !Array.isArray(w.products) || w.products.length !== 5 || typeof w.additionShown !== 'boolean' || (w.sum !== null && !halfNumber(w.sum)) || (w.divisor !== null && (typeof w.divisor !== 'number' || !Number.isInteger(w.divisor) || w.divisor <= 0 || w.divisor > 100000))) return review('Working requires five ordered product slots and bounded numeric evidence.');
  let midpointCount = 0, withinCount = 0, shownCount = 0, productSum = 0;
  for (const [i, p] of Array.from(w.products).entries()) {
    if (p === null) continue;
    if (!p || !keys(p, 'evaluatedProduct,frequency,representative') || !halfNumber(p.representative) || p.frequency !== q.parameters.frequencies[i] || (p.evaluatedProduct !== null && (!halfNumber(p.evaluatedProduct) || p.evaluatedProduct !== p.representative * p.frequency))) return review('Ambiguous product, wrong frequency, unsupported representative or arithmetic contradiction requires review.');
    shownCount++; productSum += p.representative * p.frequency;
    if (p.representative === q.privateSolution.midpoints[i]) midpointCount++;
    if (p.representative > q.publicQuestion.stimulus.classes[i].lower && p.representative <= q.publicQuestion.stimulus.classes[i].upper) withinCount++;
  }
  if ((w.sum !== null && (!w.additionShown || shownCount === 0)) || (w.divisor !== null && w.sum === null)) return review('Sum or division is not supported by the transcribed working.');
  // An incorrect addition total can retain method credit. It is not silently
  // repaired, and cannot justify a correct final answer via an incorrect method.
  if (correct) {
    const completeCorrectWorking = shownCount === 5 && midpointCount === 5 && w.additionShown && w.sum === productSum && w.divisor === 60;
    return completeCorrectWorking ? scored(2, 1, 1) : review('Correct answer with incomplete, different or contradictory working needs examiner review.');
  }
  const band: 0 | 1 | 2 = w.additionShown && midpointCount >= 3 ? 2 : (w.additionShown && withinCount >= 3) || midpointCount >= 3 ? 1 : 0;
  const division = band >= 1 && w.sum !== null && w.divisor === 60 ? 1 : 0;
  return scored(band, division, 0);
}
