import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  generateResultantPrototype,
  buildResultantPrototype,
  validateResultantPrototype,
} from '../server/generators/collinear-resultant.ts';
const structures = new Set<string>();
const uniqueQuestions = new Set<string>();
for (let seed = 0; seed < 200; seed++) {
  const q = generateResultantPrototype(seed);
  assert.deepEqual(q, generateResultantPrototype(seed));
  assert(validateResultantPrototype(q));
  assert.equal(q.validation.liveEligible, false);
  structures.add(q.structuralSignature);
  uniqueQuestions.add(q.publicQuestion.prompt + q.publicQuestion.stimulus);
}
assert.equal(structures.size, 16);
assert.equal(uniqueQuestions.size, 200);
let boundaryCases = 0;
for (const task of ['resultant', 'missing-force'] as const)
  for (const representation of ['prose', 'table'] as const)
    for (const axis of ['horizontal', 'vertical'] as const)
      for (const context of [0, 1, 2])
        for (const forces of [
          [5, -250],
          [250, -5],
          [5, -5, 250],
          [-250, 250, -5],
        ]) {
          const q = buildResultantPrototype(0, {
            task,
            representation,
            axis,
            context,
            forces,
          });
          assert.equal(
            q.privateSolution.signedTenths,
            task === 'resultant'
              ? forces.reduce((a, b) => a + b, 0)
              : forces[0],
          );
          assert(validateResultantPrototype(q));
          boundaryCases++;
        }
assert.equal(boundaryCases, 96);
const generatorPath = 'server/generators/collinear-resultant.ts';
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  familyId: '4PH1.collinear-resultant',
  version: '0.1.0',
  generatorPath,
  generatorSha256: createHash('sha256')
    .update(readFileSync(generatorPath))
    .digest('hex'),
  command:
    'node --experimental-strip-types scripts/check-resultant-prototype.ts',
  mathematicalAndRepresentationChecks: 'passed',
  deterministicSeeds: 200,
  uniqueQuestions: uniqueQuestions.size,
  structuralCombinations: structures.size,
  boundaryCases,
  boundaryScope:
    'Declared two/three-force structures, two axes and representations, three contexts and four extreme-value vectors; not exhaustive domain enumeration.',
  fullPedagogicalValidation: 'not-run',
  markingCalibration: 'pending',
  liveEligible: false,
  activeTemplates: 0,
};
mkdirSync('research/validation', { recursive: true });
writeFileSync(
  'research/validation/2026-09-10-resultant-prototype.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
