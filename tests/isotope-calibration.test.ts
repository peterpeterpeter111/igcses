import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateIsotopeMassQuestion, validateIsotopeMassQuestion, ISOTOPE_MASS_DOMAIN } from '../server/generators/isotope-mass.ts';
import { markIsotopeMassResponse, type IsotopeMassResponse } from '../server/generators/isotope-mass-marking.ts';
import { markChemistrySourceIsotopeResponse } from '../server/generators/chemistry-source-calibration.ts';
import { markFormulaMassEvidence, type FormulaMassResponse } from '../server/generators/formula-mass-marking.ts';
import { activeFamilies } from '../server/template-registry.ts';

void test('finite isotope domain conserves nucleons, percentages, exact rounding and private solutions', () => {
  const seen = new Set<string>();
  let syntheticCases = 0;
  assert.equal(ISOTOPE_MASS_DOMAIN, 60);
  for (let seed = 0; seed < 1000; seed++) {
    const q = generateIsotopeMassQuestion(seed);
    assert.ok(validateIsotopeMassQuestion(q));
    assert.deepEqual(q.publicQuestion, generateIsotopeMassQuestion(seed + ISOTOPE_MASS_DOMAIN).publicQuestion);
    const rows = q.publicQuestion.stimulus.rows;
    assert.equal(rows.reduce((sum, r) => sum + r.percentageAbundance, 0), 100);
    assert.ok(rows.every((r) => r.protons === rows[0].protons && r.neutrons > 0 && r.percentageAbundance > 0));
    const numerator = rows.reduce((sum, r) => sum + (r.protons + r.neutrons) * r.percentageAbundance, 0);
    assert.equal(q.privateSolution.weightedNumerator, numerator);
    assert.ok(![0, 5].includes(numerator % 10));
    assert.equal(q.privateSolution.rounded, (Math.round(numerator / 10) / 10).toFixed(1));
    assert.equal(Object.isFrozen(rows[0]), true);
    assert.deepEqual(Object.keys(q.publicQuestion).sort(), ['maximumMarks', 'prompt', 'stimulus']);
    assert.equal(q.validation.liveEligible, false);
    assert.notEqual(JSON.stringify(rows.map((r) => [r.protons, r.neutrons, r.percentageAbundance])), '[[12,12,79],[12,13,10],[12,14,11]]');
    seen.add(JSON.stringify(q.publicQuestion));
    if (seed >= ISOTOPE_MASS_DOMAIN) continue;
    const base = { massNumbers: [], weightedNumerator: null, denominator: null, finalAnswer: '', additionalEvidence: '' };
    const cases: [IsotopeMassResponse, number | null][] = [
      [{ ...base, finalAnswer: q.privateSolution.rounded }, 4],
      [{ ...base, finalAnswer: q.privateSolution.unrounded }, 3],
      [{ ...base, massNumbers: q.privateSolution.massNumbers }, 1],
      [{ ...base, weightedNumerator: numerator }, 2],
      [{ ...base, weightedNumerator: numerator, denominator: 100 }, 3],
      [{ ...base, massNumbers: q.privateSolution.massNumbers, weightedNumerator: numerator, denominator: 100, finalAnswer: q.privateSolution.rounded }, 4],
      [base, 0],
      [{ ...base, massNumbers: rows.map((r) => r.neutrons), finalAnswer: q.privateSolution.rounded }, null],
    ];
    for (const [response, score] of cases) {
      const marked = markIsotopeMassResponse(q, response);
      assert.equal(marked.score, score);
      assert.equal(marked.status, score === null ? 'needs-review' : 'scored');
      syntheticCases++;
    }
  }
  assert.equal(seen.size, ISOTOPE_MASS_DOMAIN);
  assert.equal(syntheticCases, 480);
});

void test('published examiner examples and scheme concessions stay separate from synthetic evidence', () => {
  const data = JSON.parse(readFileSync('research/calibration/4CH1-2024-June-1-standard.json', 'utf8'));
  assert.equal(data.cases.filter((c: { labelOrigin: string }) => c.labelOrigin === 'examiner-report').length, 2);
  assert.equal(data.cases.filter((c: { labelOrigin: string }) => c.labelOrigin === 'mark-scheme-concession').length, 3);
  for (const c of data.cases) {
    const mark = c.taskId.endsWith('Q3.c') ? markChemistrySourceIsotopeResponse(c.response as IsotopeMassResponse)
      : markFormulaMassEvidence(data.formulaMassReference.terms, 194, c.response as FormulaMassResponse);
    assert.equal(mark.status, 'scored', c.id);
    assert.equal(mark.score, c.expectedScore, c.id);
    assert.equal(c.humanReviewed, false);
  }
  assert.equal(data.excludedCases[0].expectedScore, null);
  assert.equal(activeFamilies.length, 0);
});

void test('wrong-mass ECF is exact source-only; unsupported precision and contradictions defer', () => {
  const source = { massNumbers: [12, 13, 14], weightedNumerator: 1232, denominator: 100, finalAnswer: '12.3', additionalEvidence: '' };
  const result = markChemistrySourceIsotopeResponse(source);
  assert.equal(result.score, 3);
  assert.equal(markChemistrySourceIsotopeResponse({ ...source, finalAnswer: '12.32' }).status, 'needs-review');
  assert.equal(markChemistrySourceIsotopeResponse({ ...source, massNumbers: [12, 12, 12], weightedNumerator: 1200, finalAnswer: '12.0' }).status, 'needs-review');
  const q = generateIsotopeMassQuestion(0);
  for (const answer of [q.privateSolution.rounded + '0', q.privateSolution.rounded + ' g', '24.3 or 25', '2.43e1'])
    assert.equal(markIsotopeMassResponse(q, { massNumbers: [], weightedNumerator: null, denominator: null, finalAnswer: answer, additionalEvidence: '' }).status, 'needs-review');
  assert.equal(markIsotopeMassResponse(q, source).status, 'needs-review');
  const forged = structuredClone(q); forged.privateSolution.weightedNumerator++;
  assert.throws(() => markIsotopeMassResponse(forged, source));
  for (const seed of [-1, 0.1, NaN, Infinity, 0x100000000]) assert.throws(() => generateIsotopeMassQuestion(seed));
});

void test('calibration projection exposes counts only, pins evidence and preserves no-activation status', () => {
  const data = JSON.parse(readFileSync('research/calibration/4CH1-2024-June-1-standard.json', 'utf8'));
  const summary = JSON.parse(readFileSync('research/calibration-summary.json', 'utf8'));
  assert.deepEqual(Object.keys(summary).sort(), ['empiricallyCalibrated', 'examinerLabelledResponses', 'explicitSchemeConcessions', 'reviewedAt', 'sourcePolicyCasesPassed', 'unlabelledExamplesExcluded']);
  assert.equal(summary.examinerLabelledResponses, data.cases.filter((c: { labelOrigin: string }) => c.labelOrigin === 'examiner-report').length);
  assert.equal(summary.explicitSchemeConcessions, data.cases.filter((c: { labelOrigin: string }) => c.labelOrigin === 'mark-scheme-concession').length);
  assert.equal(summary.sourcePolicyCasesPassed, data.cases.length);
  assert.equal(summary.empiricallyCalibrated, false);
  const record = JSON.parse(readFileSync('research/validation/2026-10-25-chemistry-isotope-prototype.json', 'utf8'));
  for (const file of record.implementationFiles) assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.sha256, file.path);
  assert.equal(record.activeTemplates, 0);
  assert.equal(record.sourcePolicyRegression.heldOut, false);
  const registry = readFileSync('server/template-registry.ts', 'utf8');
  assert.doesNotMatch(registry, /from ['"].*(?:isotope-mass|chemistry-source-calibration)/);
  const ambiguous = markFormulaMassEvidence(data.formulaMassReference.terms, 194, {
    finalAnswer: '0.123', terms: data.formulaMassReference.terms, additionalEvidence: 'Correct intermediate194, followed by24/194.',
  });
  assert.equal(ambiguous.status, 'needs-review');
});
