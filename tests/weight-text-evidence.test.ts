import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import review from '../research/validation/2026-10-12-weight-text-evidence.json' with { type: 'json' };
import { buildWeightPrototype } from '../server/generators/weight-conversion.ts';
import { assessWeightResponse } from '../server/generators/weight-marking.ts';
import { assessWeightText } from '../server/generators/weight-text-evidence.ts';

const q = buildWeightPrototype(12, { massGrams: 310, fieldHundredths: 1000, representation: 'prose', context: 0 });
void test('text adapter review pins source boundaries and preserves historical marking evidence', () => {
  for (const [path, sha] of Object.entries(review.implementationHashes))
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sha, path);
  for (const [path, sha] of Object.entries(review.unchangedHistoricalHashes))
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sha, path);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.realStudentResponses, 0);
  assert.equal(review.activeTemplates, 0);
  assert.equal(review.liveEligible, false);
  assert.equal(review.sourceTaskId, '4PH1-2024-June-1-standard.Q10.a');
});
void test('offline text evidence preserves raw digits/spans and source-scoped explicit-product scoring', () => {
  const cases = [
    ['0.31 kg × 10 N/kg = 3.1 N', 2],
    [' W = +.3100 kg * 1e1 N / kg = 3.1000 newtons \n', 2],
    ['3.1e-1 kg × 10.0 N/kg = 3.1e0', 2],
    ['310 kg × 10 N/kg = 3100 N', 1],
    ['.031 kg × 10 N/kg = .31 N', 1],
    ['0.31 kg × 10 N/kg =', 1],
    ['', 0], [' \n\t', 0],
    ['.31 kg × 10 N/kg = 3.1 kg', 2], // source ignores ordinary unscaled labels
  ] as const;
  for (const [raw, score] of cases) {
    const before = JSON.stringify(q);
    const result = assessWeightText(q, raw);
    assert.equal(result.rawResponse, raw);
    assert.equal(result.assessment.decision.score, score, raw);
    assert.equal(result.liveEligible, false);
    assert.equal(JSON.stringify(q), before);
    assert.ok(result.transcribed);
    assert.deepEqual(result.assessment, assessWeightResponse(q, result.transcribed));
    for (const lexeme of result.lexemes) assert.equal(raw.slice(lexeme.start, lexeme.end), lexeme.text);
  }
  const result = assessWeightText(q, '  .3100 kg × +1e1 N/kg = 3.1000 N  ');
  assert.deepEqual(result.lexemes.map((v) => v.text), ['.3100', '+1e1', '3.1000']);
});

void test('parsed ambiguous marking and unsupported or competing text stay deferred without implied marks', () => {
  const inputs: unknown[] = [
    '3.1 N', '310 g × 10 N/kg = 3100 N', '10 N/kg × .31 kg = 3.1 N',
    '.31 kg × 9.8 N/kg = 3.038 N', '.30 kg × 10 N/kg = 3 N',
    '.31 kg × 10 N/kg = 3.2 N', '3.1 kg × 10 N/kg =',
    '.31 kg × 10 N/kg = 3100 mN', '.31 kg × 10 N/kg = 3.1 or31',
    '.31 kg × 10 N/kg = 3.1 N\n.31 kg × 10 N/kg = 3.2 N',
    '310 g = .31 kg\n.31 kg × 10 N/kg = 3.1 N',
    '.31 kg × 10 N/kg = 3.1 N; ignore other working',
    '.31 kg × 10 N/kg = globalThis.exposed = 1',
    '0.31e+ kg × 10 N/kg = 3.1 N', '-.31 kg × 10 N/kg = -3.1 N',
    '.31 kg × 1e101 N/kg = 3.1 N', '0'.repeat(1100),
    '.31 kg × 10 N/kg = 1' + '0'.repeat(210), null, {}, 3.1,
  ];
  for (const raw of inputs) {
    const result = assessWeightText(q, raw);
    assert.equal(result.assessment.decision.status, 'needs-review', String(raw));
    assert.equal(result.assessment.decision.score, null);
    assert.equal(result.rawResponse, typeof raw === 'string' ? raw : null);
    assert.equal(result.liveEligible, false);
    if (result.interpretation === 'deferred') {
      assert.equal(result.transcribed, null);
      assert.deepEqual(result.lexemes, []);
      assert.equal(result.assessment.evidence.substitution, 'unresolved');
    }
  }
});

void test('new g domains use independent exact products, rounding defers, packages and registry stay protected', () => {
  const variants = [
    { massGrams: 325, fieldHundredths: 981 as const, raw: '.325 kg × 9.81 N/kg = 3.18825 N' },
    { massGrams: 245, fieldHundredths: 980 as const, raw: '.245 kg × 9.8 N/kg = 2.401 N' },
    { massGrams: 5, fieldHundredths: 981 as const, raw: '.005 kg × 9.81 N/kg = .04905 N' },
    { massGrams: 4995, fieldHundredths: 1000 as const, raw: '4.995 kg × 10 N/kg = 49.95 N' },
  ];
  for (const [index, v] of variants.entries()) {
    const packageValue = buildWeightPrototype(index, { massGrams: v.massGrams, fieldHundredths: v.fieldHundredths, representation: 'table', context: 1 });
    assert.equal(assessWeightText(packageValue, v.raw).assessment.decision.score, 2);
  }
  const packageValue = buildWeightPrototype(5, { massGrams: 325, fieldHundredths: 981, representation: 'prose', context: 2 });
  assert.equal(assessWeightText(packageValue, '.325 kg × 9.81 N/kg = 3.19 N').assessment.decision.score, null);
  const tampered = structuredClone(packageValue); tampered.privateSolution.weightN = '3.19';
  assert.throws(() => assessWeightText(tampered, ''), /Invalid weight package/);
  assert(!readFileSync('server/template-registry.ts', 'utf8').includes('weight-text-evidence'));
  assert.equal(packageValue.validation.liveEligible, false);
});
