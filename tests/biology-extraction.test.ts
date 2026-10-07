import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import extraction from '../research/extractions/biology-extraction.ts';
import skills from '../research/syllabus-skills/4BI1-issue3-q1-selected.json' with { type: 'json' };
import index from '../research/paper-indexes/4BI1-2024-summer-1b.json' with { type: 'json' };
import { subjectEvidence, coverageSummary, evidenceHighlights } from '../lib/coverage.ts';

void test('Biology exposes a detailed subset while keeping private rubrics and whole-paper gates separate', () => {
  const row = subjectEvidence('4BI1').find((r) => r.paperId === extraction.paperId)!;
  assert.equal(row.extraction?.detailedTasks, 33);
  assert.equal(row.extraction?.originalMarks, 78);
  assert.equal(row.extraction?.expectedTasks, 45);
  assert.equal(row.extraction?.wholePageAudit, true);
  assert.equal(row.index?.visualTasks, 45);
  assert.equal(row.index?.reconciledMarks, 110);
  assert.deepEqual(row.extraction?.reviewedQuestions, ['1', '2', '3', '4', '5', '6', '7']);
  assert.equal(row.extraction?.questionPaperPages, 32);
  assert.equal(row.extraction?.markSchemePages, 24);
  assert.equal(coverageSummary().find((r) => r.subject.code === '4BI1')?.fullyProcessed, 0);
  assert.equal(evidenceHighlights.biologyDetailedParts, 33);
  const summary = JSON.stringify(row);
  for (const hidden of ['sourceChain', 'numericScoring', 'pairScoring', 'eligibleCriterionIds', 'sourceFoodWeb', 'sourceFlower', 'sourceComparisonPolicy', 'sourceTraitData', 'answerLabel', 'percentageScoring', 'sourceTemporalConcessions', 'sourceEmissionsGraph', 'graphScoring', 'directionScoring', 'sourcePondweedExperiment', 'standardFormScoring', 'sourceBloodAltitudeData', 'discussionScoring', 'comparisonScoring']) {
    assert.ok(!summary.includes(hidden), hidden);
  }
  assert.equal(extraction.paperStage, 'indexed');
  assert.equal(extraction.marksReconciled, false);
  assert.equal(extraction.tasks.reduce((sum, t) => sum + t.originalMarks, 0), 78);
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
  assert.deepEqual(extraction.tasks[2].sourceChoices?.filter((c) => typeof c.organism === 'string' && levels(c.organism).length > 1), [{ label: 'D', organism: 'mouse' }]);
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
  assert.deepEqual(task.mathematicalSkillIds, skills.skills.slice(0, 3).map((s) => s.id));
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
original=module.read_extraction(Path(module.OVERLAY))
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
 'all-pages':lambda m:m['pageAudit']['questionPaper'].update(wholeDocumentReviewed=False),
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
 'gaps-as-leaves':lambda m:m.update(detailedLeafTasks=26),
 'gap-order':lambda m:m['tasks'][14]['gapScoring']['acceptedByPosition'].reverse(),
 'gap-overcredit':lambda m:m['tasks'][14]['gapScoring'].update(marksPerPosition=[2]*7),
 'pasteurisation-equivalence':lambda m:m['tasks'][14]['sourceQualification'].update(generatedUse='ready'),
 'unbalanced-full':lambda m:m['tasks'][15]['equationScoring'].update(correctSymbolsUnbalancedMarks=2),
 'word-equation':lambda m:m['tasks'][15]['equationScoring'].update(wordEquationMarks=1),
 'CO2-presence':lambda m:m['tasks'][16].update(sourceRejectedEvidence=[]),
 'burner-alone':lambda m:m['tasks'][17].update(sourceRejectedEvidence=[]),
 'experimental-numbered':lambda m:m['tasks'][17]['practicalDemand'].update(officialNumberedMapping='2.39'),
 'mean-rounding':lambda m:m['tasks'][18]['meanScoring'].update(fullCreditValue=23.67),
 'mean-partial-sum':lambda m:m['tasks'][18]['meanScoring'].update(partialBranchesAreAlternatives=False),
 'mean-policy-promotion':lambda m:m['tasks'][18]['sourceQualification'].update(generatedUse='ready'),
 'temperature-bubble-credit':lambda m:m['tasks'][19].update(sourceRejectedEvidence=[]),
 'temperature-data':lambda m:m['tasks'][19]['sourceExperimentData'].update(temperaturesC=[20,50]),
 'greenhouse-choice':lambda m:m['tasks'][20]['scoringRule'].update(answerLabel='D'),
 'enhanced-effect-promotion':lambda m:m['tasks'][21]['sourceQualification'].update(generatedUse='ready'),
 'percentage-range':lambda m:m['tasks'][22]['percentageScoring'].update(fullCreditRange=[24,24]),
 'wrong-working-concession':lambda m:m['tasks'][22]['percentageScoring'].update(correctFinalAnswerWithWrongWorkingMarks=0),
 'extra-percent-mark':lambda m:m['tasks'][22]['percentageScoring'].update(independentMultiplyBy100Mark=True),
 'readings-tolerance':lambda m:m['tasks'][22]['percentageScoring'].update(allReadingsTolerance=2),
 'partial-numerator':lambda m:m['tasks'][22]['percentageScoring']['partialRules'][1].update(numeratorRange=[110,110]),
 'commentary-cap':lambda m:m['tasks'][23]['scoringRule'].update(selectionLimit=8),
 'temporal-concession':lambda m:m['tasks'][23]['sourceTemporalConcessions'].update(publishedGuidance=[]),
 'invented-final-year':lambda m:m['sourceEmissionsGraph'].update(tailEndYearVerified=2023),
 'graph-reuse-promotion':lambda m:m['tasks'][23]['sourceQualification'].update(generatedUse='ready'),
 'pondweed-cell':lambda m:m['sourcePondweedExperiment']['countsPerMinute'][0].__setitem__(0,21),
 'pondweed-mean':lambda m:m['tasks'][27]['sourceExperimentData']['printedMeansPerMinute'].__setitem__(0,20),
 'photosynthesis-gas':lambda m:m['tasks'][24]['scoringRule'].update(answerLabel='A'),
 'photosynthesis-site':lambda m:m['tasks'][25]['scoringRule'].update(answerLabel='B'),
 'control-cap':lambda m:m['tasks'][26]['sourceControlPolicy'].update(maximum=2),
 'grid-size':lambda m:m['tasks'][27]['graphScoring'].update(yMinimumLargeSquares=2),
 'all-three-series':lambda m:m['tasks'][27]['graphScoring']['plottingCredit'].update(noCreditIfAllThreeCountSeriesPlotted=False),
 'extrapolated-zero':lambda m:m['tasks'][27]['graphScoring']['plottingCredit'].update(noCreditIfExtrapolatedRateToZero=False),
 'bar-chart':lambda m:m['tasks'][27]['graphScoring']['barChart'].update(lineCredit=1),
 'graph-units':lambda m:m['tasks'][27]['graphScoring'].update(requireBothUnits=False),
 'explanation-cap':lambda m:m['tasks'][28]['scoringRule'].update(selectionLimit=4),
 'direction-concession':lambda m:m['tasks'][28]['directionScoring'].update(converseAcceptedCriterionIds=[]),
 'oxygen-only':lambda m:m['tasks'][28]['directionScoring'].update(oxygenRequiredForGasPoint=False),
 'light-alone':lambda m:m['tasks'][28]['directionScoring'].update(lessLightAloneCredit=True),

}
for name,mutate in mutations.items():
 m=copy.deepcopy(original);mutate(m)
 try:module.prepare(overlay=m)
 except (ValueError,KeyError):pass
 else:raise AssertionError(name+' accepted')
 assert all(p.read_bytes()==data for p,data in before.items()),name+' changed a ledger table'
print(json.dumps({'rejected':len(mutations),'tables':len(outputs)}))
`], { encoding: 'utf8' }));
  assert.equal(proof.rejected, 77);
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

void test('Yoghurt stays one seven-mark task with seven ordered credit positions', () => {
  const task = extraction.tasks.find((t) => t.questionPath === '3')!;
  assert.equal(extraction.tasks.filter((t) => t.questionPath === '3').length, 1);
  assert.equal(task.originalMarks, 7);
  assert.deepEqual(task.gapScoring?.acceptedByPosition, [['milk'], ['pasteurisation', 'sterilisation'], ['killed', 'dead', 'destroyed'], ['Lactobacillus', 'Streptococcus'], ['lactose'], ['anaerobic'], ['lactic acid', 'lactate']]);
  assert.deepEqual(task.gapScoring?.marksPerPosition, [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(task.sourceQualification?.generatedUse, 'blocked-until-process-scope-and-gap-calibration');
});

void test('Respirometer extraction preserves exact arithmetic, equation balance and source-specific concessions', () => {
  const tasks = extraction.tasks.filter((t) => t.questionPath.startsWith('4.'));
  assert.equal(tasks.length, 5);
  assert.equal(tasks.reduce((sum, t) => sum + t.originalMarks, 0), 10);
  const equation = tasks[0].equationScoring!;
  const [glucose, oxygen, co2, water] = equation.coefficients;
  assert.equal(6 * glucose, co2);
  assert.equal(12 * glucose, 2 * water);
  assert.equal(6 * glucose + 2 * oxygen, 2 * co2 + water);
  assert.equal(equation.correctSymbolsUnbalancedMarks, 1);
  assert.equal(equation.wordEquationMarks, 0);
  assert.equal(tasks[1].scoringRule.selectionLimit, 2);
  assert.deepEqual(tasks[2].sourceRejectedEvidence, ['Bunsen alone']);
  assert.deepEqual(tasks[2].syllabusMappings, []);
  const mean = tasks[3].meanScoring!;
  assert.equal(mean.readingsMm.reduce((sum, n) => sum + n, 0), 71);
  assert.equal(Math.round(71 / 3), mean.fullCreditValue);
  assert.equal(mean.partialMaximum, 1);
  assert.equal(mean.partialBranchesAreAlternatives, true);
  assert.ok(mean.partialBranches.some((branch) => branch === '23.67'));
  assert.equal(tasks[3].sourceQualification?.generatedUse, 'blocked-until-precision-policy-and-response-calibration');
  assert.equal(tasks[4].criteria.length, 5);
  assert.equal(tasks[4].scoringRule.selectionLimit, 3);
  assert.deepEqual(tasks[4].sourceRejectedEvidence, ['Energy of the bubble rather than molecules', 'Increased bubble movement alone']);
  assert.deepEqual(tasks[4].sourceExperimentData?.temperaturesC, [20, 30]);
  assert.deepEqual(skills.skills.slice(0, 5).map((skill) => skill.reference), ['1A', '1C', '3C', '2A', '2B']);
  assert.equal(evidenceHighlights.activeFamilies, 0);
});


void test('Emissions percentage keeps source final-credit override and two partial rules without invented calculation marks', () => {
  const t = extraction.tasks.find((task) => task.questionPath === '5.b.i')!;
  const p = t.percentageScoring!;
  assert.ok(p.readings && p.fullCreditRange && p.partialRules);
  const values = Object.values(p.readings);
  assert.equal(values.reduce((a, b) => a + b, 0), 453);
  const exact = p.readings.energy / values.reduce((a, b) => a + b, 0) * 100;
  assert.ok(Math.abs(exact - 24.282560706401764) < 1e-10);
  assert.ok(exact > p.fullCreditRange[0] && exact < p.fullCreditRange[1]);
  assert.equal(p.correctFinalAnswerWithWrongWorkingMarks, 3);
  assert.equal(p.correctFinalAnswerWithoutWorkingMarks, 3);
  assert.equal(p.partialRules.reduce((sum, rule) => sum + rule.marks, 0), 2);
  assert.equal(p.partialMaximum, 2);
  assert.equal(p.independentMultiplyBy100Mark, false);
  assert.equal(p.calculationLinesAreMarkingPoints, false);
  assert.deepEqual(t.criteria.map((c) => c.marks), [0, 0]);
  assert.deepEqual(t.syllabusMappings, []);
  assert.equal(p.recognitionStatus, 'not-implemented');
  assert.equal(skills.skills.length, 9);
  assert.equal(skills.taskMappings.length, 7);
});

void test('Emissions commentary keeps five-of-eight source credit and after-2020 concessions without inventing the tail year', () => {
  const t = extraction.tasks.find((task) => task.questionPath === '5.b.ii')!;
  assert.equal(t.originalMarks, 5);
  assert.equal(t.criteria.length, 8);
  assert.equal(t.scoringRule.selectionLimit, 5);
  const concessions = t.sourceTemporalConcessions!;
  assert.deepEqual(concessions.publishedGuidance.map((r) => r.criterionId), [t.criteria[0].id, t.criteria[3].id, t.criteria[7].id]);
  assert.ok(concessions.publishedGuidance.every((r) => r.wording.includes('after 2020')));
  assert.equal(extraction.sourceEmissionsGraph.tailEndYearVerified, null);
  assert.equal(extraction.sourceEmissionsGraph.rightHandTailBeyond2020, true);
  assert.deepEqual(extraction.sourceEmissionsGraph.promptYearRange, [1990, 2020]);
  assert.equal(extraction.tasks.filter((task) => task.questionPath.startsWith('5.')).reduce((sum, task) => sum + task.originalMarks, 0), 11);
  assert.equal(t.sourceQualification?.generatedUse, 'blocked-until-temporal-scope-causal-and-response-calibration');
  const greenhouse = extraction.tasks.find((task) => task.questionPath === '5.a.ii')!;
  assert.equal(greenhouse.syllabusMappings[0].kind, 'supporting');
  assert.equal(greenhouse.sourceQualification?.generatedUse, 'blocked-until-natural-enhanced-scope-and-response-calibration');
});

void test('Pondweed table retains supplied means and graph/explanation credit restrictions', () => {
  const data = extraction.sourcePondweedExperiment;
  assert.deepEqual(data.distanceCm, [2, 4, 6, 8, 10, 12]);
  const rounded = data.countsPerMinute.map((row) => Math.round(row.reduce((sum, x) => sum + x, 0) / row.length));
  assert.deepEqual(rounded, data.printedMeansPerMinute);
  assert.equal(data.plotSeries, 'printed-mean');
  const graph = extraction.tasks.find((t) => t.questionPath === '6.b.i')!;
  assert.equal(graph.graphScoring?.meanRecalculationIsSeparateTask, false);
  assert.equal(graph.graphScoring?.barChart.lineCredit, 0);
  const explanation = extraction.tasks.find((t) => t.questionPath === '6.b.ii')!;
  assert.equal(explanation.criteria.length, 4);
  assert.equal(explanation.scoringRule.selectionLimit, 3);
  assert.deepEqual(explanation.directionScoring?.converseAcceptedCriterionIds, [explanation.criteria[1].id, explanation.criteria[2].id]);
  assert.deepEqual(explanation.directionScoring?.converseRejectedCriterionIds, [explanation.criteria[0].id, explanation.criteria[3].id]);
  assert.equal(extraction.tasks.filter((t) => t.questionPath.startsWith('6.')).reduce((sum, t) => sum + t.originalMarks, 0), 11);
});

void test('The whole Biology visual index reconciles all compulsory allocations without promoting remaining extraction', () => {
  assert.equal(index.tasks.length, 45);
  assert.equal(index.tasks.reduce((sum, t) => sum + t.originalMarks, 0), 110);
  assert.deepEqual(index.questionTotals.map((q) => [q.parts, q.marks]), [[6,12],[8,14],[1,7],[5,10],[4,11],[5,11],[4,13],[5,12],[6,14],[1,6]]);
  const pending = index.tasks.filter((t) => t.detailedExtractionStatus === 'pending');
  assert.equal(pending.length, 12);
  assert.equal(pending.reduce((sum, t) => sum + t.originalMarks, 0), 32);
  assert.equal(index.fullyProcessed, false);
  assert.equal(extraction.marksReconciled, false);
  const proof = JSON.parse(execFileSync('python3', ['-c', `
import copy,importlib.util,json,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('biology_export','scripts/export-biology-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=json.loads(Path(module.INDEX).read_text())
mutations={
 'scheme-hash':lambda m:m.update(markSchemeSha256='bad'),
 'denominator':lambda m:m.update(indexedLeafCount=44),
 'promoted':lambda m:m.update(fullyProcessed=True),
 'human':lambda m:m.update(humanReviewed=True),
 'optional':lambda m:m.update(allCompulsory=False),
 'missing-page':lambda m:m['questionPaperVisualPages'].pop(),
 'renamed-leaf':lambda m:m['tasks'][29].update(questionPath='7.c'),
 'swapped-pages':lambda m:m['tasks'][29].update(questionPaperPages=[22]),
 'private-rubric':lambda m:m['tasks'][29].update(criteria=[{'marks':3}]),
 'remaining-promotion':lambda m:m['tasks'][33].update(detailedExtractionStatus='source-checked-subset'),
 'date-erasure':lambda m:m['paperMatch'].update(dateConflictPreserved=False),
 'unknown-variant':lambda m:m['paperMatch'].update(variant='standard'),
}
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for name,mutate in mutations.items():
 m=copy.deepcopy(original);mutate(m)
 try:module.prepare(index_overlay=m)
 except ValueError:pass
 else:raise AssertionError(name)
assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps({'rejected':len(mutations)}))
`], { encoding:'utf8' }));
  assert.equal(proof.rejected, 12);
});

void test('Biology altitude calculations independently select the right sex, altitude and baseline with source precision', () => {
  const table = extraction.sourceBloodAltitudeData;
  const row = table.altitudesM.indexOf(table.womanAltitudeM);
  assert.equal(row, 1);
  const exact = table.redCellsPerLitreTimes10Power12.women[row] * table.womanBloodVolumeLitres * 10 ** 12;
  assert.equal(exact, 22_360_000_000_000);
  const standard = extraction.tasks.find((t) => t.questionPath === '7.b.i')!.standardFormScoring!;
  assert.equal(Number(standard.fullCreditStandardForms[1]), exact);
  assert.ok(standard.fullCreditStandardForms.every((v) => Number(v.split('e')[0]) >= 1 && Number(v.split('e')[0]) < 10));
  assert.ok(standard.nonstandardAcceptedForms.every((v) => Number(v.split('e')[0]) >= 10));
  assert.equal(standard.nonstandardMarks, 2);
  assert.equal(standard.multiplyByCoefficientOnlyMarks, 1);
  assert.equal(standard.partialBranchesAreAlternatives, true);
  const percentage = extraction.tasks.find((t) => t.questionPath === '7.b.ii')!.percentageScoring!;
  assert.ok('baselineValue' in percentage);
  const low = table.haemoglobinGramsPerLitre.men[0], high = table.haemoglobinGramsPerLitre.men[2];
  assert.equal(percentage.baselineValue, low);
  assert.ok(Math.abs(((high - low) / low) * 100 - 75 / 37) < 1e-12);
  assert.equal(percentage.partialMaximum, 1);
  assert.equal(percentage.independentMultiplyBy100Mark, false);
});

void test('Altitude discussion preserves non-monotonic data and distinct sampling limits without causal promotion', () => {
  const table = extraction.sourceBloodAltitudeData;
  for (const sex of ['men', 'women'] as const) {
    const hb = table.haemoglobinGramsPerLitre[sex], cells = table.redCellsPerLitreTimes10Power12[sex];
    assert.ok(hb[1] > hb[0] && hb[2] < hb[1] && hb[2] > hb[0]);
    assert.ok(cells[1] > cells[0] && cells[2] < cells[1] && cells[2] > cells[0]);
    assert.ok(table.sampleCounts[sex][0] > table.sampleCounts[sex][1]);
  }
  for (let i = 0; i < table.altitudesM.length; i++) {
    assert.ok(table.sampleCounts.women[i] > table.sampleCounts.men[i]);
    assert.ok(table.haemoglobinGramsPerLitre.men[i] > table.haemoglobinGramsPerLitre.women[i]);
    assert.ok(table.redCellsPerLitreTimes10Power12.men[i] > table.redCellsPerLitreTimes10Power12.women[i]);
  }
  const task = extraction.tasks.find((t) => t.questionPath === '7.b.iii')!;
  assert.equal(task.criteria.length, 12);
  assert.equal(task.scoringRule.selectionLimit, 5);
  assert.equal(task.discussionScoring?.causalInferenceValidated, false);
  assert.equal(task.discussionScoring?.publishedConcessions.length, 2);
  assert.equal(extraction.tasks.filter((t) => t.questionPath.startsWith('7.')).reduce((s, t) => s + t.originalMarks, 0), 13);
  assert.equal(extraction.fullyProcessed, false);
});

void test('Q7 source changes and premature numeric/causal activation are rejected before any ledger write', () => {
  const proof = JSON.parse(execFileSync('python3', ['-c', `
import copy,importlib.util,json,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('biology_export','scripts/export-biology-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY))
mutations={
 'sex-column':lambda m:m['sourceBloodAltitudeData']['redCellsPerLitreTimes10Power12']['women'].__setitem__(1,5.37),
 'exponent':lambda m:m['tasks'][30]['standardFormScoring'].update(sourceExponent=13),
 'sample-count':lambda m:m['tasks'][32]['sourceBloodAltitudeData']['sampleCounts']['men'].__setitem__(2,2943),
 'comparison-wording':lambda m:m['tasks'][29]['comparisonScoring'].update(mandatoryBothSidesInEverySentence=True),
 'comparison-cap':lambda m:m['tasks'][29]['scoringRule'].update(selectionLimit=4),
 'standard-full':lambda m:m['tasks'][30]['standardFormScoring'].update(fullCreditStandardForms=['22.36e12']),
 'additive-partial':lambda m:m['tasks'][30]['standardFormScoring'].update(partialBranchesAreAlternatives=False),
 'line-marks':lambda m:m['tasks'][30]['criteria'][0].update(marks=1),
 'percentage-baseline':lambda m:m['tasks'][31]['percentageScoring'].update(baselineValue=151),
 'percentage-extra':lambda m:m['tasks'][31]['percentageScoring'].update(independentMultiplyBy100Mark=True),
 'discussion-cap':lambda m:m['tasks'][32]['scoringRule'].update(selectionLimit=12),
 'oxygen-concession':lambda m:m['tasks'][32]['discussionScoring'].update(publishedConcessions=[]),
 'causality':lambda m:m['tasks'][32]['discussionScoring'].update(causalInferenceValidated=True),
 'activation':lambda m:m['tasks'][32]['sourceQualification'].update(generatedUse='ready'),
}
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*') if p.is_file()}
for name,mutate in mutations.items():
 m=copy.deepcopy(original);mutate(m)
 try:module.prepare(overlay=m)
 except ValueError:pass
 else:raise AssertionError(name+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items()),name+' wrote ledger data'
print(json.dumps({'rejected':len(mutations)}))
`], { encoding: 'utf8' }));
  assert.equal(proof.rejected, 14);
});
