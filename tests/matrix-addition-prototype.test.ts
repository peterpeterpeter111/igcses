import family from '../research/templates/4MB1-matrix-addition.v0.1.0.json' with { type: 'json' };
import extraction from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMatrixAdditionPrototype, generateMatrixAdditionPrototype, validateMatrixAdditionPrototype, MATRIX_PARAMETER_SPACE } from '../server/generators/matrix-addition.ts';
import { markMatrixAdditionResponse } from '../server/generators/matrix-addition-marking.ts';
const source = () => buildMatrixAdditionPrototype(0, { magnitudes: [3,2,5,1,2,4,4,2] });
const response = (answerLine: string) => ({ answerLine, workingLines: [], additionalEvidence: '' });
void test('matrix prototype preserves position, determinism, source exclusion and private answers', () => {
  assert.deepEqual(source().privateSolution.sum, [[1,-6],[-9,3]]);
  const task = extraction.tasks.find(t => t.taskId === family.sourceTasks[0].taskId)!;
  assert.equal(task.originalMarks, family.marking.maximum);
  assert.deepEqual(task.questionPaperPages, family.sourceTasks[0].questionPaper.pdfPages);
  assert.deepEqual(task.markSchemePages, family.sourceTasks[0].markScheme.pdfPages);
  assert.deepEqual(source().publicQuestion.stimulus, task.sourceData);
  assert.deepEqual(family.customQuiz.candidateMarks, []);
  assert.deepEqual(family.customQuiz.validatedMarks, []);
  assert.equal(family.status, 'provisional');
  const seen = new Set<string>();
  const sourceIndex = [3,2,5,1,2,4,4,2].reduce((n,x,i)=>n+(x-1)*9**i,0);
  for (const seed of [...Array.from({length:1000},(_,i)=>i),sourceIndex-1,sourceIndex,sourceIndex+1,MATRIX_PARAMETER_SPACE-2,MATRIX_PARAMETER_SPACE-1,0xffffffff]) {
    const q=generateMatrixAdditionPrototype(seed);
    assert.ok(validateMatrixAdditionPrototype(q));
    assert.deepEqual(q,generateMatrixAdditionPrototype(seed));
    assert.notDeepEqual(q.parameters,source().parameters);
    const {A,B}=q.publicQuestion.stimulus;
    assert.deepEqual(q.privateSolution.sum,A.map((r,i)=>r.map((v,j)=>v+B[i][j])));
    if(seed<1000)seen.add(JSON.stringify(q.publicQuestion));
    assert.deepEqual(Object.keys(q.publicQuestion).sort(),['maximumMarks','prompt','stimulus']);
  }
  assert.equal(seen.size,1000);
  assert.equal(source().validation.liveEligible, false);
});
void test('matrix marker gives one whole-matrix mark and defers unsupported or extra evidence', () => {
  for (const [text,score] of [['[[1,-6],[-9,3]]',1],['[[+1, −6], [−9, +3]]',1],['[[1,-6],[-9,2]]',0],['[[1,-9],[-6,3]]',0],['',0]] as const) assert.equal(markMatrixAdditionResponse(source(),response(text)).score,score);
  for(const text of ['[1,-6,-9,3]','[[1,-6,-9],[3]]','[[1.0,-6],[-9,3]]','[[1/1,-6],[-9,3]]','[[1,-6],[-9,3]];alert(1)','[[1,- 6],[-9,3]]','[[1 1,-6],[-9,3]]']) assert.equal(markMatrixAdditionResponse(source(),response(text)).status,'needs-review');
  assert.equal(markMatrixAdditionResponse(source(),{...response('[[1,-6],[-9,3]]'),workingLines:['wrong method']}).status,'needs-review');
  assert.equal(markMatrixAdditionResponse(source(),{...response(''),additionalEvidence:'handwriting'}).status,'needs-review');
});
void test('matrix package and response validation reject tampering and invalid parameter shapes', () => {
  for (const seed of [-1,1.5,NaN,Infinity,0x100000000]) assert.throws(()=>generateMatrixAdditionPrototype(seed));
  const sparse: number[] = []; sparse.length = 8; // Deliberate holes exercise validation.
  for(const magnitudes of [sparse,[],[1,2,3],[0,1,1,1,1,1,1,1],[10,1,1,1,1,1,1,1],[1.5,1,1,1,1,1,1,1]]) assert.throws(()=>buildMatrixAdditionPrototype(0,{magnitudes}));
  const q=source();q.privateSolution.sum[0][0]=999;assert.equal(validateMatrixAdditionPrototype(q),false);assert.throws(()=>markMatrixAdditionResponse(q,response('')));
  const q2=source();q2.publicQuestion.stimulus.A[0][0]=4;assert.equal(validateMatrixAdditionPrototype(q2),false);
  assert.equal(markMatrixAdditionResponse(source(),{...response(''),answerLine:'x'.repeat(201)}).status,'needs-review');
});
