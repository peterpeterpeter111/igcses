import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateMatrixAdditionPrototype, buildMatrixAdditionPrototype, validateMatrixAdditionPrototype } from '../server/generators/matrix-addition.ts';
import { markMatrixAdditionResponse } from '../server/generators/matrix-addition-marking.ts';
const seen=new Set<string>();
for(let seed=0;seed<10000;seed++) {
 const q=generateMatrixAdditionPrototype(seed);assert.ok(validateMatrixAdditionPrototype(q));assert.deepEqual(q,generateMatrixAdditionPrototype(seed));
 const {A,B}=q.publicQuestion.stimulus;assert.deepEqual(q.privateSolution.sum,A.map((r,i)=>r.map((x,j)=>x+B[i][j])));seen.add(JSON.stringify(q.publicQuestion));
 assert.notDeepEqual(q.parameters.magnitudes,[3,2,5,1,2,4,4,2]);
}
assert.equal(seen.size,10000);
for(let mask=0;mask<256;mask++) {
 const magnitudes=Array.from({length:8},(_,i)=>mask&(1<<i)?9:1);const q=buildMatrixAdditionPrototype(0,{magnitudes});
 assert.ok(validateMatrixAdditionPrototype(q));const {A,B}=q.publicQuestion.stimulus;
 assert.deepEqual(q.privateSolution.sum,A.map((r,i)=>r.map((x,j)=>x+B[i][j])));
}
const source=buildMatrixAdditionPrototype(0,{magnitudes:[3,2,5,1,2,4,4,2]});assert.deepEqual(source.privateSolution.sum,[[1,-6],[-9,3]]);
const cases: [string,number|null][]=[['[[1,-6],[-9,3]]',1],['[[+1, −6], [−9, +3]]',1],['[[1,-6],[-9,2]]',0],['[[1,-9],[-6,3]]',0],['',0],['[1,-6,-9,3]',null],['[[1,-6,-9],[3]]',null],['[[1.0,-6],[-9,3]]',null],['[[1/1,-6],[-9,3]]',null],['[[1,-6],[-9,3]];alert(1)',null],['[[1,- 6],[-9,3]]',null],['[[1 1,-6],[-9,3]]',null]];
const results=cases.map(([answerLine,expectedScore])=>{const actual=markMatrixAdditionResponse(source,{answerLine,workingLines:[],additionalEvidence:''});assert.equal(actual.score,expectedScore);return {answerLine,expectedScore,actualScore:actual.score,status:actual.status,passed:true};});
const paths=['server/generators/matrix-addition.ts','server/generators/matrix-addition-marking.ts','tests/matrix-addition-prototype.test.ts','research/templates/4MB1-matrix-addition.v0.1.0.json'];
const report={checkedAt:new Date().toISOString(),familyId:source.family.id,version:source.family.version,sampledSeeds:10000,distinctSampledQuestions:seen.size,endpointCombinations:256,entireDomainExhausted:false,parameterDomainSize:43046720,sourceExcluded:true,syntheticResponseCases:results.length,results,sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),humanReviewed:false,liveEligible:false,assessmentCalibrationComplete:false,scope:'Bounded offline arithmetic and synthetic transcription checks only; not millions of reviewed templates or learner calibration.'};
writeFileSync('research/validation/2026-10-02-matrix-prototype.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sampledSeeds:10000,endpointCombinations:256,responseCases:results.length,liveEligible:false}));
