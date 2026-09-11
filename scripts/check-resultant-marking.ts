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
import structuralFixture from '../research/validation/resultant-structure-cases.json' with { type: 'json' };

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
const structuralResults = structuralFixture.fixtures.map((item) => {
  const question = buildResultantPrototype(0, item.parameters as ForceParameters);
  assert.equal(question.privateSolution.magnitudeN, Number(item.independentAnswer.magnitude), item.id);
  assert.equal(question.privateSolution.direction, item.independentAnswer.direction, item.id);
  const outcomes = item.responses.map((response) => {
    const actual = markResultantResponse(question, response);
    assert.equal(actual.score, response.expectedScore, item.id);
    assert.equal(actual.status, response.expectedScore === null ? 'needs-review' : 'scored', item.id);
    return { expectedScore: response.expectedScore, actualScore: actual.score, status: actual.status, passed: true };
  });
  return { id: item.id, structuralSignature: question.structuralSignature, passed: true, outcomes };
});
assert.equal(new Set(structuralResults.map((r) => r.structuralSignature)).size, 16);
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
  'research/validation/resultant-structure-cases.json',
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
  structuralCalibration: {
    scope: structuralFixture.scope,
    fixtures: structuralResults.length,
    outcomes: structuralResults.reduce((n, r) => n + r.outcomes.length, 0),
    deferred: structuralResults.flatMap((r) => r.outcomes).filter((r) => r.status === 'needs-review').length,
    results: structuralResults,
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
    structuralFixtures: structuralResults.length,
    structuralOutcomes: report.structuralCalibration.outcomes,
    activeTemplates: 0,
  }),
);
