import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildCubePrototype, generateCubePrototype, validateCubePrototype } from '../server/generators/cube-measure.ts';
import { markCubeResponse } from '../server/generators/cube-marking.ts';
import { cubeCases } from './cube-fixtures.ts';

const path=process.argv[2];
if (!path) throw new Error('Supply a new output report path');
const seeds=[...Array.from({length:200},(_,i)=>i),0xffffffff];
const seen=new Set<string>();
for(const seed of seeds) {
  const q=generateCubePrototype(seed); assert.ok(validateCubePrototype(q));
  assert.deepEqual(q,generateCubePrototype(seed));
  assert.notEqual(q.parameters.edgeCm,3); seen.add(JSON.stringify(q.publicQuestion));
}
assert.equal(seen.size,38);
const arithmetic=[];
for(const [edgeCm,area,volume] of [[1,6,1],[2,24,8],[3,54,27],[4,96,64],[20,2400,8000]])
  for(const measure of ['surface-area','volume'] as const) {
    const answer=buildCubePrototype(0,{edgeCm,measure}).privateSolution.answer;
    assert.equal(answer,measure==='surface-area'?area:volume);
    arithmetic.push({edgeCm,measure,answer,passed:true});
  }
const cases=cubeCases.map(c=>{
  const actual=markCubeResponse(buildCubePrototype(0,{edgeCm:4,measure:c.measure}),structuredClone(c.response));
  assert.equal(actual.score,c.expected,c.id);
  assert.equal(actual.status,c.expected===null?'needs-review':'scored',c.id);
  return {id:c.id,expected:c.expected,actual,passed:true};
});
const report={date:'2026-10-05',scope:'Research-only deterministic arithmetic and hand-authored synthetic transcription checks. Not empirical difficulty, semantic marking or live validation.',familyId:'4HB1.cube.measure',version:'0.1.0',testedSeeds:seeds,distinctGeneratedQuestions:seen.size,arithmetic,cases,scoredCases:cases.filter(c=>c.actual.status==='scored').length,deferredCases:cases.filter(c=>c.actual.status==='needs-review').length,liveEligible:false,markingCalibrated:false,humanReviewed:false};
writeFileSync(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({distinctQuestions:seen.size,arithmeticCases:arithmetic.length,scored:report.scoredCases,deferred:report.deferredCases,liveEligible:false}));
