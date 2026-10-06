import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import report from '../research/validation/2026-10-06-retrieval-diversity.json' with { type: 'json' };
import assert from 'node:assert/strict';
import { buildRetrievalPrototype, generateRetrievalPrototype, RETRIEVAL_PARAMETER_SPACE } from '../server/generators/retrieve-two-causes.ts';
import { retrievalDiversityKey, selectDistinctRetrievalVariants, RETRIEVAL_CAUSE_SET_GROUPS } from '../server/generators/retrieval-diversity.ts';

const first = () => buildRetrievalPrototype(0, { context: 'fair', causeIds: ['signs','doors'], remedyCount: 1, evidenceOrder: 'causes-before-remedies' });
const equivalent = () => buildRetrievalPrototype(1, { context: 'library', causeIds: ['doors','signs'], remedyCount: 2, evidenceOrder: 'interleaved' });
const different = () => buildRetrievalPrototype(2, { context: 'club', causeIds: ['boxes','delivery'], remedyCount: 1, evidenceOrder: 'interleaved' });

void test('event names, ordering and remedy variations do not make the same answer facts fresh', () => {
  const a = first(), b = equivalent(), c = different();
  assert.notDeepEqual(a.publicQuestion, b.publicQuestion);
  assert.equal(retrievalDiversityKey(a), retrievalDiversityKey(b));
  assert.notEqual(retrievalDiversityKey(a), retrievalDiversityKey(c));
  const selection = selectDistinctRetrievalVariants([a,b,c], 2);
  assert.deepEqual(selection.questions, [a,c]);
  assert.equal(selection.duplicateCandidates, 1);
  assert.equal(selection.requestedCountAvailable, true);
  assert.equal(selection.liveEligible, false);
  assert.ok(Object.isFrozen(selection) && Object.isFrozen(selection.questions) && Object.isFrozen(selection.keys));
  assert.ok(selection.keys.every((key) => /^retrieval-cause-set-v1:[a-f0-9]{64}$/.test(key)));
  const limited = selectDistinctRetrievalVariants([a,b,c,c], 1);
  assert.deepEqual(limited.questions, [a]);
  assert.equal(limited.availableCandidateGroups, 2);
  assert.equal(limited.duplicateCandidates, 2);
});

void test('every finite passage variant groups by cause facts with independently counted multiplicities', () => {
  const questions = Array.from({length: RETRIEVAL_PARAMETER_SPACE}, (_,seed) => generateRetrievalPrototype(seed));
  const groups = new Map<string, number>();
  for (const q of questions) {
    const key = retrievalDiversityKey(q);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  assert.equal(questions.length, 6120);
  assert.equal(groups.size, 15 + 20 + 15);
  assert.equal(groups.size, RETRIEVAL_CAUSE_SET_GROUPS);
  assert.deepEqual([...groups.values()].sort((a,b)=>a-b),
    [...Array(15).fill(24), ...Array(20).fill(72), ...Array(15).fill(288)]);
  const selection = selectDistinctRetrievalVariants(questions, 50);
  assert.equal(selection.questions.length, 50);
  assert.equal(new Set(selection.keys).size, 50);
  assert.equal(selection.duplicateCandidates, 6070);
  assert.equal(selection.availableCandidateGroups, 50);
  const withHistory = selectDistinctRetrievalVariants(questions, 50, selection.keys.slice(0,17));
  assert.equal(withHistory.questions.length, 33);
  assert.ok(withHistory.keys.every((key) => !selection.keys.slice(0,17).includes(key)));
  assert.equal(withHistory.requestedCountAvailable, false);
});

void test('history excludes equivalent facts across batches and short batches do not claim global exhaustion', () => {
  const a = first(), b = equivalent(), c = different();
  const prior = [retrievalDiversityKey(a)];
  const result = selectDistinctRetrievalVariants([b,c], 2, prior);
  assert.deepEqual(result.questions, [c]);
  assert.equal(result.duplicateCandidates, 1);
  assert.equal(result.requestedCountAvailable, false);
  assert.deepEqual(prior, [retrievalDiversityKey(a)]);
  assert.equal(selectDistinctRetrievalVariants([], 1).requestedCountAvailable, false);
});

void test('invalid selection and late tampering are rejected before a partial result is returned', () => {
  for (const count of [0,51,1.5,NaN,Infinity]) assert.throws(()=>selectDistinctRetrievalVariants([first()],count));
  assert.throws(()=>selectDistinctRetrievalVariants([first()],1,['raw cause words']));
  assert.throws(()=>selectDistinctRetrievalVariants(Array(RETRIEVAL_PARAMETER_SPACE+1).fill(first()),1));
  const corrupt = structuredClone(different());
  corrupt.publicQuestion.stimulus.targetParagraph += ' An unverified extra claim.';
  assert.throws(()=>retrievalDiversityKey(corrupt));
  assert.throws(()=>selectDistinctRetrievalVariants([first(),corrupt],1));
  const sparse: ReturnType<typeof first>[] = []; sparse.length = 2; sparse[0] = first();
  assert.throws(()=>selectDistinctRetrievalVariants(sparse,1));
});

void test('saved duplicate evidence matches current source while the public question stays free of private keys', () => {
  for (const [path,hash] of Object.entries(report.sourceHashes))
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash, path);
  assert.equal(report.parameterPackagesChecked, RETRIEVAL_PARAMETER_SPACE);
  assert.equal(report.conservativeCauseSetGroups, 50);
  assert.equal(report.rejectedDuplicateVariants, 6070);
  assert.equal(report.liveEligible, false);
  assert.equal(report.activeTemplates, 0);
  const question = first();
  assert.deepEqual(Object.keys(question.publicQuestion).sort(), ['maximumMarks','prompt','stimulus']);
  assert.equal(JSON.stringify(question.publicQuestion).includes(retrievalDiversityKey(question)), false);
});
