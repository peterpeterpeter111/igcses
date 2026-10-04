import type { GroupedMeanWorking, GroupedMeanResponse } from '../server/generators/grouped-mean-marking.ts';
const f = [22, 13, 9, 12, 4];
const midpoint = [1, 3.5, 7.5, 15, 30];
export function groupedMeanFixture(workingKind: string, answerLine: string, additionalEvidence = ''): GroupedMeanResponse {
  if (workingKind === 'none') return { answerLine, working: null, additionalEvidence };
  const representatives = workingKind === 'upper' ? [2, 5, 10, 20, 40] : workingKind === 'lower' ? [0, 2, 5, 10, 20] : workingKind === 'mixed' ? [1, 3.5, 10, 10, 20] : [...midpoint];
  const products = representatives.map((representative, i) => ({ representative, frequency: f[i], evaluatedProduct: representative * f[i] }));
  const w: GroupedMeanWorking = { products, additionShown: true, sum: products.reduce((s, p) => s + p.evaluatedProduct, 0), divisor: 60 };
  if (workingKind === 'addition-error') w.sum = 0;
  else if (workingKind === 'three-added') { w.products[3] = w.products[4] = null; w.sum = 135; }
  else if (workingKind === 'three-no-addition') { w.products[3] = w.products[4] = null; w.additionShown = false; w.sum = w.divisor = null; }
  else if (workingKind === 'two-only') { w.products[2] = w.products[3] = w.products[4] = null; w.sum = 67.5; }
  else if (workingKind === 'wrong-divisor') w.divisor = 30;
  else if (workingKind === 'unevaluated-products') for (const p of w.products) p!.evaluatedProduct = null;
  else if (workingKind === 'wrong-frequency') w.products[0]!.frequency = 21;
  else if (workingKind === 'wrong-product') w.products[0]!.evaluatedProduct = 23;
  else if (workingKind === 'sum-without-addition') w.additionShown = false;
  else if (workingKind === 'divisor-without-sum') w.sum = null;
  else if (workingKind === 'decimal-representative') { w.products[0]!.representative = 1.1; w.products[0]!.evaluatedProduct = null; }
  else if (!['full', 'upper', 'lower', 'mixed'].includes(workingKind)) throw new Error('Unknown fixture kind');
  return { answerLine, working: w, additionalEvidence };
}
