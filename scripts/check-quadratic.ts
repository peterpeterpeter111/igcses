import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildQuadraticPrototype, generateQuadraticPrototype, validateQuadraticPrototype } from '../server/generators/monic-quadratic.ts';
import { markQuadraticResponse } from '../server/generators/quadratic-marking.ts';
import fixtures from '../research/validation/quadratic-marking-cases.json' with { type: 'json' };
const unique = new Set<string>();
for (let seed = 0; seed < 65; seed++) {
  const q = generateQuadraticPrototype(seed);
  assert.ok(validateQuadraticPrototype(q));
  assert.deepEqual(q, generateQuadraticPrototype(seed));
  const [a,b,c] = q.privateSolution.coefficients;
  for (const x of [q.parameters.smallerRoot,q.parameters.largerRoot]) assert.equal(a*x*x+b*x+c,0);
  assert.notEqual(q.publicQuestion.stimulus,'x² − 7x + 12');
  unique.add(q.publicQuestion.stimulus);
}
assert.equal(unique.size,65);
const results = fixtures.cases.map((f) => {
  const actual=markQuadraticResponse(buildQuadraticPrototype(0,f.parameters),f.response);
  assert.equal(actual.score,f.expectedScore,f.id);
  assert.equal(actual.status,f.expectedScore===null?'needs-review':'scored',f.id);
  return { id:f.id,expectedScore:f.expectedScore,actualScore:actual.score,status:actual.status,passed:true };
});
const paths=['server/generators/freeze-package.ts','server/generators/monic-quadratic.ts','server/generators/quadratic-marking.ts','research/validation/quadratic-marking-cases.json'];
const report={schemaVersion:1,checkedAt:new Date().toISOString(),familyId:'4MB1.factorisation.monic-quadratic',version:'0.1.0',command:'node --experimental-strip-types scripts/check-quadratic.ts',
 sourceHashes:Object.fromEntries(paths.map((p)=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),reviewer:'Codex',reviewerType:'agent',humanReviewed:false,
 generatedPairs:65,distinctStimuli:unique.size,sourceExpressionExcluded:true,markingCases:results.length,deferred:results.filter((r)=>r.status==='needs-review').length,results,
 scope:fixtures.scope,sourceRefs:fixtures.sourceRefs,fullPedagogicalValidation:'partial',liveEligible:false,activeTemplates:0,
 blockers:['Official per-task AO allocation and empirical difficulty equivalence unverified.','Only explicitly transcribed two-binomial products parsed; unusual notation/additional evidence deferred.','Not a complete Maths bank or live blueprint; no AI adapter or live registration.']};
if (process.argv.length > 2) {
  if (process.argv.length !== 4 || process.argv[2] !== '--output' || dirname(resolve(process.argv[3])) !== resolve('research/validation')) throw new Error('Use --output research/validation/NEW.json');
  writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({generatedPairs:65,markingCases:results.length,deferred:report.deferred,liveEligible:false}));
