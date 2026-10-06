// Offline exhaustive duplicate evidence for the fixed word bank only.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { generateRetrievalPrototype, RETRIEVAL_PARAMETER_SPACE } from '../server/generators/retrieve-two-causes.ts';
import { retrievalDiversityKey, selectDistinctRetrievalVariants } from '../server/generators/retrieval-diversity.ts';
const questions = Array.from({ length: RETRIEVAL_PARAMETER_SPACE }, (_, seed) => generateRetrievalPrototype(seed));
const groups = new Map<string, number>();
for (const question of questions) {
  const key = retrievalDiversityKey(question);
  groups.set(key, (groups.get(key) ?? 0) + 1);
}
const distribution = [...groups.values()].reduce<Record<string,number>>((counts, size) => {
  counts[size] = (counts[size] ?? 0) + 1; return counts;
}, {});
assert.deepEqual(distribution, { 24: 15, 72: 20, 288: 15 });
const selection = selectDistinctRetrievalVariants(questions, 50);
assert.equal(selection.questions.length, 50);
assert.equal(selection.duplicateCandidates, 6070);
const history = selectDistinctRetrievalVariants(questions, 50, selection.keys.slice(0,17));
assert.equal(history.questions.length, 33);
assert.equal(history.duplicateCandidates, 6087);
const report = {
  date: '2026-10-06', familyId: '4EB1.retrieve-two-causes', familyVersion: '0.1.0',
  scope: 'Exhaustive conservative grouping for a fixed six-cause word bank. Not general semantic similarity, reading-demand equivalence or learner calibration.',
  policy: 'Ignore event name, cause ordering, remedy selection and evidence order when the full set of cause facts is unchanged. This deliberately groups some different presentation demands together.',
  parameterPackagesChecked: questions.length,
  conservativeCauseSetGroups: groups.size,
  groupMultiplicityDistribution: distribution,
  selectedDistinctGroups: selection.questions.length,
  rejectedDuplicateVariants: selection.duplicateCandidates,
  historyGroupsProvided: 17,
  remainingGroupsSelected: history.questions.length,
  historyDuplicatesRejected: history.duplicateCandidates,
  entireBatchValidatedBeforeSelection: true,
  hashesRemainPrivate: true,
  liveEligible: false,
  activeTemplates: 0,
  sourceHashes: Object.fromEntries(['server/generators/retrieve-two-causes.ts','server/generators/retrieval-diversity.ts']
    .map((path) => [path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  remaining: ['No generic free-text similarity filter.', 'No arbitrary passage generation, empirical reading difficulty or broad paraphrase calibration.', 'History selection is pure offline logic; live concurrent persistence and activation remain pending.', 'No complete4/6-mark blueprint or AI integration.'],
};
const output = process.argv[2]; if (!output) throw new Error('Provide a new report path');
writeFileSync(output, JSON.stringify(report,null,2)+'\n', { flag: 'wx' });
console.log(JSON.stringify(report));
