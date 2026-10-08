// Exhaustive offline numeric novelty check, not learner or marking validation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWeightPrototype, generateWeightPrototype, validateWeightPrototype } from '../server/generators/weight-conversion.ts';
import { FRESH_WEIGHT_NUMERIC_GROUPS, FRESH_WEIGHT_PRESENTATIONS, generateFreshWeightCandidate, weightDiversityKey, selectDistinctWeightVariants } from '../server/generators/weight-diversity.ts';
function scaled(text: string, places: number): bigint {
  assert.match(text, /^\d+(?:\.\d+)?$/);
  const [whole, fraction = ''] = text.split('.');
  assert.ok(fraction.length <= places);
  return BigInt(whole + fraction.padEnd(places, '0'));
}
const candidates = Array.from({ length: FRESH_WEIGHT_PRESENTATIONS }, (_, seed) => generateFreshWeightCandidate(seed));
const groups = new Map<string, number>();
const masses = new Set<number>();
const fields = new Map<number, number>(), representations = new Map<string, number>(), contexts = new Map<number, number>();
let arithmeticChecks = 0;
for (const q of candidates) {
  assert.ok(validateWeightPrototype(q));
  assert.equal(q.parameters.massGrams % 5, 0);
  assert.notEqual(q.parameters.massGrams, 250);
  assert.equal(scaled(q.privateSolution.massKg, 3), BigInt(q.parameters.massGrams));
  assert.equal(scaled(q.privateSolution.weightN, 5), BigInt(q.parameters.massGrams) * BigInt(q.parameters.fieldHundredths));
  assert.ok(Object.isFrozen(q) && Object.isFrozen(q.privateSolution.working));
  assert.equal(q.validation.liveEligible, false);
  assert.equal(q.validation.markingCalibrated, false);
  arithmeticChecks++;
  const key = weightDiversityKey(q);
  groups.set(key, (groups.get(key) ?? 0) + 1);
  masses.add(q.parameters.massGrams);
  fields.set(q.parameters.fieldHundredths, (fields.get(q.parameters.fieldHundredths) ?? 0) + 1);
  representations.set(q.parameters.representation, (representations.get(q.parameters.representation) ?? 0) + 1);
  contexts.set(q.parameters.context, (contexts.get(q.parameters.context) ?? 0) + 1);
}
assert.equal(groups.size, FRESH_WEIGHT_NUMERIC_GROUPS);
assert.equal(masses.size, 999);
assert.ok([...groups.values()].every((count) => count === 6));
assert.deepEqual([...fields.entries()], [[980,5994],[981,5994],[1000,5994]]);
assert.deepEqual([...representations.entries()], [['prose',8991],['table',8991]]);
assert.deepEqual([...contexts.entries()], [[0,5994],[1,5994],[2,5994]]);
const original = [];
for (const fieldHundredths of [980,981,1000] as const) for (const representation of ['prose','table'] as const) for (const context of [0,1,2]) original.push(buildWeightPrototype(0,{ massGrams:250,fieldHundredths,representation,context }));
const selected = selectDistinctWeightVariants([...original,...candidates],30);
assert.equal(selected.questions.length,30);
assert.equal(selected.excludedSourceCandidates,18);
assert.equal(selected.availableGroups,2997);
assert.equal(selected.duplicates,14985);
assert.ok(Object.isFrozen(selected.questions));
const history = selectDistinctWeightVariants(candidates,30,selected.keys);
assert.equal(history.availableGroups,2967);
assert.ok(history.keys.every((key) => !selected.keys.includes(key)));
const legacy = Array.from({ length:200 },(_,seed)=>generateWeightPrototype(seed));
const legacyMasses = new Set(legacy.map((q)=>q.parameters.massGrams));
const paths=['server/generators/weight-conversion.ts','server/generators/weight-diversity.ts','tests/weight-diversity.test.ts','scripts/check-weight-diversity.ts'];
const report={ schemaVersion:1,reviewDate:'2026-10-08',familyId:'4PH1.weight.convert-mass',familyVersion:'0.1.0',reviewer:'Codex',reviewerType:'agent',humanReviewed:false,
  scope:'Exhaustive finite numeric candidate and repetition policy only. No live registration, source-demand equivalence, empirical difficulty, free-text parsing or examiner marking calibration.',
  sourceTaskId:'4PH1-2024-June-1-standard.Q10.a',
  policy:'Exclude original250g for all three source-permitted g values; group equal mass/g across event names and prose/table presentation. Historical prototype and source fixtures are preserved.',
  parameterPackagesChecked:candidates.length,arithmeticChecks,distinctNumericGroups:groups.size,distinctMasses:masses.size,presentationsPerNumericGroup:6,
  fields:Object.fromEntries(fields),representations:Object.fromEntries(representations),contexts:Object.fromEntries(contexts),originalEquivalentsRejected:selected.excludedSourceCandidates,cosmeticDuplicatesGrouped:selected.duplicates,requestedSetSize:30,selectedSetSize:selected.questions.length,previousSetKeysExcluded:30,remainingGroupsAfterPreviousSet:history.availableGroups,
  legacyDiagnostic:{ seedsChecked:200,distinctMasses:legacyMasses.size,minimumMass:Math.min(...legacyMasses),maximumMass:Math.max(...legacyMasses),note:'Contiguous seed sampling is not a full parameter-domain proof; this diagnostic does not change the historical generator.' },
  finitePeriod:FRESH_WEIGHT_PRESENTATIONS,infiniteNoveltyClaim:false,sourceHashes:Object.fromEntries(paths.map((path)=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  liveEligible:false,activeTemplates:0,markingCalibrated:false,blockers:['Whole response/rounding/method-credit calibration remains incomplete.','Representation adaptations still lack complete pedagogical/assessment-demand validation.','Numerical freshness alone is not structural, semantic or difficulty variety.','No live practice session or80-mark blueprint integration.']};
writeFileSync('research/validation/2026-10-08-weight-diversity.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({packages:report.parameterPackagesChecked,groups:report.distinctNumericGroups,sourceRejected:report.originalEquivalentsRejected,legacy:report.legacyDiagnostic}));
