import { markIsotopeMassEvidence, type IsotopeMassResponse, type IsotopeMassMark } from './isotope-mass-marking.ts';

// The historical source question is never a fresh generator output.
export const CHEMISTRY_SOURCE_ISOTOPE_REFERENCE = Object.freeze({
  massNumbers: Object.freeze([24, 25, 26]), weightedNumerator: 2432, unrounded: '24.32', rounded: '24.3',
});
export function markChemistrySourceIsotopeResponse(response: IsotopeMassResponse): IsotopeMassMark {
  const ordinary = markIsotopeMassEvidence({ ...CHEMISTRY_SOURCE_ISOTOPE_REFERENCE, massNumbers: [...CHEMISTRY_SOURCE_ISOTOPE_REFERENCE.massNumbers] }, response);
  if (ordinary.status === 'needs-review' && ordinary.reason.startsWith('Wrong-mass ECF') &&
      response.massNumbers.join(',') === '12,13,14' && response.weightedNumerator === 1232 &&
      response.denominator === 100 && response.finalAnswer.trim() === '12.3' && !response.additionalEvidence.trim())
    return { status: 'scored', score: 3, maximum: 4, basis: 'Exact published aggregate ECF example; no invented individual mark attribution or transfer to other responses.' };
  return ordinary;
}
