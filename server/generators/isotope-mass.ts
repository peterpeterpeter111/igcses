import { freezeQuestionPackage } from './freeze-package.ts';

// Offline research only. Actual isotope identities, deliberately enriched samples.
export const ISOTOPE_MASS_FAMILY = Object.freeze({ id: '4CH1.weighted-isotope-mass', version: '0.1.0', status: 'provisional', sourceTaskId: '4CH1-2024-June-1-standard.Q3.c' } as const);
const nuclei = [
  { protons: 12, masses: [24, 25, 26] },
  { protons: 14, masses: [28, 29, 30] },
  { protons: 16, masses: [32, 33, 34] },
];
// Keep genuine rounding, excluding exact tenths and half-way ties initially.
const proportions = Array.from({ length: 25 }, (_, i) => [60 + i, 10 + i % 5, 30 - i - i % 5])
  .filter((p) => p.every((v) => v > 0) && ![0, 5].includes((p[1] + 2 * p[2]) % 10));
export const ISOTOPE_MASS_DOMAIN = nuclei.length * proportions.length;
export type IsotopeRow = { protons: number; neutrons: number; percentageAbundance: number };
export type IsotopeMassQuestion = {
  family: typeof ISOTOPE_MASS_FAMILY; seed: number;
  publicQuestion: { prompt: string; stimulus: { rows: IsotopeRow[] }; maximumMarks: 4 };
  privateSolution: { massNumbers: number[]; weightedNumerator: number; unrounded: string; rounded: string };
  validation: { liveEligible: false; markingCalibrated: false; finiteTableVariants: number };
};
export function generateIsotopeMassQuestion(seed: number): IsotopeMassQuestion {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  const index = seed % ISOTOPE_MASS_DOMAIN;
  const atom = nuclei[index % nuclei.length];
  const abundance = proportions[Math.floor(index / nuclei.length)];
  const numerator = atom.masses.reduce((sum, mass, i) => sum + mass * abundance[i], 0);
  return freezeQuestionPackage({ family: ISOTOPE_MASS_FAMILY, seed,
    publicQuestion: {
      prompt: 'An enriched sample of element Z contains the three isotopes shown. These proportions describe this sample, not natural abundances. Use the table to calculate its relative atomic mass. Give your answer to one decimal place and show your working.',
      stimulus: { rows: atom.masses.map((mass, i) => ({ protons: atom.protons, neutrons: mass - atom.protons, percentageAbundance: abundance[i] })) }, maximumMarks: 4,
    },
    privateSolution: { massNumbers: [...atom.masses], weightedNumerator: numerator, unrounded: (numerator / 100).toFixed(2), rounded: (Math.floor((numerator + 5) / 10) / 10).toFixed(1) },
    validation: { liveEligible: false, markingCalibrated: false, finiteTableVariants: ISOTOPE_MASS_DOMAIN },
  });
}
export function validateIsotopeMassQuestion(q: IsotopeMassQuestion): boolean {
  try { return JSON.stringify(q) === JSON.stringify(generateIsotopeMassQuestion(q.seed)); } catch { return false; }
}
