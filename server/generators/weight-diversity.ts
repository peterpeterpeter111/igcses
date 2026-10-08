import { createHash } from 'node:crypto';
import { buildWeightPrototype, validateWeightPrototype, type WeightPrototype } from './weight-conversion.ts';

// Research-only candidate/selection policy. The historical generator and its
// fixtures stay unchanged; nothing in this module registers a live family.
export const FRESH_WEIGHT_NUMERIC_GROUPS = 999 * 3;
export const FRESH_WEIGHT_PRESENTATIONS = FRESH_WEIGHT_NUMERIC_GROUPS * 2 * 3;
const KEY_PREFIX = 'weight-numeric-v1:';
// Original Q10(a) has250g and accepts all three prototype g values. Exclude
// that mass across contexts/representations, rather than renaming the source.
export function isSourceEquivalentWeight(q: WeightPrototype): boolean {
  if (!validateWeightPrototype(q)) throw new Error('Invalid weight package');
  return q.parameters.massGrams === 250;
}
export function weightDiversityKey(q: WeightPrototype): string {
  if (!validateWeightPrototype(q)) throw new Error('Invalid weight package');
  return KEY_PREFIX + createHash('sha256').update(JSON.stringify({
    family: q.family.id, version: q.family.version,
    massGrams: q.parameters.massGrams, fieldHundredths: q.parameters.fieldHundredths,
  })).digest('hex');
}
export function generateFreshWeightCandidate(seed: number): WeightPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
  // Bounded mixed-radix enumeration covers every allowed tuple. It repeats at
  // the declared finite period; a new seed does not promise endless novelty.
  let index = seed % FRESH_WEIGHT_PRESENTATIONS;
  const massIndex = index % 999;
  const massStep = massIndex < 49 ? massIndex + 1 : massIndex + 2;
  index = Math.floor(index / 999);
  const fieldHundredths = ([980, 981, 1000] as const)[index % 3];
  index = Math.floor(index / 3);
  const representation = index % 2 === 0 ? 'prose' : 'table';
  const context = Math.floor(index / 2);
  return buildWeightPrototype(seed, { massGrams: massStep * 5, fieldHundredths, representation, context });
}
export function selectDistinctWeightVariants(candidates: readonly WeightPrototype[], requested: number, previousKeys: readonly string[] = []) {
  if (!Array.isArray(candidates) || candidates.length > 18000 ||
      !Number.isInteger(requested) || requested < 1 || requested > 30 ||
      !Array.isArray(previousKeys) || previousKeys.length > FRESH_WEIGHT_NUMERIC_GROUPS ||
      Array.from(previousKeys).some((key) => typeof key !== 'string' || !/^weight-numeric-v1:[a-f0-9]{64}$/.test(key)))
    throw new Error('Outside bounded weight selection contract');
  // Validate the entire supplied batch, including trailing items after the
  // desired count. Sparse entries and mutated packages cannot be skipped.
  const keyed = Array.from(candidates, (question) => ({ question, key: weightDiversityKey(question), sourceEquivalent: isSourceEquivalentWeight(question) }));
  const seen = new Set(previousKeys);
  const questions: WeightPrototype[] = [], keys: string[] = [];
  let duplicates = 0, excludedSourceCandidates = 0, availableGroups = 0;
  for (const candidate of keyed) {
    if (candidate.sourceEquivalent) { excludedSourceCandidates++; continue; }
    if (seen.has(candidate.key)) { duplicates++; continue; }
    seen.add(candidate.key); availableGroups++;
    if (questions.length < requested) { questions.push(candidate.question); keys.push(candidate.key); }
  }
  return Object.freeze({ questions: Object.freeze(questions), keys: Object.freeze(keys), duplicates, excludedSourceCandidates, availableGroups, requested, fulfilled: questions.length === requested, liveEligible: false as const });
}
