import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateMatrixAdditionPrototype } from '../server/generators/matrix-addition.ts';
import { generateQuadraticPrototype } from '../server/generators/monic-quadratic.ts';
import { generateWeightPrototype } from '../server/generators/weight-conversion.ts';
import { generateResultantPrototype } from '../server/generators/collinear-resultant.ts';
import { generateGroupedMeanPrototype } from '../server/generators/grouped-mean.ts';
const builders = [generateMatrixAdditionPrototype, generateQuadraticPrototype, generateWeightPrototype, generateResultantPrototype, generateGroupedMeanPrototype];
function inspect(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  assert.ok(Object.isFrozen(value));
  assert.equal(Reflect.defineProperty(value, 'unexpected', { value: true }), false);
  return 1 + Object.values(value).reduce<number>((sum, child) => sum + inspect(child), 0);
}
const results = builders.map(generate => {
  let frozenObjects = 0;
  for (let seed = 0; seed < 200; seed++) {
    const q = generate(seed); const original = JSON.stringify(q);
    frozenObjects += inspect(q);
    assert.throws(() => Object.assign(q.publicQuestion, { prompt: 'Changed after generation' }), TypeError);
    assert.throws(() => Object.assign(q.privateSolution, { replacementScheme: true }), TypeError);
    assert.equal(JSON.stringify(q), original);
    assert.deepEqual(q, generate(seed));
    assert.equal(q.validation.liveEligible, false);
  }
  return { familyId: generate(0).family.id, packagesChecked: 200, frozenObjectsChecked: frozenObjects, deterministic: true, liveEligible: false };
});
const paths = ['server/generators/freeze-package.ts', 'server/generators/matrix-addition.ts', 'server/generators/monic-quadratic.ts', 'server/generators/weight-conversion.ts', 'server/generators/collinear-resultant.ts', 'server/generators/grouped-mean.ts', 'tests/question-package-immutability.test.ts'];
const report = { checkedAt: new Date().toISOString(), reviewerType: 'agent', humanReviewed: false, scope: 'Bounded in-memory immutability and deterministic-content regression only. Does not establish authenticity of deserialised packages, learner calibration, source AO or live eligibility.', previouslyMutableBuilders: 4, alreadyFrozenBuilder: '4MB1.statistics.grouped-mean', currentFrozenBuilders: 5, packagesChecked: 1000, results, sourceHashes: Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])), activeTemplates: 0, fullPedagogicalValidation: 'partial' };
if (process.argv.length !== 4 || process.argv[2] !== '--output' || dirname(resolve(process.argv[3])) !== resolve('research/validation')) throw new Error('Use --output research/validation/NEW.json');
writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ builders: 5, packagesChecked: 1000, frozenObjectsChecked: results.reduce((n, r) => n + r.frozenObjectsChecked, 0), activeTemplates: 0 }));
