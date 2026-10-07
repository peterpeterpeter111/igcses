import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import meta from '../research/extractions/4CH1-2024-June-1-standard.json' with { type: 'json' };
import q1 from '../research/extractions/4CH1-2024-June-1-standard/Q1.json' with { type: 'json' };
import q2 from '../research/extractions/4CH1-2024-June-1-standard/Q2.json' with { type: 'json' };
import q3 from '../research/extractions/4CH1-2024-June-1-standard/Q3.json' with { type: 'json' };
import q4 from '../research/extractions/4CH1-2024-June-1-standard/Q4.json' with { type: 'json' };
import index from '../research/paper-indexes/4CH1-2024-summer-1c.json' with { type: 'json' };
import raw from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import { subjectEvidence } from '../lib/coverage.ts';

void test('Chemistry exposes twenty-two detailed Q1–Q4 leaves while keeping whole visual inventory and raw history separate', () => {
  const row = subjectEvidence('4CH1').find((x) => x.paperId === meta.paperId);
  assert.ok(row?.extraction);
  assert.equal(row.extraction.detailedTasks, 22);
  assert.equal(row.extraction.originalMarks, 38);
  assert.equal(row.extraction.expectedTasks, 56);
  assert.equal(row.extraction.wholePageAudit, true);
  assert.equal(row.index?.visualTasks, 56);
  assert.equal(row.index?.reconciledMarks, 110);
  assert.equal(meta.fullyProcessed, false);
  assert.equal(meta.marksReconciled, false);
  assert.deepEqual(meta.tasks, []);
  assert.deepEqual(q1.tasks.map((t) => t.originalMarks), [5, 2]);
  const historical = raw.records.find((x) => x.paperId === meta.paperId);
  assert.equal(historical?.extractedTaskCount, 0);
  assert.equal(historical?.processingStatus, 'indexed-only');
  assert.ok(q1.tasks.every((t) => t.syllabusMappings.every((m) => !m.pointId.endsWith('C'))));
});

void test('Chemistry retains repeat-choice credit and the method-dependent alternative chlorine paths', () => {
  const [a, b] = q1.tasks;
  assert.ok(a?.sourceTable && b?.chlorineTestScoring);
  assert.equal(a.sourceTable.repeatChoicesAllowed, true);
  assert.deepEqual(a.sourceTable.positions.map((p) => p.answer), ['lithium', 'bromine', 'ethene', 'lithium', 'diamond']);
  assert.deepEqual(a.sourceTable.positions[1]?.rejected, ['Br−']);
  assert.equal(b.chlorineTestScoring.m2DependsOnM1, true);
  assert.equal(b.chlorineTestScoring.combineBranchesForExtraMarks, false);
  assert.deepEqual(b.chlorineTestScoring.rejectMethods, ['iodide solution']);
  assert.deepEqual(b.chlorineTestScoring.maximumOneConcessions.map((c) => [c.credit, c.maximum]), [[['M1'], 1]]);
  assert.equal(b.chlorineTestScoring.recognitionStatus, 'not-implemented');
});

void test('Chemistry refuses source, allocation, dependency and readiness drift before any ledger write', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys,hashlib
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
paths=[p for p in Path('research/ledger/v1').rglob('*.csv')]
before={p:p.read_bytes() for p in paths}
for case in ['duplicate-choice-rule','bromide-symbol','table-answer','free-M2','method-rejection','concession-cap','extra-branch-credit','recognizer','criteria-marks','fake-AO','active-template','whole-pages','full-processing','whole-count','scope-promotion','wrong-component','legacy-date']:
 m=copy.deepcopy(original);a,b=m['tasks'][:2]
 if case=='duplicate-choice-rule':a['sourceTable']['repeatChoicesAllowed']=False
 elif case=='bromide-symbol':a['sourceTable']['positions'][1]['allowedSymbols'].append('Br−')
 elif case=='table-answer':a['sourceTable']['positions'][4]['answer']='graphite'
 elif case=='free-M2':b['chlorineTestScoring']['m2DependsOnM1']=False
 elif case=='method-rejection':b['chlorineTestScoring']['rejectMethods']=[]
 elif case=='concession-cap':b['chlorineTestScoring']['maximumOneConcessions'][0]['maximum']=2
 elif case=='extra-branch-credit':b['chlorineTestScoring']['combineBranchesForExtraMarks']=True
 elif case=='recognizer':b['chlorineTestScoring']['recognitionStatus']='implemented'
 elif case=='criteria-marks':a['criteria'][0]['marks']=2
 elif case=='fake-AO':a['assessmentObjectives']=['AO1']
 elif case=='active-template':a['templateLinkStatus']='active'
 elif case=='whole-pages':m['pageAudit']['questionPaper']['wholeDocumentReviewed']=False
 elif case=='full-processing':m['fullyProcessed']=True
 elif case=='whole-count':m['wholePaperLeafCount']=2
 elif case=='scope-promotion':a['syllabusMappings'][0]['currentApplicability']='complete'
 elif case=='wrong-component':a['syllabusMappings'][0]['pointId']='4CH1:issue3:1.54C'
 elif case=='legacy-date':m['canonicalIdentity']['printedDate']='2024-05-18'
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 17);
});

void test('Chemistry exporter is repeatable, bounded and preserves every unrelated ledger partition', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in ['research/ledger/v1','research/extractions/4CH1-2024-June-1-standard','research/batches','research/reviews','research/paper-indexes']:
  shutil.copytree(p,root/p)
 p=Path(module.OVERLAY);shutil.copy2(p,root/p)
 before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*.csv')}
 outputs=module.prepare(root)
 assert set(p.name for p in outputs)=={'documents.csv','papers.csv','4CH1.csv','task-mappings.csv'}
 module.export(root);after={p:p.read_bytes() for p in before}
 module.export(root);assert all(p.read_bytes()==v for p,v in after.items())
 assert all(p.read_bytes()==v for p,v in before.items() if p not in outputs)
 from ledger_io import read_table
 _,tasks=read_table(root/'research/ledger/v1','tasks')
 owned=[x for x in tasks if x['paper_id']==module.PAPER]
 assert len(owned)==22 and sum(int(x['original_marks']) for x in owned)==38
 files=[Path(module.OVERLAY),*Path(module.OVERLAY).with_suffix('').glob('*.json')]
 for p in files:
  encoded=json.dumps(dict(repository_full_name='peterpeterpeter111/igcses',base_tree_sha='0'*40,tree_elements=[dict(path=str(p),mode='100644',type='blob',content=p.read_text())]),ensure_ascii=False,separators=(',',':')).encode()
  assert len(encoded)<195000
 print(json.dumps({'parts':len(owned),'marks':38,'foreignFilesPreserved':True}))
`], { encoding: 'utf8' }));
  assert.deepEqual(result, { parts: 22, marks: 38, foreignFilesPreserved: true });
});

void test('Chemistry reactivity and redox retain original allocations and balanced species without extra branch marks', () => {
  assert.equal(q2.tasks.length, 8);
  assert.equal(q2.tasks.reduce((n, t) => n + t.originalMarks, 0), 9);
  const order = q2.tasks.find((t) => t.questionPath === '2.a.i');
  assert.deepEqual(order?.sourceScoring.order, ['Q', 'S', 'R', 'P']);
  assert.equal(order?.sourceScoring.creditPerLetter, false);
  const equation = q2.tasks.find((t) => t.questionPath === '2.a.iii');
  assert.deepEqual(equation?.sourceScoring.symbolCoefficients, [2, 6, 2, 3]);
  const [al, acid, salt, gas] = equation?.sourceScoring.symbolCoefficients ?? [];
  assert.equal(al, salt);
  assert.equal(acid, 3 * (salt ?? 0));
  assert.equal(acid, 2 * (gas ?? 0));
  const redox = q2.tasks.find((t) => t.questionPath === '2.b.iii');
  assert.equal(redox?.sourceScoring.maximum, 2);
  assert.equal(redox?.sourceScoring.extraMarksForMultipleRoutes, false);
  assert.equal(redox?.sourceScoring.explicitM2DependencyOnM1, false);
  assert.deepEqual(redox?.sourceScoring.sourceRejectedM2, ['iron loses oxygen']);
  assert.equal(redox?.dependencies.length, 0);
  assert.ok(q2.tasks.every((t) => t.templateLinkStatus === 'candidate-only' && t.assessmentObjectives.length === 0));
  assert.deepEqual(q2.tasks.find((t) => t.questionPath === '2.a.v')?.syllabusMappings, []);
});

void test('Chemistry refuses broadened Q2 hazards, lost source alternatives, table errors and extra redox credit before writes', () => {
  const passed = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['order','per-letter','zinc','unbalanced','fractions','valid-metal-alternative','vigorous-credit','energy-alone','reverse-comparison','iron-metal','redox-extra','invented-dependency','table-reaction','given-equation','fake-practical']:
 m=copy.deepcopy(original);by={t['questionPath']:t for t in m['tasks']}
 if case=='order':by['2.a.i']['sourceScoring']['order']=['Q','R','S','P']
 elif case=='per-letter':by['2.a.i']['sourceScoring']['creditPerLetter']=True
 elif case=='zinc':by['2.a.ii']['sourceScoring']['accepted']=['S']
 elif case=='unbalanced':by['2.a.iii']['sourceScoring']['symbolCoefficients']=[1,1,1,1]
 elif case=='fractions':by['2.a.iii']['sourceScoring']['coefficientFractionsAllowed']=False
 elif case=='valid-metal-alternative':by['2.a.iv']['sourceScoring']['otherMetalsAllowedIfNoHClReaction']=False
 elif case=='vigorous-credit':by['2.a.v']['sourceScoring']['accepted'].append('vigorous')
 elif case=='energy-alone':by['2.b.i']['sourceScoring']['ignore']=[]
 elif case=='reverse-comparison':by['2.b.ii']['sourceScoring']['reverseComparisonAllowed']=False
 elif case=='iron-metal':by['2.b.iii']['sourceScoring']['sourceRejectedM2']=[]
 elif case=='redox-extra':by['2.b.iii']['sourceScoring']['extraMarksForMultipleRoutes']=True
 elif case=='invented-dependency':by['2.b.iii']['sourceScoring']['explicitM2DependencyOnM1']=True
 elif case=='table-reaction':m['sourceReactivityTable']['rows'][0]['water']='fast reaction'
 elif case=='given-equation':m['sourceDisplacementEquation']['products'][0]['coefficient']=1
 elif case=='fake-practical':by['2.a.v']['syllabusMappings']=[dict(pointId='4CH1:issue3:2.21')]
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(passed.length, 15);
});

void test('Chemistry Q3 keeps six leaves and independently reconciles diagram, isotope arithmetic and credit concessions', () => {
  assert.deepEqual(q3.tasks.map((t) => t.originalMarks), [1, 1, 1, 2, 4, 1]);
  assert.equal(q3.tasks.reduce((n, t) => n + t.originalMarks, 0), 10);
  const atom = meta.sourceAtomDiagram;
  assert.equal(atom.labelIsElementSymbol, false);
  assert.equal(atom.electronsPerShell.reduce((n, e) => n + e, 0), atom.totalElectrons);
  assert.equal(atom.occupiedShells, atom.electronsPerShell.length);
  const rows = meta.sourceIsotopeTable.rows;
  const masses = rows.map((r) => r.protons + r.neutrons);
  const total = rows.reduce((n, r) => n + r.percentageAbundance, 0);
  const weighted = rows.reduce((n, r) => n + (r.protons + r.neutrons) * r.percentageAbundance, 0);
  assert.equal(total, 100);
  assert.equal(weighted / total, 24.32);
  const isotope = q3.tasks.find((t) => t.questionPath === '3.c')?.sourceScoring;
  assert.deepEqual(isotope?.massNumbers, masses);
  assert.equal(isotope?.weightedNumerator, weighted);
  assert.equal(isotope?.rounded, Number((weighted / total).toFixed(1)));
  assert.equal(isotope?.m2SubsumesM1, true);
  assert.equal(isotope?.m4RequiresNumbersFromTable, true);
  assert.deepEqual(isotope?.noWorkingSourceExamples, [{ answer: 24.3, credit: 4 }, { answer: 24.32, credit: 3 }]);
  assert.deepEqual(isotope?.workedSourceExamples, [{ answer: 12.3, credit: 3, workingRequired: true }]);
  const electron = q3.tasks.find((t) => t.questionPath === '3.b')?.sourceScoring;
  const atomsPerMole = atom.atomsPerMole.coefficient * 10 ** atom.atomsPerMole.exponent;
  assert.equal(atom.totalElectrons * atomsPerMole / 10 ** 24, 7.2);
  assert.equal(atomsPerMole / 12 / 10 ** 22, 5);
  assert.equal(electron?.explicitM2SubsumesM1, false);
  assert.equal(electron?.divisionOnlyConcession?.restrictedToSpecifiedDivision, true);
  assert.ok(q3.tasks.every((t) => t.dependencies.length === 0 && t.templateLinkStatus === 'candidate-only'));
  assert.deepEqual(q3.tasks.find((t) => t.questionPath === '3.d')?.questionPaperPages, [6, 7]);
});

void test('Chemistry Q3 rejects altered notation, broadened ECF, lost table provenance and invented credit before writes', () => {
  const passed = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['shell','placeholder','abundance','supplied-masses','group','period','formula','case','superscript','reject-Fl','wrong-electrons-ecf','unrestricted-division','wrong-division','wrong-standard-form','copied-subsumption','isotope-subsumption','wrong-numerator','lost-rounding','wrong-mass-ecf','no-working-four','worked-ecf','table-provenance','fabricated-dependency','split-isotope-leaf']:
 m=copy.deepcopy(original);by={t['questionPath']:t for t in m['tasks']};b=by['3.b']['sourceScoring'];c=by['3.c']['sourceScoring'];f=by['3.a.iii']['sourceScoring']
 if case=='shell':m['sourceAtomDiagram']['electronsPerShell']=[2,8,1]
 elif case=='placeholder':m['sourceAtomDiagram']['labelIsElementSymbol']=True
 elif case=='abundance':m['sourceIsotopeTable']['rows'][0]['percentageAbundance']=78
 elif case=='supplied-masses':m['sourceIsotopeTable']['massNumbersAreGiven']=True
 elif case=='group':by['3.a.i']['sourceScoring']['accepted']=[3,'three']
 elif case=='period':by['3.a.ii']['sourceScoring']['accepted']=[2,'two']
 elif case=='formula':f['main']='ZF'
 elif case=='case':f['penaliseIncorrectCase']=False
 elif case=='superscript':f['penaliseSuperscripts']=False
 elif case=='reject-Fl':f['rejected']=[]
 elif case=='wrong-electrons-ecf':b['ecfWrongElectronCountMultiplied']=False
 elif case=='unrestricted-division':b['divisionOnlyConcession']['restrictedToSpecifiedDivision']=False
 elif case=='wrong-division':b['divisionOnlyConcession']['divisor']=2
 elif case=='wrong-standard-form':b['result']['exponent']=23
 elif case=='copied-subsumption':b['explicitM2SubsumesM1']=True
 elif case=='isotope-subsumption':c['m2SubsumesM1']=False
 elif case=='wrong-numerator':c['weightedNumerator']=2400
 elif case=='lost-rounding':c['rounded']=24.32
 elif case=='wrong-mass-ecf':c['ecfIncorrectMassNumbersAllowed']=False
 elif case=='no-working-four':c['noWorkingSourceExamples'][1]['credit']=4
 elif case=='worked-ecf':c['workedSourceExamples'][0]['workingRequired']=False
 elif case=='table-provenance':c['m4RequiresNumbersFromTable']=False
 elif case=='fabricated-dependency':by['3.b']['dependencies']=[dict(criterionId=by['3.b']['taskId']+':M2',requiresCriterionId=by['3.b']['taskId']+':M1')]
 elif case=='split-isotope-leaf':by['3.c']['originalMarks']=1
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(passed.length, 24);
});

void test('Chemistry Q4 reconciles formula arithmetic while separating no-ECF, atom order and explanation exclusions', () => {
  assert.deepEqual(q4.tasks.map((t) => t.originalMarks), [1, 2, 1, 1, 2, 5]);
  assert.equal(q4.tasks.reduce((n, t) => n + t.originalMarks, 0), 12);
  const atoms = meta.sourceCaffeineFormula.atomCounts;
  const masses = meta.sourceRelativeAtomicMasses.values;
  assert.equal(Object.values(atoms).reduce((n, count) => n + count, 0), 24);
  const totalMass = Object.entries(atoms).reduce((n, [element, count]) => n + count * masses[element as keyof typeof masses], 0);
  assert.equal(totalMass, 194);
  const mass = q4.tasks.find((t) => t.questionPath === '4.a.ii');
  assert.equal(mass?.sourceScoring.result, totalMass);
  assert.equal(mass?.sourceScoring.correctAnswerCredit, 2);
  assert.equal(mass?.sourceScoring.correctAnswerWorkingRequired, false);
  assert.equal(mass?.sourceScoring.ecfAllowed, false);
  const empirical = q4.tasks.find((t) => t.questionPath === '4.a.iii')?.sourceScoring;
  assert.deepEqual(empirical?.atomCounts, Object.fromEntries(Object.entries(atoms).map(([element, count]) => [element, count / 2])));
  assert.equal(empirical?.atomsInAnyOrderAllowed, true);
  assert.deepEqual(q4.tasks.find((t) => t.questionPath === '4.b.i')?.sourceScoring.rejected, ['fractional distillation']);
  const compare = q4.tasks.find((t) => t.questionPath === '4.c');
  assert.deepEqual(compare?.sourceScoring.M2NoCreditIf, ['covalent bonds', 'intermolecular forces']);
  assert.deepEqual(compare?.sourceScoring.M4Rejected, ['weak forces between bonds']);
  assert.deepEqual(compare?.sourceScoring.M5NoCreditIf, ['breaking covalent bonds', 'incorrect bonds']);
  assert.equal(compare?.sourceScoring.maximum, 5);
  assert.ok(q4.tasks.every((t) => t.dependencies.length === 0 && t.assessmentObjectives.length === 0));
});

void test('Chemistry Q4 rejects lost no-ECF policy, incorrect formulas and broadened bonding credit before writes', () => {
  const passed = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['formula','atomic-mass','condenser-flow','melting-point','atom-count','formula-mass','ecf','correct-answer','working-required','empirical','atom-order','fractional-distillation','condensation','condenser-dependency','ionic-bond-alternative','M2-exclusion','simple-covalent','M4-exclusion','M5-exclusion','invented-dependency','periodic-table-source']:
 m=copy.deepcopy(original);by={t['questionPath']:t for t in m['tasks']};a=by['4.a.ii']['sourceScoring'];c=by['4.c']['sourceScoring']
 if case=='formula':m['sourceCaffeineFormula']['atomCounts']['C']=4
 elif case=='atomic-mass':m['sourceRelativeAtomicMasses']['values']['N']=12
 elif case=='condenser-flow':m['sourceDistillationApparatus']['waterIn']='upper flask end'
 elif case=='melting-point':m['sourceMeltingPointTable']['rows'][0]['meltingPointC']=730
 elif case=='atom-count':by['4.a.i']['sourceScoring']['answer']=4
 elif case=='formula-mass':a['result']=192
 elif case=='ecf':a['ecfAllowed']=True
 elif case=='correct-answer':a['correctAnswerCredit']=1
 elif case=='working-required':a['correctAnswerWorkingRequired']=True
 elif case=='empirical':by['4.a.iii']['sourceScoring']['atomCounts']['C']=8
 elif case=='atom-order':by['4.a.iii']['sourceScoring']['atomsInAnyOrderAllowed']=False
 elif case=='fractional-distillation':by['4.b.i']['sourceScoring']['rejected']=[]
 elif case=='condensation':by['4.b.ii']['sourceScoring']['M2Alternatives']=['vaporisation']
 elif case=='condenser-dependency':by['4.b.ii']['sourceScoring']['explicitM2DependencyOnM1']=True
 elif case=='ionic-bond-alternative':c['M2Allowed']=[]
 elif case=='M2-exclusion':c['M2NoCreditIf']=[]
 elif case=='simple-covalent':c['M3Allowed']=[]
 elif case=='M4-exclusion':c['M4Rejected']=[]
 elif case=='M5-exclusion':c['M5NoCreditIf']=[]
 elif case=='invented-dependency':c['explicitCriterionDependencies']=True
 elif case=='periodic-table-source':by['4.a.ii']['stimulusRefs']=by['4.a.ii']['stimulusRefs'][:1]
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(passed.length, 21);
});

void test('Chemistry whole visual inventory independently reconciles all compulsory leaves and preserves private detailed status', () => {
  assert.equal(index.tasks.length, 56);
  assert.equal(index.tasks.reduce((n, t) => n + t.originalMarks, 0), 110);
  assert.equal(index.questionCount, 10);
  assert.equal(index.allCompulsory, true);
  assert.deepEqual(index.questionTotals.map((q) => q.parts), [2, 8, 6, 6, 4, 6, 6, 8, 5, 5]);
  for (const q of index.questionTotals) {
    const leaves = index.tasks.filter((t) => t.questionPath.split('.')[0] === String(q.question));
    assert.equal(leaves.length, q.parts);
    assert.equal(leaves.reduce((n, t) => n + t.originalMarks, 0), q.marks);
  }
  assert.equal(index.tasks.filter((t) => t.detailedExtractionStatus === 'pending').length, 34);
  assert.equal(index.tasks.filter((t) => t.detailedExtractionStatus === 'pending').reduce((n, t) => n + t.originalMarks, 0), 72);
  assert.equal(index.tasks.find((t) => t.questionPath === '6.c.i')?.originalMarks, 2);
  assert.equal(index.tasks.find((t) => t.questionPath === '10.b')?.originalMarks, 2);
  assert.equal(index.visualPageAuditComplete, true);
  assert.equal(index.fullyProcessed, false);
  assert.equal(meta.fullyProcessed, false);
  assert.equal(meta.marksReconciled, false);
  assert.deepEqual(index.questionPaperVisualPages, Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(index.markSchemeVisualPages, Array.from({ length: 18 }, (_, i) => i + 1));
  const publicRow = JSON.stringify(subjectEvidence('4CH1'));
  for (const key of ['sourceScoring', 'criteria', 'weightedNumerator', 'noWorkingSourceExamples', 'chlorineTestScoring', 'M5NoCreditIf']) assert.ok(!publicRow.includes(key), key);
  assert.ok(index.tasks.every((t) => !Object.hasOwn(t, 'criteria') && !Object.hasOwn(t, 'solutionStructure')));
});

void test('Chemistry refuses structural-index drift, added rubric fields and premature extraction before writes', () => {
  const passed = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=json.loads(Path(module.INDEX).read_text());passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['sha','missing-page','processing','human','count','marks','question-total','total-page','blank-page','paper-log','filename','identity','task-order','duplicate','leaf-marks','scheme-page','stimulus','pending-promotion','rubric','source-history']:
 m=copy.deepcopy(original)
 if case=='sha':m['questionPaperSha256']='0'*64
 elif case=='missing-page':m['markSchemeVisualPages']=m['markSchemeVisualPages'][:-1]
 elif case=='processing':m['fullyProcessed']=True
 elif case=='human':m['humanReviewed']=True
 elif case=='count':m['indexedLeafCount']=57
 elif case=='marks':m['indexedOriginalMarks']=111
 elif case=='question-total':m['questionTotals'][5]['parts']=7
 elif case=='total-page':m['questionTotals'][5]['markSchemeTotalPage']=9
 elif case=='blank-page':m['blankQuestionPaperPages']=[]
 elif case=='paper-log':m['paperMatch']['schemePaperLog']='OTHER'
 elif case=='filename':m['paperMatch']['dateConflictPreserved']=False
 elif case=='identity':m['tasks'][0]['paperId']='another'
 elif case=='task-order':m['tasks'][0],m['tasks'][1]=m['tasks'][1],m['tasks'][0]
 elif case=='duplicate':m['tasks'][1]=copy.deepcopy(m['tasks'][0])
 elif case=='leaf-marks':m['tasks'][26]['originalMarks']=3
 elif case=='scheme-page':m['tasks'][31]['markSchemePages']=[9]
 elif case=='stimulus':m['tasks'][25]['stimulusPages']=[11]
 elif case=='pending-promotion':m['tasks'][-1]['detailedExtractionStatus']='source-checked-subset'
 elif case=='rubric':m['tasks'][-1]['criteria']=[]
 elif case=='source-history':m['rawManifestSha256']='0'*64
 try:module.prepare(index_overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(passed.length, 20);
});
