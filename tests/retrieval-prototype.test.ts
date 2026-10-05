import { test } from 'node:test';
import assert from 'node:assert/strict';
import cases from '../research/validation/retrieval-marking-cases.json' with { type: 'json' };
import family from '../research/templates/4EB1-retrieve-two-causes.v0.1.0.json' with { type: 'json' };
import { buildRetrievalPrototype, generateRetrievalPrototype, validateRetrievalPrototype, RETRIEVAL_PARAMETER_SPACE, type RetrievalParameters } from '../server/generators/retrieve-two-causes.ts';
import { markRetrievalResponse } from '../server/generators/retrieval-marking.ts';

void test('every finite English passage has unambiguous exact spans, supported alternatives and private marking data', () => {
  assert.equal(RETRIEVAL_PARAMETER_SPACE, 6120);
  const seen = new Set<string>(), counts = new Set<number>(), orders = new Set<string>(), remedies = new Set<number>(), contexts = new Set<string>();
  for (let seed = 0; seed < RETRIEVAL_PARAMETER_SPACE; seed++) {
    const q = generateRetrievalPrototype(seed);
    assert.equal(validateRetrievalPrototype(q), true);
    assert.equal(q.validation.liveEligible, false);
    assert.equal(q.validation.markingCalibrated, false);
    assert.deepEqual(q, generateRetrievalPrototype(seed));
    const text = q.publicQuestion.stimulus.targetParagraph;
    const words = (q.publicQuestion.stimulus.introduction + ' ' + text).split(/\s+/).length;
    assert.ok(words >= 70 && words <= 120);
    assert.equal(words, q.validation.wordCount);
    assert.equal(new Set(q.privateSolution.causes.map(c => c.id)).size, q.parameters.causeIds.length);
    for (const c of q.privateSolution.causes) {
      assert.equal(text.slice(c.evidence.start, c.evidence.end), c.evidence.text);
      assert.equal(text.indexOf(c.evidence.text, c.evidence.end), -1);
      assert.ok(text.includes(`The ${c.evidence.text} caused delays.`));
      assert.ok(c.acceptedPhrases.includes(c.evidence.text));
    }
    for (const r of q.privateSolution.remedies) {
      assert.equal(text.slice(r.evidence.start, r.evidence.end), r.evidence.text);
      assert.ok(text.includes(`Later, ${r.evidence.text} reduced the delays.`));
    }
    assert.equal(Object.keys(q.publicQuestion).sort().join(','), 'maximumMarks,prompt,stimulus');
    assert.equal(Object.keys(q.publicQuestion.stimulus).sort().join(','), 'introduction,targetHeading,targetParagraph');
    // Each supported cause remains eligible, including third/fourth alternatives.
    for (let i = 0; i < q.privateSolution.causes.length; i++) for (let j = i + 1; j < q.privateSolution.causes.length; j++) {
      const result = markRetrievalResponse(q, { answers: [q.privateSolution.causes[i].evidence.text, q.privateSolution.causes[j].evidence.text], additionalEvidence: '' });
      assert.equal(result.status, 'scored'); assert.equal(result.score, 2);
    }
    seen.add(JSON.stringify(q.publicQuestion)); counts.add(q.parameters.causeIds.length); orders.add(q.parameters.evidenceOrder); remedies.add(q.parameters.remedyCount); contexts.add(q.parameters.context);
  }
  assert.equal(seen.size, 6120);
  assert.deepEqual([...counts].sort((a, b) => a - b), [2, 3, 4]); assert.equal(orders.size, 2); assert.equal(remedies.size, 2); assert.equal(contexts.size, 3);
  assert.deepEqual(generateRetrievalPrototype(6120).publicQuestion, generateRetrievalPrototype(0).publicQuestion);
  assert.equal(family.status, 'provisional'); assert.deepEqual(family.customQuiz.validatedMarks, []);
});

void test('English bounded marking matches independent distinctness, remedy and review fixtures', () => {
  const q = buildRetrievalPrototype(0, cases.parameters as RetrievalParameters);
  for (const c of cases.cases) {
    const result = markRetrievalResponse(q, { answers: c.answers, additionalEvidence: c.additionalEvidence });
    assert.equal(result.status, c.status, c.id); assert.equal(result.score, c.score, c.id);
  }
});

void test('English packages reject corrupt spans, polarity, readiness and invalid response shapes', () => {
  const original = generateRetrievalPrototype(0);
  const mutations = [
    (q: typeof original) => { q.privateSolution.causes[0].evidence.start++; },
    (q: typeof original) => { q.publicQuestion.stimulus.targetParagraph = q.publicQuestion.stimulus.targetParagraph.replace('caused delays', 'prevented delays'); },
    (q: typeof original) => { q.privateSolution.causes[0].acceptedPhrases.push(q.privateSolution.remedies[0].evidence.text); },
    (q: typeof original) => { q.privateSolution.causes[1].id = q.privateSolution.causes[0].id; },
    (q: typeof original) => { Object.assign(q.validation, { liveEligible: true }); },
  ];
  for (const mutate of mutations) { const q = structuredClone(original); mutate(q); assert.equal(validateRetrievalPrototype(q), false); assert.throws(() => markRetrievalResponse(q, { answers: ['', ''], additionalEvidence: '' })); }
  for (const seed of [-1, 1.5, NaN, Infinity, 2 ** 32]) assert.throws(() => generateRetrievalPrototype(seed));
  for (const patch of [{ causeIds: ['signs'] }, { causeIds: ['signs', 'signs'] }, { causeIds: ['signs', 'unrecognized'] }, { causeIds: Array(2) }, { remedyCount: 0 }, { evidenceOrder: 'reverse' }, { context: 'toString' }, { extra: true }]) {
    assert.throws(() => buildRetrievalPrototype(0, { ...original.parameters, ...patch } as RetrievalParameters));
  }
  const malformed = [{ answers: ['one'], additionalEvidence: '' }, { answers: Array(2), additionalEvidence: '' }, { answers: ['', ''], additionalEvidence: '', extra: true }, { answers: [42, ''], additionalEvidence: '' }];
  for (const response of malformed) assert.equal(markRetrievalResponse(original, response as never).status, 'needs-review');
});
