import { freezeQuestionPackage } from './freeze-package.ts';
// Offline bounded original-passage prototype. Never registered for live quizzes.
export const RETRIEVAL_FAMILY = Object.freeze({ id: '4EB1.retrieve-two-causes', version: '0.1.0', status: 'provisional', sourceTaskId: '4EB1-2024-November-01.Q5' } as const);
const CONTEXTS = { fair: 'community craft fair', library: 'library book exchange', club: 'model-building club exhibition' } as const;
const CAUSES = [
  { id: 'signs', phrase: 'missing direction signs', aliases: ['a lack of direction signs'], remedy: 'putting up clear direction signs' },
  { id: 'doors', phrase: 'locked entrance doors', aliases: ['entrance doors being locked'], remedy: 'unlocking the entrance doors' },
  { id: 'boxes', phrase: 'unlabelled supply boxes', aliases: ['supply boxes without labels'], remedy: 'labelling the supply boxes' },
  { id: 'delivery', phrase: 'late delivery of equipment', aliases: ['equipment arriving late'], remedy: 'arranging earlier equipment delivery' },
  { id: 'register', phrase: 'missing registration lists', aliases: ['a lack of registration lists'], remedy: 'preparing the registration lists' },
  { id: 'aisles', phrase: 'blocked aisles between tables', aliases: ['aisles blocked between tables'], remedy: 'clearing the aisles between tables' },
] as const;
export type RetrievalParameters = { context: keyof typeof CONTEXTS; causeIds: string[]; remedyCount: 1 | 2; evidenceOrder: 'causes-before-remedies' | 'interleaved' };
type EvidenceSpan = { start: number; end: number; text: string };
export type RetrievalPrototype = {
  family: typeof RETRIEVAL_FAMILY;
  seed: number;
  parameters: RetrievalParameters;
  publicQuestion: { prompt: string; stimulus: { introduction: string; targetHeading: string; targetParagraph: string }; maximumMarks: 2 };
  privateSolution: {
    causes: { id: string; acceptedPhrases: string[]; evidence: EvidenceSpan }[];
    remedies: { acceptedPhrases: string[]; evidence: EvidenceSpan }[];
    rubric: { maximum: 2; creditPerDistinctCause: 1; repeatCredit: 0; responseContract: 'two-entry-exact-phrase-prototype' };
  };
  validation: { liveEligible: false; markingCalibrated: false; wordCount: number };
};
function assertSeed(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid unsigned seed');
}
function assertParameters(p: RetrievalParameters) {
  if (!p || Object.keys(p).sort().join(',') !== 'causeIds,context,evidenceOrder,remedyCount' || !Object.hasOwn(CONTEXTS, p.context) ||
    !Array.isArray(p.causeIds) || p.causeIds.length < 2 || p.causeIds.length > 4 ||
    Array.from(p.causeIds).some(id => !CAUSES.some(c => c.id === id)) || new Set(p.causeIds).size !== p.causeIds.length ||
    ![1, 2].includes(p.remedyCount) || !['causes-before-remedies', 'interleaved'].includes(p.evidenceOrder)) throw new Error('Outside bounded original-passage domain');
}
function content(p: RetrievalParameters) {
  const selected = p.causeIds.map(id => CAUSES.find(c => c.id === id)!);
  const causeSentences = selected.map(c => `The ${c.phrase} caused delays.`);
  const remedySentences = selected.slice(0, p.remedyCount).map(c => `Later, ${c.remedy} reduced the delays.`);
  const sentences: string[] = [];
  selected.forEach((_, i) => {
    sentences.push(causeSentences[i]);
    if (p.evidenceOrder === 'interleaved' && i < p.remedyCount) sentences.push(remedySentences[i]);
  });
  if (p.evidenceOrder === 'causes-before-remedies') sentences.push(...remedySentences);
  const introduction = `On Saturday, students organised a ${CONTEXTS[p.context]}. A visitor later wrote a short account of the afternoon for the school newsletter. It distinguished problems that slowed visitors from changes that helped them.`;
  const targetParagraph = `The visitors experienced delays for several stated reasons. ${sentences.join(' ')} The writer reported these details without ranking the problems.`;
  const evidence = (phrase: string): EvidenceSpan => {
    const start = targetParagraph.indexOf(phrase);
    if (start < 0 || targetParagraph.indexOf(phrase, start + 1) >= 0) throw new Error('Missing or ambiguous evidence span');
    return { start, end: start + phrase.length, text: phrase };
  };
  const wordCount = (introduction + ' ' + targetParagraph).trim().split(/\s+/).length;
  if (wordCount < 70 || wordCount > 120) throw new Error('Passage word range violated');
  return {
    publicQuestion: { prompt: 'Identify two causes of the visitors’ delays from the paragraph “Why visitors were delayed”.',
      stimulus: { introduction, targetHeading: 'Why visitors were delayed', targetParagraph }, maximumMarks: 2 as const },
    privateSolution: { causes: selected.map(c => ({ id: c.id, acceptedPhrases: [c.phrase, ...c.aliases], evidence: evidence(c.phrase) })),
      remedies: selected.slice(0, p.remedyCount).map(c => ({ acceptedPhrases: [c.remedy], evidence: evidence(c.remedy) })),
      rubric: { maximum: 2 as const, creditPerDistinctCause: 1 as const, repeatCredit: 0 as const, responseContract: 'two-entry-exact-phrase-prototype' as const } },
    validation: { liveEligible: false as const, markingCalibrated: false as const, wordCount },
  };
}
export function buildRetrievalPrototype(seed: number, parameters: RetrievalParameters): RetrievalPrototype {
  assertSeed(seed); assertParameters(parameters);
  return freezeQuestionPackage({ family: RETRIEVAL_FAMILY, seed, parameters: structuredClone(parameters), ...content(parameters) });
}
export function validateRetrievalPrototype(q: RetrievalPrototype): boolean {
  try {
    assertSeed(q.seed); assertParameters(q.parameters);
    const expected = content(q.parameters);
    return Object.keys(q).sort().join(',') === 'family,parameters,privateSolution,publicQuestion,seed,validation' &&
      JSON.stringify(q.family) === JSON.stringify(RETRIEVAL_FAMILY) &&
      JSON.stringify(q.publicQuestion) === JSON.stringify(expected.publicQuestion) &&
      JSON.stringify(q.privateSolution) === JSON.stringify(expected.privateSolution) &&
      JSON.stringify(q.validation) === JSON.stringify(expected.validation);
  } catch { return false; }
}
// Explicit finite permutations, no attempt to present a small word bank as an
// unlimited or independently calibrated generator. Seeds repeat after the domain.
const sequences: string[][] = [];
function enumerate(prefix: string[]) {
  if (prefix.length >= 2) sequences.push(prefix);
  if (prefix.length < 4) for (const cause of CAUSES) if (!prefix.includes(cause.id)) enumerate([...prefix, cause.id]);
}
enumerate([]);
export const RETRIEVAL_PARAMETER_SPACE = sequences.length * 3 * 2 * 2;
export function generateRetrievalPrototype(seed: number): RetrievalPrototype {
  assertSeed(seed);
  let index = seed % RETRIEVAL_PARAMETER_SPACE;
  const contexts = ['fair', 'library', 'club'] as const;
  const context = contexts[index % 3]; index = Math.floor(index / 3);
  const remedyCount = (index % 2 + 1) as 1 | 2; index = Math.floor(index / 2);
  const evidenceOrder = index % 2 ? 'interleaved' as const : 'causes-before-remedies' as const; index = Math.floor(index / 2);
  return buildRetrievalPrototype(seed, { context, causeIds: [...sequences[index]], remedyCount, evidenceOrder });
}
