import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  buildResultantPrototype,
  generateResultantPrototype,
  validateResultantPrototype,
  type ForceParameters,
} from '../server/generators/collinear-resultant.ts';
import { markResultantResponse } from '../server/generators/resultant-marking.ts';
import fixture from '../research/validation/resultant-marking-cases.json' with { type: 'json' };

const results = fixture.cases.map((item) => {
  const question = buildResultantPrototype(
    0,
    item.parameters as ForceParameters,
  );
  const actual = markResultantResponse(question, item.response);
  assert.equal(actual.score, item.expectedScore, item.id);
  assert.equal(
    actual.status,
    item.expectedScore === null ? 'needs-review' : 'scored',
    item.id,
  );
  return {
    id: item.id,
    passed: true,
    expectedScore: item.expectedScore,
    actualScore: actual.score,
    status: actual.status,
  };
});
const structures = new Set<string>();
for (let seed = 0; seed < 200; seed++) {
  const q = generateResultantPrototype(seed);
  assert.deepEqual(q, generateResultantPrototype(seed));
  assert(validateResultantPrototype(q));
  structures.add(q.structuralSignature);
}
assert.equal(structures.size, 16);
const paths = [
  'server/generators/collinear-resultant.ts',
  'server/generators/resultant-marking.ts',
  'research/validation/resultant-marking-cases.json',
];
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  familyId: '4PH1.collinear-resultant',
  version: '0.1.0',
  command: 'node --experimental-strip-types scripts/check-resultant-marking.ts',
  sourceHashes: Object.fromEntries(
    paths.map((p) => [
      p,
      createHash('sha256').update(readFileSync(p)).digest('hex'),
    ]),
  ),
  deterministicSeeds: 200,
  structuralCombinations: structures.size,
  calibration: {
    cases: results.length,
    passed: results.length,
    deferred: results.filter((r) => r.status === 'needs-review').length,
    scope:
      'Separate final magnitude and direction fields only. Hand-authored synthetic examples; no real student-response calibration or general free-text grading.',
    results,
  },
  reviewer: 'Codex Astra',
  reviewerType: 'agent',
  humanReviewed: false,
  fullPedagogicalValidation: 'partial',
  liveEligible: false,
  activeTemplates: 0,
  blockers: [
    'Free-text explanation, signed-convention and contradiction interpretation remains deferred.',
    'Inverse and three-force assessment-demand calibration still needs broader review.',
    'No live blueprint or final provider integration.',
  ],
};
writeFileSync(
  'research/validation/2026-09-11-resultant-marking.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    passed: results.length,
    deferred: report.calibration.deferred,
    seeds: 200,
    activeTemplates: 0,
  }),
);
