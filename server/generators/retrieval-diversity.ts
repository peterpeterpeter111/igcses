import { createHash } from 'node:crypto';
import {
  RETRIEVAL_PARAMETER_SPACE,
  validateRetrievalPrototype,
  type RetrievalPrototype,
} from './retrieve-two-causes.ts';

// Research-only conservative policy for the fixed six-cause word bank. It
// groups the underlying answer facts, ignoring event names, presentation order
// and remedy choices. This is not a general text-similarity or difficulty model.
const KEY_PREFIX = 'retrieval-cause-set-v1:';
export const RETRIEVAL_CAUSE_SET_GROUPS = 50; // C(6,2) + C(6,3) + C(6,4).

export function retrievalDiversityKey(question: RetrievalPrototype): string {
  if (!validateRetrievalPrototype(question)) throw new Error('Invalid retrieval package');
  const payload = {
    family: question.family.id,
    version: question.family.version,
    causes: [...question.parameters.causeIds].sort(),
  };
  return KEY_PREFIX + createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function selectDistinctRetrievalVariants(
  candidates: readonly RetrievalPrototype[],
  requested: number,
  previousKeys: readonly string[] = [],
) {
  if (!Array.isArray(candidates) || candidates.length > RETRIEVAL_PARAMETER_SPACE ||
      !Number.isInteger(requested) || requested < 1 || requested > RETRIEVAL_CAUSE_SET_GROUPS ||
      !Array.isArray(previousKeys) || previousKeys.length > RETRIEVAL_PARAMETER_SPACE ||
      Array.from(previousKeys).some((key) => typeof key !== 'string' ||
        !/^retrieval-cause-set-v1:[a-f0-9]{64}$/.test(key)))
    throw new Error('Outside bounded retrieval selection contract');
  // Validate the entire batch before selection. A later corrupt candidate is
  // still rejected when the requested count has already been reached.
  const keyed = Array.from(candidates, (question) => ({ question, key: retrievalDiversityKey(question) }));
  const seen = new Set(previousKeys);
  const questions: RetrievalPrototype[] = [];
  const keys: string[] = [];
  let duplicateCandidates = 0;
  let availableCandidateGroups = 0;
  for (const candidate of keyed) {
    if (seen.has(candidate.key)) {
      duplicateCandidates++;
      continue;
    }
    seen.add(candidate.key);
    availableCandidateGroups++;
    if (questions.length === requested) continue;
    questions.push(candidate.question);
    keys.push(candidate.key);
  }
  return Object.freeze({
    questions: Object.freeze(questions),
    keys: Object.freeze(keys),
    candidateCount: candidates.length,
    duplicateCandidates,
    availableCandidateGroups,
    requested,
    // A short result describes this supplied batch, not global exhaustion.
    requestedCountAvailable: questions.length === requested,
    liveEligible: false as const,
  });
}
