import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildQuadraticPrototype, generateQuadraticPrototype, validateQuadraticPrototype, type QuadraticParameters, type QuadraticPrototype } from '../server/generators/monic-quadratic.ts';
import { markQuadraticResponse, type QuadraticResponse } from '../server/generators/quadratic-marking.ts';
import fixtures from '../research/validation/quadratic-marking-cases.json' with { type: 'json' };
import report from '../research/validation/2026-10-06-quadratic-notation-validation.json' with { type: 'json' };
import family from '../research/templates/4MB1-monic-quadratic.v0.1.0.json' with { type: 'json' };
import extraction from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };
import notes from '../content/notes/mathematics.json' with { type: 'json' };

void test('quadratic source, provisional rubric and teaching guide agree', () => {
  const task = extraction.tasks.find((t) => t.taskId === family.sourceTasks[0].taskId)!;
  assert.equal(task.questionPath, '15.b');
  assert.equal(task.originalMarks, family.marking.maximum);
  assert.deepEqual(task.markSchemePages, family.sourceTasks[0].markScheme.pdfPages);
  assert.deepEqual(task.questionPaperPages, family.sourceTasks[0].questionPaper.pdfPages);
  assert.deepEqual(task.syllabusMappings.map((m) => m.pointId), family.syllabusRefs.map((r) => r.pointId));
  const guide = notes.sections.find((s) => s.id === 'factorising-quadratics')!.answerGuide!;
  assert.equal(guide.id, family.answerGuideId);
  assert.equal(guide.sourceTaskId, task.taskId);
  assert.equal(family.status, 'provisional');
  assert.deepEqual(family.customQuiz.validatedMarks, []);
  assert.equal(family.validation.status, 'not-run'); // Full pedagogical validation is still pending.
  for (const [path, hash] of Object.entries(report.sourceHashes)) {
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash, path);
  }
});

void test('quadratic generator exhausts its finite domain with exact independent fixtures', () => {
  for (const [r, s, b, c, text] of [
    [1, 2, -3, 2, 'x² − 3x + 2'], [1, 12, -13, 12, 'x² − 13x + 12'],
    [11, 12, -23, 132, 'x² − 23x + 132'], [3, 4, -7, 12, 'x² − 7x + 12'],
  ] as const) {
    const q = buildQuadraticPrototype(0, { smallerRoot:r, largerRoot:s });
    assert.deepEqual(q.privateSolution.coefficients, [1,b,c]);
    assert.equal(q.publicQuestion.stimulus,text);
    assert.equal(q.publicQuestion.maximumMarks,2);
  }
  const unique=new Set<string>();
  for(let seed=0;seed<65;seed++) {
    const q=generateQuadraticPrototype(seed);
    assert.deepEqual(q,generateQuadraticPrototype(seed));
    assert.ok(validateQuadraticPrototype(q));
    assert.deepEqual(Object.keys(q.publicQuestion).sort(),['maximumMarks','prompt','stimulus']);
    unique.add(q.publicQuestion.stimulus);
    const {smallerRoot:r,largerRoot:s}=q.parameters;
    for (const x of [-3,0,r,s,15]) {
      const [a,b,c]=q.privateSolution.coefficients;
      assert.ok((x-r)*(x-s) === a*x*x+b*x+c); // Mathematical equality treats signed zero alike.
    }
    assert.notEqual(q.publicQuestion.stimulus,'x² − 7x + 12');
    assert.equal(q.validation.liveEligible,false);
  }
  assert.equal(unique.size,65);
  assert.equal(validateQuadraticPrototype(generateQuadraticPrototype(0xffffffff)),true);
});

void test('quadratic packages reject unsupported domains and tampered answers or eligibility', () => {
  for(const seed of [-1,0.5,NaN,Infinity,2**32]) assert.throws(()=>generateQuadraticPrototype(seed));
  for(const p of [{smallerRoot:0,largerRoot:4},{smallerRoot:4,largerRoot:4},{smallerRoot:5,largerRoot:2},{smallerRoot:1,largerRoot:13},{smallerRoot:1.5,largerRoot:4},{smallerRoot:NaN,largerRoot:4},{smallerRoot:1,largerRoot:2,secret:3}]) assert.throws(()=>buildQuadraticPrototype(0,p as QuadraticParameters));
  for(const mutate of [
    (q:QuadraticPrototype)=>{q.publicQuestion.stimulus+=' answer';},
    (q:QuadraticPrototype)=>{q.privateSolution.coefficients[1]=0;},
    (q:QuadraticPrototype)=>{q.privateSolution.rubric.partialCredit='Everyone gets full marks';},
    (q:QuadraticPrototype)=>{q.privateSolution.factors='wrong';},
    (q:QuadraticPrototype)=>{q.parameters.smallerRoot=0;},
    (q:QuadraticPrototype)=>{(q.validation as {liveEligible:boolean}).liveEligible=true;},
  ]) {
    const q=structuredClone(generateQuadraticPrototype(0));mutate(q);
    assert.equal(validateQuadraticPrototype(q),false);
    assert.throws(()=>markQuadraticResponse(q,{answerLine:'',workingLines:[],additionalEvidence:''}));
  }
});

void test('factor term order preserves credit across every generated quadratic', () => {
  for (let seed = 0; seed < 65; seed++) {
    const q = generateQuadraticPrototype(seed);
    const { smallerRoot: r, largerRoot: s } = q.parameters;
    // Each written product equals (x-r)(x-s) by commutativity or two sign flips.
    for (const answerLine of [
      `(${r}-x)(${s}-x)`, `(${s}-x)(${r}-x)`,
      `(${r}-x)(-x+${s})`, `(-x+${r})(${s}-x)`,
      `(-${r}+x)(x-${s})`, `(x-${r})(-${s}+x)`,
      `(+${r}−x) × (+${s}−x)`, `(-${s}+x)(-${r}+x)`,
    ]) {
      const mark = markQuadraticResponse(q, { answerLine, workingLines: [], additionalEvidence: '' });
      assert.equal(mark.status, 'scored', answerLine);
      assert.equal(mark.score, 2, answerLine);
    }
    // One sign flip negates every nonzero coefficient, so no terms match.
    assert.equal(markQuadraticResponse(q, {
      answerLine: `(x-${r})(${s}-x)`, workingLines: [], additionalEvidence: '',
    }).score, 0);
  }
});

void test('quadratic marker follows independent response fixtures and defers unsupported evidence', () => {
  for(const f of fixtures.cases) {
    const result=markQuadraticResponse(buildQuadraticPrototype(0,f.parameters),f.response);
    assert.equal(result.score,f.expectedScore,f.id);
    assert.equal(result.status,f.expectedScore===null?'needs-review':'scored',f.id);
  }
  assert.equal(fixtures.cases.length,report.markingCases);
  const q=generateQuadraticPrototype(0);
  for(const response of [null,{answerLine:5,workingLines:[],additionalEvidence:''},{answerLine:'',workingLines:[5],additionalEvidence:''},{answerLine:'',workingLines:[],additionalEvidence:'',extra:'possible evidence'},{answerLine:'x'.repeat(201),workingLines:[],additionalEvidence:''},{answerLine:'',workingLines:Array(21).fill(''),additionalEvidence:''}]) {
    assert.equal(markQuadraticResponse(q,response as unknown as QuadraticResponse).status,'needs-review');
  }
});
