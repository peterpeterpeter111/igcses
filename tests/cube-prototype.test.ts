import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCubePrototype, generateCubePrototype, validateCubePrototype, CUBE_PARAMETER_SPACE, type CubeParameters, type CubePrototype } from '../server/generators/cube-measure.ts';
import { markCubeResponse, type CubeResponse } from '../server/generators/cube-marking.ts';
import { cubeCases } from '../scripts/cube-fixtures.ts';
import family from '../research/templates/4HB1-cube-measure.v0.1.0.json' with { type: 'json' };
import source from '../research/extractions/4HB1-2024-May-01-standard.json' with { type: 'json' };

void test('cube source concessions and source-specific identities remain exact and inactive', () => {
  for (const ref of family.sourceTasks) {
    const task = source.tasks.find(t => t.taskId === ref.taskId)!;
    assert.ok(task);
    assert.equal(ref.originalMarks, task.originalMarks);
    assert.deepEqual(ref.questionPaper.pdfPages, task.questionPaperPages);
    assert.deepEqual(ref.markScheme.pdfPages, task.markSchemePages);
    assert.equal(task.numericScoring?.correctFinalAnswerAloneMaximum, 2);
    assert.equal(task.numericScoring?.sourceFinalAnswerConcession, true);
  }
  assert.equal(family.status, 'provisional');
  assert.deepEqual(family.customQuiz.validatedMarks, []);
  assert.equal(source.fullyProcessed, false);
});

void test('cube answers match independent source and boundary values with separate target units', () => {
  for (const [edge, area, volume] of [[1,6,1],[2,24,8],[3,54,27],[4,96,64],[20,2400,8000]]) {
    for (const measure of ['surface-area', 'volume'] as const) {
      const q = buildCubePrototype(0, { edgeCm: edge, measure });
      assert.equal(q.privateSolution.answer, measure === 'surface-area' ? area : volume);
      assert.equal(q.privateSolution.unit, measure === 'surface-area' ? 'cm²' : 'cm³');
      assert.match(q.privateSolution.sourceTaskId, measure === 'surface-area' ? /Q6\.a\.i$/ : /Q6\.a\.ii$/);
      assert.equal(q.publicQuestion.maximumMarks, 2);
      assert.equal(validateCubePrototype(q), true);
    }
  }
});

void test('finite cube generation is deterministic, excludes historical edge and has 38 forms', () => {
  const seen = new Set<string>();
  for (const seed of [...Array.from({ length: 200 }, (_, i) => i), 0xffffffff]) {
    const q = generateCubePrototype(seed);
    assert.deepEqual(q, generateCubePrototype(seed));
    assert.equal(validateCubePrototype(q), true);
    assert.notEqual(q.parameters.edgeCm, 3);
    assert.equal(q.validation.liveEligible, false);
    assert.equal(q.validation.markingCalibrated, false);
    assert.deepEqual(Object.keys(q.publicQuestion).sort(), ['maximumMarks','prompt','stimulus']);
    seen.add(JSON.stringify(q.publicQuestion));
  }
  assert.equal(seen.size, 38);
  assert.equal(CUBE_PARAMETER_SPACE, 38);
});

void test('cube packages reject domain errors and alterations to givens, private scheme or gates', () => {
  const p: CubeParameters = { edgeCm: 4, measure: 'surface-area' };
  for (const edgeCm of [0,21,1.5,NaN,Infinity]) assert.throws(() => buildCubePrototype(0,{...p,edgeCm}));
  for (const seed of [-1,0.5,2**32,NaN]) assert.throws(() => generateCubePrototype(seed));
  assert.throws(() => buildCubePrototype(0,{...p,measure:'ratio'} as unknown as CubeParameters));
  assert.throws(() => buildCubePrototype(0,{...p,extra:1} as unknown as CubeParameters));
  for (const mutate of [
    (q: CubePrototype) => { q.publicQuestion.prompt = 'Calculate an inverse target.'; },
    (q: CubePrototype) => { q.publicQuestion.stimulus.edgeLengthCm = 5; },
    (q: CubePrototype) => { q.parameters.edgeCm = 5; },
    (q: CubePrototype) => { q.privateSolution.answer = 64; },
    (q: CubePrototype) => { q.privateSolution.factors[2] = 4; },
    (q: CubePrototype) => { q.privateSolution.sourceTaskId += '.invented'; },
    (q: CubePrototype) => { q.privateSolution.rubric = []; },
    (q: CubePrototype) => { (q.validation as { liveEligible: boolean }).liveEligible = true; },
    (q: CubePrototype) => { (q.validation as { markingCalibrated: boolean }).markingCalibrated = true; },
  ]) {
    const q = structuredClone(buildCubePrototype(0,p)); mutate(q);
    assert.equal(validateCubePrototype(q), false);
    assert.throws(() => markCubeResponse(q,{answerLine:'96',working:null,additionalEvidence:''}));
  }
});

void test('cube marker respects independent full, partial and deferred response fixtures', () => {
  assert.equal(new Set(cubeCases.map(c=>c.id)).size, 32);
  for (const c of cubeCases) {
    const q = buildCubePrototype(0,{edgeCm:4,measure:c.measure});
    const result = markCubeResponse(q,structuredClone(c.response));
    assert.equal(result.status, c.expected === null ? 'needs-review' : 'scored', c.id);
    assert.equal(result.score, c.expected, c.id);
    if (result.status === 'scored') assert.equal(result.maximum,2);
  }
});

void test('cube marker defers malformed, nonfinite and sparse transcription instead of fabricating marks', () => {
  const q = buildCubePrototype(0,{edgeCm:4,measure:'surface-area'});
  const base: CubeResponse = {answerLine:'96',working:null,additionalEvidence:''};
  const sparseFactors = Array<number>(3); sparseFactors[0] = 4; sparseFactors[2] = 6;
  const malformed = [null,{...base,extra:1},{...base,answerLine:'x'.repeat(201)},
    {...base,additionalEvidence:1}, {...base,working:{factors:sparseFactors,evaluatedProduct:null}},
    {...base,working:{factors:[4,NaN,6],evaluatedProduct:null}},
    {...base,working:{factors:[4,4,6],evaluatedProduct:Infinity}},
    {...base,working:{factors:[4,4,6],evaluatedProduct:96,extra:true}},
    {...base,working:{factors:[16,6],evaluatedProduct:96}}];
  for (const r of malformed) {
    const result=markCubeResponse(q,r as CubeResponse);
    assert.equal(result.status,'needs-review'); assert.equal(result.score,null);
  }
});
