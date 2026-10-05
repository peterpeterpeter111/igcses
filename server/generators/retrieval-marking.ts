import { validateRetrievalPrototype, type RetrievalPrototype } from './retrieve-two-causes.ts';
export type RetrievalResponse = { answers: string[]; additionalEvidence: string };
export type RetrievalMark = { status: 'scored'; score: 0 | 1 | 2; maximum: 2; creditedCauseIds: string[] } | { status: 'needs-review'; score: null; reason: string };
const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');
/** Exact approved phrases only. Other paraphrases, combined claims, polarity and
 * contradictions are deferred, never silently marked wrong or discarded. */
export function markRetrievalResponse(q: RetrievalPrototype, response: RetrievalResponse): RetrievalMark {
  if (!validateRetrievalPrototype(q)) throw new Error('Invalid retrieval package');
  const review = (reason: string): RetrievalMark => ({ status: 'needs-review', score: null, reason });
  if (!response || Object.keys(response).sort().join(',') !== 'additionalEvidence,answers' ||
    !Array.isArray(response.answers) || response.answers.length !== 2 ||
    Array.from(response.answers).some(a => typeof a !== 'string' || a.length > 200) ||
    typeof response.additionalEvidence !== 'string' || response.additionalEvidence.length > 400) return review('Outside the bounded two-entry response format.');
  if (response.additionalEvidence.trim()) return review('Additional evidence or contradictions require review.');
  const credited = new Set<string>();
  for (const raw of response.answers) {
    const answer = normalize(raw);
    if (!answer) continue;
    const cause = q.privateSolution.causes.find(c => c.acceptedPhrases.some(p => normalize(p) === answer));
    if (cause) { credited.add(cause.id); continue; }
    if (q.privateSolution.remedies.some(r => r.acceptedPhrases.some(p => normalize(p) === answer))) continue;
    return review('Unlisted paraphrase, combined claim or unsupported detail; do not infer its meaning automatically.');
  }
  return { status: 'scored', score: credited.size as 0 | 1 | 2, maximum: 2, creditedCauseIds: [...credited] };
}
