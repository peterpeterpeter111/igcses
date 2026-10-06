import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import extraction from '../research/extractions/4BI1-2024-June-1-standard.json' with { type: 'json' };
import skills from '../research/syllabus-skills/4BI1-issue3-q1-selected.json' with { type: 'json' };
import { subjectEvidence, coverageSummary, evidenceHighlights } from '../lib/coverage.ts';

void test('Biology exposes a detailed subset while keeping private rubrics and whole-paper gates separate', () => {
  const row = subjectEvidence('4BI1').find((r) => r.paperId === extraction.paperId)!;
  assert.equal(row.extraction?.detailedTasks, 14);
  assert.equal(row.extraction?.originalMarks, 26);
  assert.equal(row.extraction?.expectedTasks, null);
  assert.equal(row.extraction?.wholePageAudit, false);
  assert.equal(row.index, null);
  assert.deepEqual(row.extraction?.reviewedQuestions, ['1', '2']);
  assert.equal(row.extraction?.questionPaperPages, 7);
  assert.equal(row.extraction?.markSchemePages, 7);
  assert.equal(coverageSummary().find((r) => r.subject.code === '4BI1')?.fullyProcessed, 0);
  assert.equal(evidenceHighlights.biologyDetailedParts, 14);
  const summary = JSON.stringify(row);
  for (const hidden of ['sourceChain', 'numericScoring', 'pairScoring', 'eligibleCriterionIds', 'sourceFoodWeb', 'sourceFlower', 'sourceComparisonPolicy', 'sourceTraitData', 'answerLabel']) {
    assert.ok(!summary.includes(hidden), hidden);
  }
  assert.equal(extraction.paperStage, 'indexed');
  assert.equal(extraction.marksReconciled, false);
  assert.equal(extraction.tasks.reduce((sum, t) => sum + t.originalMarks, 0), 26);
  for (const [ref, hash] of [[extraction.rawManifestRef, extraction.rawManifestSha256], [extraction.coverReviewRef, extraction.coverReviewSha256]]) {
    assert.equal(createHash('sha256').update(readFileSync(ref)).digest('hex'), hash);
  }
});

void test('The food-web transcription independently gives the four-level chain and listed consumer answer', () => {
  const { edges, nodes } = extraction.sourceFoodWeb;
  const outgoing = new Map(nodes.map((node) => [node, edges.filter(([from]) => from === node).map(([, to]) => to)]));
  const paths: string[][] = [];
  function visit(path: string[]) {
    paths.push(path);
    for (const next of outgoing.get(path.at(-1)!) ?? []) {
      assert.ok(!path.includes(next), 'The source web must stay acyclic');
      visit([...path, next]);
    }
  }
  visit(['oak tree']);
  assert.deepEqual(paths.filter((p) => p.length === 4 && p.includes('mouse')), [['oak tree', 'caterpillar', 'mouse', 'tick']]);
  const levels = (organism: string) => [...new Set(paths.filter((p) => p.at(-1) === organism).map((p) => p.length))].sort((a, b) => a - b);
  assert.deepEqual(levels('mouse'), [2, 3]);
  assert.deepEqual(levels('blue jay'), [4]);
  assert.deepEqual(levels('tick'), [3, 4]);
  assert.deepEqual(extraction.tasks[2].sourceChoices?.filter((c) => 'organism' in c && levels(c.organism).length > 1), [{ label: 'D', organism: 'mouse' }]);
  const chain = extraction.tasks[1];
  assert.equal(chain.sourceChain?.correctWholeChainMarks, 2);
  assert.equal(chain.sourceChain?.correctOrderOnlyMarks, 1);
  assert.equal(chain.sourceChain?.pyramidMarks, 0);
  assert.deepEqual('requiresCriterionIds' in chain.criteria[1] ? chain.criteria[1].requiresCriterionIds : [], [chain.criteria[0].id]);
});

void test('Physical magnification retains alternative partial credit and an unresolved printed divisor', () => {
  const task = extraction.tasks[3];
  const numeric = task.numericScoring!;
  const ratio = numeric.sourceImageLengthMm / numeric.actualLengthMm;
  assert.ok(ratio >= numeric.finalRange[0] && ratio <= numeric.finalRange[1]);
  assert.deepEqual(numeric.finalRange, [29, 30]);
  assert.equal(numeric.correctFinalAnswerAloneMaximum, 2);
  assert.equal(numeric.partialMaximum, 1);
  assert.equal(numeric.partialBranchesAreAlternatives, true);
  assert.equal(numeric.measurementRequiresUnits, true);
  assert.deepEqual(numeric.publishedPartialDivisors, [3.5, 35]);
  assert.deepEqual(task.criteria.map((c) => c.marks), [0, 0]);
  assert.equal(task.measurementPresentation?.webScaleValidated, false);
  assert.equal(task.sourceQualification?.generatedUse, 'blocked-until-partial-method-and-presentation-calibration');
  assert.deepEqual(task.syllabusMappings, []);
  assert.deepEqual(task.mathematicalSkillIds, skills.skills.map((s) => s.id));
  assert.ok(skills.skills.every((s) => s.pdfPage === 49 && s.appliesToBiology));
});

void test('Nutrition keeps named-function dependencies and the transmission pool is capped at two', () => {
  const task = extraction.tasks[4], pair = task.pairScoring!;
  assert.equal(pair.functionAloneMarks, 0);
  assert.equal(pair.twoCorrectNamesAloneMarks, 2);
  assert.equal(pair.functionRequiresMatchingCreditedName, true);
  assert.equal(pair.duplicateNamesCreateNewPair, false);
  assert.deepEqual(pair.categoryNamingCaps, { vitamins: 1, minerals: 1 });
  assert.ok(pair.ignoredEvidence.includes('oxygen'));
  for (const [child, parent] of [[1, 0], [3, 2]]) {
    const criterion = task.criteria[child];
    assert.deepEqual('requiresCriterionIds' in criterion ? criterion.requiresCriterionIds : [], [task.criteria[parent].id]);
  }
  assert.equal(task.sourceQualification?.generatedUse, 'blocked-until-physiological-scope-review');
  assert.equal(task.syllabusMappings[0].kind, 'supporting');
  const transmission = extraction.tasks[5];
  assert.equal(transmission.criteria.length, 3);
  assert.equal(transmission.scoringRule.selectionLimit, 2);
  assert.equal(transmission.scoringRule.maximum, 2);
  assert.equal(transmission.sourceConcession?.transferNeedsBitingReference, true);
  assert.ok(extraction.tasks.every((t) => !t.humanReviewed && t.templateLinkStatus === 'candidate-only' && t.assessmentObjectives.length === 0));
});

void test('Biology normalization is byte-idempotent and rejects source/policy/promotion changes before writes', () => {
  const proof = JSON.parse(execFileSync('python3', ['-c', `
import copy,importlib.util,json,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('biology_export','scripts/export-biology-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=json.loads(Path(module.OVERLAY).read_text())
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
outputs=module.prepare()
assert all(content==p.read_text() for p,content in outputs.items()),'Saved export drift'
mutations={
 'hash':lambda m:m['documents'][0].update(sha256='bad'),
 'denominator':lambda m:m.update(wholePaperLeafCount=6),
 'count':lambda m:m.update(detailedLeafTasks=5),
 'processed':lambda m:m.update(paperStage='processed',fullyProcessed=True),
 'human':lambda m:m['tasks'][0].update(humanReviewed=True),
 'whole-marks':lambda m:m.update(marksReconciled=True),
 'page':lambda m:m['tasks'][0].update(questionPaperPages=[2]),
 'all-pages':lambda m:m['pageAudit']['questionPaper'].update(wholeDocumentReviewed=True),
 'invented-AO':lambda m:m['tasks'][0].update(assessmentObjectives=['AO1']),
 'mapping':lambda m:m['tasks'][0]['syllabusMappings'][0].update(pointId='4BI1:issue3:4.1'),
 'reverse-edge':lambda m:m['sourceFoodWeb']['edges'][0].reverse(),
 'missing-chain-concession':lambda m:m['tasks'][1]['sourceChain'].update(correctOrderOnlyMarks=0),
 'independent-arrow':lambda m:m['tasks'][1]['criteria'][1].update(requiresCriterionIds=[]),
 'partial-sum':lambda m:m['tasks'][3]['numericScoring'].update(partialBranchesAreAlternatives=False),
 'unitless-measurement':lambda m:m['tasks'][3]['numericScoring'].update(measurementRequiresUnits=False),
 'silent-divisor':lambda m:m['tasks'][3]['numericScoring'].update(publishedPartialDivisors=[3.5]),
 'reuse-divisor':lambda m:m['tasks'][3]['sourceQualification'].update(generatedUse='ready'),
 'web-scale':lambda m:m['tasks'][3]['measurementPresentation'].update(webScaleValidated=True),
 'function-alone':lambda m:m['tasks'][4]['pairScoring'].update(functionAloneMarks=1),
 'duplicate-names':lambda m:m['tasks'][4]['pairScoring'].update(duplicateNamesCreateNewPair=True),
 'vitamin-cap':lambda m:m['tasks'][4]['pairScoring']['categoryNamingCaps'].update(vitamins=2),
 'tick-physiology':lambda m:m['tasks'][4]['sourceQualification'].update(generatedUse='ready'),
 'nutrition-example':lambda m:m['tasks'][4]['pairScoring']['publishedExamples'][0].update(functions=['oxygen']),
 'any-three':lambda m:m['tasks'][5]['scoringRule'].update(selectionLimit=3),
 'flower-label':lambda m:m['sourceFlower']['labels'].update(T='anther'),
 'flower-option':lambda m:m['tasks'][6]['scoringRule'].update(answerLabel='A'),
 'wind-cap':lambda m:m['tasks'][9]['labelledScoring'].update(oneMarkPerLabel=False),
 'natural-method':lambda m:m['tasks'][10]['sourceMethodPolicy']['publishedAcceptedMethods'].append('cuttings'),
 'bare-cloning':lambda m:m['tasks'][11]['sourceMethodPolicy'].update(rejectedBareTerms=[]),
 'parent-count':lambda m:m['tasks'][12]['sourceComparisonPolicy'].update(ignoredEvidence=[]),
 'cell-alternative':lambda m:m['tasks'][12]['sourceComparisonPolicy'].update(publishedCellAlternative='one parent'),
 'fusion-concession':lambda m:m['tasks'][12]['sourceComparisonPolicy']['publishedGameteFusionConcession'].update(distinctMarks=1),
 'single-line-only':lambda m:m['tasks'][12]['sourceComparisonPolicy'].update(allowMultiplePointsInOneLine=False),
 'comparison-reuse':lambda m:m['tasks'][12]['sourceQualification'].update(generatedUse='ready'),
 'invented-probability':lambda m:m['tasks'][13]['sourceTraitData'].update(probabilityClaim=0.25),
 'invented-genotype':lambda m:m['tasks'][13]['sourceTraitData'].update(genotypesProvided=True),
 'traits-alone':lambda m:m['tasks'][13]['sourceBreedingPolicy'].update(desiredCharacteristicsAloneCredit=True),
 'breeding-cap':lambda m:m['tasks'][13]['scoringRule'].update(selectionLimit=4),
}
for name,mutate in mutations.items():
 m=copy.deepcopy(original);mutate(m)
 try:module.prepare(overlay=m)
 except (ValueError,KeyError):pass
 else:raise AssertionError(name+' accepted')
 assert all(p.read_bytes()==data for p,data in before.items()),name+' changed a ledger table'
print(json.dumps({'rejected':len(mutations),'tables':len(outputs)}))
`], { encoding: 'utf8' }));
  assert.equal(proof.rejected, 38);
  assert.equal(proof.tables, 4);
});

void test('Flower diagram roles remain distinct and propagation requires a specific method', () => {
  assert.deepEqual(extraction.sourceFlower.labels, { P: 'stigma', Q: 'style', R: 'petal', S: 'ovary', T: 'filament', U: 'anther' });
  assert.deepEqual(extraction.tasks.slice(6, 9).map((t) => [t.scoringRule.answerLabel, t.scoringRule.structureLabel]), [['B', 'Q'], ['D', 'U'], ['A', 'P']]);
  assert.equal(extraction.tasks[9].labelledScoring?.oneMarkPerLabel, true);
  assert.equal(extraction.tasks[9].criteria.length, 3);
  assert.deepEqual(extraction.tasks[10].sourceMethodPolicy?.publishedAcceptedMethods, ['runners', 'bulbs', 'corms', 'tubers', 'rhizomes']);
  assert.deepEqual(extraction.tasks[11].sourceMethodPolicy?.rejectedBareTerms, ['cloning']);
  assert.ok(extraction.tasks[11].acceptableAlternatives.some((method) => method === 'cuttings'));
  assert.equal(extraction.tasks.filter((t) => t.questionPath.startsWith('2.')).reduce((sum, t) => sum + t.originalMarks, 0), 14);
});

void test('Comparison and breeding source pools preserve caps and special credit without an active adaptation', () => {
  const comparison = extraction.tasks[12], breeding = extraction.tasks[13];
  for (const task of [comparison, breeding]) {
    assert.equal(task.originalMarks, 3);
    assert.equal(task.criteria.length, 4);
    assert.equal(task.scoringRule.selectionLimit, 3);
    assert.equal(task.scoringRule.maximum, 3);
    assert.equal(task.scoringRule.recognitionStatus, 'not-implemented');
  }
  const policy = comparison.sourceComparisonPolicy!;
  assert.equal(policy.allowMultiplePointsInOneLine, true);
  assert.deepEqual(policy.ignoredEvidence, ['number of parents']);
  assert.equal(policy.publishedCellAlternative, 'one parent cell');
  assert.deepEqual(policy.publishedGameteFusionConcession.creditsCriterionIds, comparison.criteria.slice(0, 2).map((c) => c.id));
  assert.equal(policy.publishedGameteFusionConcession.distinctMarks, 2);
  assert.equal(breeding.sourceTraitData?.genotypesProvided, false);
  assert.equal(breeding.sourceTraitData?.dominanceProvided, false);
  assert.equal(breeding.sourceTraitData?.probabilityClaim, null);
  assert.equal(breeding.sourceBreedingPolicy?.desiredCharacteristicsAloneCredit, false);
  assert.equal(evidenceHighlights.activeFamilies, 0);
});
