import { test } from 'node:test';
import assert from 'node:assert/strict';
import family from '../research/templates/4MB1-grouped-mean.v0.1.0.json' with { type: 'json' };
import extraction from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };
import cases from '../research/validation/grouped-mean-marking-cases.json' with { type: 'json' };
import { buildGroupedMeanPrototype, generateGroupedMeanPrototype, validateGroupedMeanPrototype, GROUPED_MEAN_PARAMETER_SPACE } from '../server/generators/grouped-mean.ts';
import { markGroupedMeanResponse } from '../server/generators/grouped-mean-marking.ts';
import { groupedMeanFixture } from '../scripts/grouped-mean-fixtures.ts';
const source = () => buildGroupedMeanPrototype(0, { frequencies: [22, 13, 9, 12, 4] });
void test('grouped mean preserves source evidence, four marks and frozen private arithmetic', () => {
  const q = source();
  const task = extraction.tasks.find(t => t.taskId === family.sourceTasks[0].taskId)!;
  assert.deepEqual(q.publicQuestion.stimulus, task.sourceData);
  assert.deepEqual(family.sourceTasks[0].questionPaper.pdfPages, task.questionPaperPages);
  assert.deepEqual(family.sourceTasks[0].markScheme.pdfPages, task.markSchemePages);
  assert.equal(family.marking.maximum, task.originalMarks);
  assert.deepEqual(q.privateSolution.products, [22, 45.5, 67.5, 180, 120]);
  assert.equal(q.privateSolution.mean, 7.25);
  assert.ok(Object.isFrozen(q) && Object.isFrozen(q.parameters.frequencies) && Object.isFrozen(q.privateSolution.products));
  assert.deepEqual(Object.keys(q.publicQuestion).sort(), ['maximumMarks', 'prompt', 'stimulus']);
  assert.equal(family.status, 'provisional'); assert.deepEqual(family.customQuiz.validatedMarks, []);
});
void test('entire grouped mean numeric domain is finite, deterministic, distinct and source-excluding', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < GROUPED_MEAN_PARAMETER_SPACE; seed++) {
    const q = generateGroupedMeanPrototype(seed);
    assert.ok(validateGroupedMeanPrototype(q)); assert.deepEqual(q, generateGroupedMeanPrototype(seed));
    assert.notDeepEqual(q.parameters.frequencies, source().parameters.frequencies);
    const total = q.publicQuestion.stimulus.classes.reduce((s, c) => s + c.frequency, 0);
    const sum = q.publicQuestion.stimulus.classes.reduce((s, c) => s + ((c.upper + c.lower) / 2) * c.frequency, 0);
    assert.equal(total, 60); assert.equal(q.privateSolution.weightedSum, sum);
    assert.equal(q.privateSolution.mean, sum / total); assert.ok(Math.abs(q.privateSolution.mean * 100 - Math.round(q.privateSolution.mean * 100)) < 1e-9);
    assert.equal(markGroupedMeanResponse(q, { answerLine: `${2 * sum}/120 km`, working: null, additionalEvidence: '' }).score, 4);
    seen.add(JSON.stringify(q.publicQuestion));
  }
  assert.equal(seen.size, GROUPED_MEAN_PARAMETER_SPACE);
  assert.ok(GROUPED_MEAN_PARAMETER_SPACE > 100);
  assert.deepEqual(generateGroupedMeanPrototype(GROUPED_MEAN_PARAMETER_SPACE).parameters, generateGroupedMeanPrototype(0).parameters);
  assert.ok(validateGroupedMeanPrototype(generateGroupedMeanPrototype(0xffffffff)));
});
void test('grouped mean synthetic responses preserve M2/M1 cap, dependencies, endpoint rules and review boundaries', () => {
  for (const c of cases.cases) {
    const mark = markGroupedMeanResponse(source(), groupedMeanFixture(c.workingKind, c.answerLine, c.additionalEvidence));
    assert.equal(mark.score, c.expectedScore, c.id);
    if (mark.status === 'scored') { assert.ok(mark.band <= 2); assert.ok(mark.division === 0 || mark.band >= 1); assert.ok(mark.score <= 4); }
    else assert.ok(mark.reason);
  }
});
void test('grouped mean rejects invalid packages and sparse or misleading transcription evidence', () => {
  for (const seed of [-1, 1.5, NaN, Infinity, 0x100000000]) assert.throws(() => generateGroupedMeanPrototype(seed));
  const sparse: number[] = []; sparse.length = 5;
  for (const frequencies of [sparse, [], [22,13,9,12], [23,13,9,12,4], [22.5,12.5,9,12,4], [22,14,9,12,3]]) assert.throws(() => buildGroupedMeanPrototype(0, { frequencies }));
  const q = structuredClone(source()); q.privateSolution.mean = 7.26; assert.equal(validateGroupedMeanPrototype(q), false); assert.throws(() => markGroupedMeanResponse(q, groupedMeanFixture('none', '')));
  const q2 = structuredClone(source()); q2.publicQuestion.maximumMarks = 6 as 4; assert.equal(validateGroupedMeanPrototype(q2), false);
  const r = groupedMeanFixture('full', ''); const sparseProducts: NonNullable<typeof r.working>['products'] = []; sparseProducts.length = 5; for (let i = 1; i < 5; i++) sparseProducts[i] = r.working!.products[i]; r.working!.products = sparseProducts; assert.equal(markGroupedMeanResponse(source(), r).status, 'needs-review');
  const r2 = groupedMeanFixture('none', '7.25'); r2.answerLine = 'x'.repeat(201); assert.equal(markGroupedMeanResponse(source(), r2).status, 'needs-review');
  const r3 = groupedMeanFixture('full', ''); r3.working!.sum = Infinity; assert.equal(markGroupedMeanResponse(source(), r3).status, 'needs-review');
});
