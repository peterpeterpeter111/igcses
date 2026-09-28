import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import fixtures from '../research/validation/weight-marking-cases.json' with { type: 'json' };
import { buildWeightPrototype, type WeightParameters } from '../server/generators/weight-conversion.ts';
import { markWeightResponse } from '../server/generators/weight-marking.ts';
const results = fixtures.cases.map((fixture) => {
  const actual = markWeightResponse(buildWeightPrototype(0, fixture.parameters as WeightParameters), fixture.response);
  assert.equal(actual.score, fixture.expectedScore, fixture.id);
  assert.equal(actual.status, fixture.expectedScore === null ? 'needs-review' : 'scored', fixture.id);
  return { id: fixture.id, expectedScore: fixture.expectedScore, actualScore: actual.score, status: actual.status, passed: true };
});
const paths = ['server/generators/weight-conversion.ts', 'server/generators/weight-marking.ts', 'research/validation/weight-marking-cases.json'];
const report = {
  schemaVersion: 1, checkedAt: new Date().toISOString(), familyId: '4PH1.weight.convert-mass', version: '0.1.0',
  command: 'node --experimental-strip-types scripts/check-weight-marking.ts',
  sourceHashes: Object.fromEntries(paths.map((path) => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  reviewer: 'Codex Astra', reviewerType: 'agent', humanReviewed: false,
  scope: fixtures.scope, sourceRefs: fixtures.sourceRefs,
  cases: results.length, passed: results.length, deferred: results.filter((r) => r.status === 'needs-review').length,
  results, fullPedagogicalValidation: 'partial', liveEligible: false, activeTemplates: 0,
  blockers: ['No real student-response calibration or free-text transcription validation.',
    'Rounding, implied method, competing work, arbitrary errors and explicit-g adaptation remain deferred.',
    'Two representations have matching numeric fixtures, not established equivalent assessment demand.',
    'No live registration, blueprint or provider integration.'],
};
writeFileSync('research/validation/2026-09-19-weight-marking.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases, passed: report.passed, deferred: report.deferred, liveEligible: false }));
