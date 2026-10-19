import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { generateFormulaMassQuestion, validateFormulaMassQuestion } from '../server/generators/relative-formula-mass.ts';
import { formulaMassCalibrationCases } from '../server/generators/formula-mass-calibration.ts';
import { markFormulaMassResponse } from '../server/generators/formula-mass-marking.ts';
const cases = formulaMassCalibrationCases();
for (const [i, c] of cases.entries()) {
  const q = generateFormulaMassQuestion(Math.floor(i / 8));
  assert.ok(validateFormulaMassQuestion(q));
  const result = markFormulaMassResponse(q, c.response);
  assert.deepEqual({ status: result.status, score: result.score }, c.expected);
}
const dataset = { schemaVersion: 1, origin: 'original-synthetic-research', familyId: '4CH1.relative-formula-mass', cases };
mkdirSync('work/template-calibration-2026-10-19', { recursive: true });
writeFileSync('work/template-calibration-2026-10-19/formula-mass-cases.json', JSON.stringify(dataset, null, 2) + '\n');
console.log(JSON.stringify({ syntheticCases: cases.length, passed: cases.length, formulaVariants: 10,
  runtimeActive: false, examinerCalibrated: false, deepseekCalls: 0 }));
