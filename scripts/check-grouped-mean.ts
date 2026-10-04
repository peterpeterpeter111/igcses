import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import cases from '../research/validation/grouped-mean-marking-cases.json' with { type: 'json' };
import { generateGroupedMeanPrototype, buildGroupedMeanPrototype, validateGroupedMeanPrototype, GROUPED_MEAN_PARAMETER_SPACE } from '../server/generators/grouped-mean.ts';
import { markGroupedMeanResponse } from '../server/generators/grouped-mean-marking.ts';
import { groupedMeanFixture } from './grouped-mean-fixtures.ts';
const seen = new Set<string>(); let minMean = Infinity, maxMean = -Infinity;
for (let seed = 0; seed < GROUPED_MEAN_PARAMETER_SPACE; seed++) {
  const q = generateGroupedMeanPrototype(seed); assert.ok(validateGroupedMeanPrototype(q));
  assert.deepEqual(q, generateGroupedMeanPrototype(seed));
  const sum = q.publicQuestion.stimulus.classes.reduce((s, c) => s + (c.lower + c.upper) * c.frequency, 0);
  assert.equal(sum, q.privateSolution.exactMean.numerator); assert.equal(sum % 6, 0);
  assert.equal(q.parameters.frequencies.reduce((a, b) => a + b, 0), 60);
  assert.notDeepEqual(q.parameters.frequencies, [22,13,9,12,4]);
  assert.equal(markGroupedMeanResponse(q, { answerLine: `${sum}/120`, working: null, additionalEvidence: '' }).score, 4);
  minMean = Math.min(minMean, sum / 120); maxMean = Math.max(maxMean, sum / 120);
  seen.add(JSON.stringify(q.publicQuestion));
}
assert.equal(seen.size, GROUPED_MEAN_PARAMETER_SPACE);
const source = buildGroupedMeanPrototype(0, { frequencies: [22,13,9,12,4] });
const results = cases.cases.map(c => {
  const actual = markGroupedMeanResponse(source, groupedMeanFixture(c.workingKind, c.answerLine, c.additionalEvidence));
  assert.equal(actual.score, c.expectedScore, c.id);
  return { id: c.id, expectedScore: c.expectedScore, actual, passed: true };
});
const paths = ['server/generators/grouped-mean.ts', 'server/generators/grouped-mean-marking.ts', 'scripts/grouped-mean-fixtures.ts', 'tests/grouped-mean-prototype.test.ts', 'research/validation/grouped-mean-marking-cases.json', 'research/templates/4MB1-grouped-mean.v0.1.0.json'];
const report = { checkedAt: new Date().toISOString(), familyId: source.family.id, sourceTaskId: source.family.sourceTaskId, version: source.family.version,
  numericDomainExhausted: true, parameterDomainSize: GROUPED_MEAN_PARAMETER_SPACE, distinctGeneratedQuestions: seen.size, estimatedMeanRange: [minMean, maxMean], sourceExcluded: true,
  sourceEvidence: { questionPaper: { documentId: '4MB1-2024-summer-01-candidate-qp', pdfPages: [18] }, markScheme: { documentId: '4MB1-2024-summer-01-candidate-ms', pdfPages: [21] } },
  syntheticResponseCases: results.length, scoredCases: results.filter(r => r.actual.status === 'scored').length, deferredCases: results.filter(r => r.actual.status === 'needs-review').length, results,
  sourceHashes: Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])), humanReviewed: false, liveEligible: false, assessmentCalibrationComplete: false,
  scope: 'Entire implemented numeric domain and synthetic structured transcriptions checked. This does not exhaust possible student responses or establish context demand, official AO allocation, real learner calibration or live eligibility.' };
writeFileSync('research/validation/2026-10-04-grouped-mean-prototype.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ parameterDomainSize: GROUPED_MEAN_PARAMETER_SPACE, responseCases: results.length, scoredCases: report.scoredCases, deferredCases: report.deferredCases, liveEligible: false }));
