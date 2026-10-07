import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import meta from '../research/extractions/4CH1-2024-June-1-standard.json' with { type: 'json' };
import q1 from '../research/extractions/4CH1-2024-June-1-standard/Q1.json' with { type: 'json' };
import q2 from '../research/extractions/4CH1-2024-June-1-standard/Q2.json' with { type: 'json' };
import q3 from '../research/extractions/4CH1-2024-June-1-standard/Q3.json' with { type: 'json' };
import q4 from '../research/extractions/4CH1-2024-June-1-standard/Q4.json' with { type: 'json' };
import q5 from '../research/extractions/4CH1-2024-June-1-standard/Q5.json' with { type: 'json' };
import q6 from '../research/extractions/4CH1-2024-June-1-standard/Q6.json' with { type: 'json' };
import q7 from '../research/extractions/4CH1-2024-June-1-standard/Q7.json' with { type: 'json' };
import q8 from '../research/extractions/4CH1-2024-June-1-standard/Q8.json' with { type: 'json' };
import q9 from '../research/extractions/4CH1-2024-June-1-standard/Q9.json' with { type: 'json' };
import q10 from '../research/extractions/4CH1-2024-June-1-standard/Q10.json' with { type: 'json' };
import index from '../research/paper-indexes/4CH1-2024-summer-1c.json' with { type: 'json' };
import raw from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import { subjectEvidence } from '../lib/coverage.ts';

void test('Chemistry exposes fifty-six detailed Q1–Q10 leaves while keeping whole visual inventory and raw history separate', () => {
  const row = subjectEvidence('4CH1').find((x) => x.paperId === meta.paperId);
  assert.ok(row?.extraction);
  assert.equal(row.extraction.detailedTasks, 56);
  assert.equal(row.extraction.originalMarks, 110);
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
 assert len(owned)==56 and sum(int(x['original_marks']) for x in owned)==110
 files=[Path(module.OVERLAY),*Path(module.OVERLAY).with_suffix('').glob('*.json')]
 for p in files:
  encoded=json.dumps(dict(repository_full_name='peterpeterpeter111/igcses',base_tree_sha='0'*40,tree_elements=[dict(path=str(p),mode='100644',type='blob',content=p.read_text())]),ensure_ascii=False,separators=(',',':')).encode()
  assert len(encoded)<195000
 print(json.dumps({'parts':len(owned),'marks':110,'foreignFilesPreserved':True}))
`], { encoding: 'utf8' }));
  assert.deepEqual(result, { parts: 56, marks: 110, foreignFilesPreserved: true });
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
  assert.equal(index.tasks.filter((t) => t.detailedExtractionStatus === 'pending').length, 0);
  assert.equal(index.tasks.filter((t) => t.detailedExtractionStatus === 'pending').reduce((n, t) => n + t.originalMarks, 0), 0);
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
 elif case=='pending-promotion':m['tasks'][-1]['detailedExtractionStatus']='pending'
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

void test('Chemistry Q5 diagram coordinates independently support shared dye and the immobile-sample limitation', () => {
  const diagram = q5.tasks[0]?.sourceChromatogram;
  assert.ok(diagram);
  const spots = Object.entries(diagram.afterSpotCentreTops);
  const shared: string[][] = [];
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
    const [a, ys] = spots[i]!;
    const [b, zs] = spots[j]!;
    if (ys.some((y) => zs.some((z) => Math.abs(y - z) < 0.01))) shared.push([a, b]);
  }
  assert.deepEqual(shared, [['E', 'H']]);
  assert.equal(diagram.afterSpotCentreTops.G.length, 1);
  assert.ok(diagram.afterSpotCentreTops.G[0]! < diagram.baselineTop);
  assert.ok(Math.abs(diagram.afterSpotCentreTops.F[0]! - diagram.baselineTop) < 0.01);
  const identify = q5.tasks.find((t) => t.questionPath === '5.a.ii');
  assert.deepEqual(identify?.sourceScoring.pair, shared[0]);
  assert.equal(identify?.sourceScoring.m2DependsOnM1, true);
  const measurement = q5.tasks.find((t) => t.questionPath === '5.b');
  const geometry = measurement?.printedMeasurementAudit;
  assert.ok(geometry && measurement?.measurementPresentation);
  assert.ok(Math.abs((geometry.baselineTop - geometry.solventTop) * 25.4 / 72 - 65) < 0.01);
  assert.ok(geometry.gDistanceMm >= 38 && geometry.gDistanceMm <= 41);
  assert.ok(geometry.ratio >= 0.57 && geometry.ratio <= 0.64);
  assert.equal(measurement.measurementPresentation.webScaleValidated, false);
  assert.equal(measurement.sourceScoring.m3NoCreditIfIncorrectlyRounded, true);
  assert.equal(measurement.sourceScoring.sourceFixedDecimalPlaces, null);
  assert.equal(measurement.sourceScoring.explicitEcfPolicy, false);
  assert.deepEqual(q5.tasks.map((t) => t.originalMarks), [2, 2, 2, 3]);
});

void test('Chemistry Q5 refuses changed inference, dependency, measurement ranges and presentation promotion before writes', () => {
  const passed = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['baseline-policy','water-alternative','wrong-pair','free-reason','lost-dependency','one-dye-certainty','known-immobile-count','solvent-distance','dye-range','boundary','rounding','fixed-dp','ecf','web-scale','geometry-coordinate','geometry-sha','geometry-mm','diagram-level','stimulus-source']:
 m=copy.deepcopy(original);by={t['questionPath']:t for t in m['tasks']};a=by['5.a.i'];b=by['5.a.ii'];c=by['5.a.iii'];d=by['5.b']
 if case=='baseline-policy':a['sourceScoring']['M1']='avoid solvent evaporation'
 elif case=='water-alternative':a['sourceScoring']['allowWaterForSolvent']=False
 elif case=='wrong-pair':b['sourceScoring']['pair']=['F','G']
 elif case=='free-reason':b['sourceScoring']['m2DependsOnM1']=False
 elif case=='lost-dependency':b['dependencies']=[]
 elif case=='one-dye-certainty':c['sourceScoring']['certainSample']='F'
 elif case=='known-immobile-count':c['sourceScoring']['unknownDyeCount']=False
 elif case=='solvent-distance':d['sourceScoring']['solventDistanceMm']=60
 elif case=='dye-range':d['sourceScoring']['dyeRangeMm']=[37,42]
 elif case=='boundary':d['sourceScoring']['finalEndpointInclusivityExplicit']=True
 elif case=='rounding':d['sourceScoring']['m3NoCreditIfIncorrectlyRounded']=False
 elif case=='fixed-dp':d['sourceScoring']['sourceFixedDecimalPlaces']=2
 elif case=='ecf':d['sourceScoring']['explicitEcfPolicy']=True
 elif case=='web-scale':d['measurementPresentation']['webScaleValidated']=True
 elif case=='geometry-coordinate':d['printedMeasurementAudit']['baselineTop']=355
 elif case=='geometry-sha':d['printedMeasurementAudit']['questionPaperSha256']='0'*64
 elif case=='geometry-mm':d['printedMeasurementAudit']['solventDistanceMm']=61
 elif case=='diagram-level':a['sourceChromatogram']['afterSpotCentreTops']['H'][0]=225
 elif case=='stimulus-source':d['stimulusRefs'][0]['pdfPages']=[11]
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(passed.length, 19);
});

void test('Chemistry Q6 preserves non-additive observation and ion-table credit while independently checking hydration arithmetic', () => {
  assert.equal(q6.tasks.length, 6);
  assert.equal(q6.tasks.reduce((n, t) => n + t.originalMarks, 0), 13);
  const [observations, indicator, wire, choice, ions, hydration] = q6.tasks;
  assert.deepEqual(observations?.criteria.map((c) => c.marks), [0, 0, 0, 0, 0, 0]);
  assert.equal(observations?.sourceScoring.maximum, 2);
  assert.equal(observations?.sourceScoring.creditPerDistinctCategory, 1);
  assert.equal(observations?.sourceScoring.duplicateSynonymsAddCredit, false);
  assert.deepEqual(observations?.sourceScoring.combinedSourceConcessions, [{ response: 'moves on surface', categories: ['M2', 'M3'] }]);
  assert.deepEqual(observations?.sourceScoring.ignore, ['heat produced', 'flame']);
  // Independent audit of the stored pool allocation, not a semantic response recognizer.
  const capped = (categories: string[]) => Math.min(2, new Set(categories).size);
  assert.equal(capped(['M1', 'M1']), 1);
  assert.equal(capped(['M2', 'M3']), 2);
  assert.equal(capped(['M1', 'M2', 'M3', 'M4', 'M5', 'M6']), 2);
  assert.equal(indicator?.sourceScoring.markIndependently, true);
  assert.equal(indicator?.sourceScoring.m2DependsOnM1, false);
  assert.deepEqual(indicator?.dependencies, []);
  assert.equal(wire?.sourceScoring.explicitM2DependencyOnM1, false);
  const printed = choice?.sourceChoices?.find((c) => c.label === choice.sourceScoring.acceptedLabel);
  assert.equal(printed?.text, 'red');
  assert.deepEqual(ions?.criteria.map((c) => c.marks), [0, 0, 0]);
  assert.equal(ions?.sourceScoring.additiveCreditPerPosition, false);
  assert.deepEqual(ions?.sourceScoring.creditBands, [{ correctPositions: 3, marks: 2 }, { correctPositions: 2, marks: 1 }]);
  const thresholdCredit = (correct: number) => correct === 3 ? 2 : correct === 2 ? 1 : 0;
  assert.deepEqual([0, 1, 2, 3].map(thresholdCredit), [0, 0, 1, 2]);
  const data = hydration?.sourceHydrationData;
  assert.ok(data);
  const water = data.hydratedMassG - data.anhydrousMassG;
  const saltMoles = data.anhydrousMassG / data.saltMr;
  const waterMoles = water / data.waterMr;
  assert.ok(Math.abs(water - 10.8) < 1e-12);
  assert.equal(saltMoles, 0.05);
  assert.ok(Math.abs(waterMoles / saltMoles - 12) < 1e-12);
  assert.equal(hydration?.sourceScoring.correctAnswerWithoutWorkingCredit, 4);
  assert.equal(hydration?.sourceScoring.ecfAllowedOn, 'incorrect mass of water');
  assert.equal(hydration?.sourceScoring.generalEcfExplicit, false);
  assert.equal(hydration?.sourceScoring.m4WholeNumberRequired, true);
  assert.ok(q6.tasks.every((t) => t.scoringRule.recognitionStatus === 'not-implemented' && t.templateLinkStatus === 'candidate-only'));
});

void test('Chemistry Q6 rejects inflated pools, thresholds, invented dependencies and broader ECF before ledger writes', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['pool-max','synonym-credit','flame-credit','surface-concession','pool-additive','indicator-dependency','wrong-colour','wire-dependency','choice-label','choice-text','ion-additive','ion-threshold','ion-notation','hydrate-mass','hydrate-Mr','water-ecf','general-ecf','no-working-credit','whole-number','practical-promotion','source-page']:
 m=copy.deepcopy(original);a,b,c,d,e,f=m['tasks'][26:32]
 if case=='pool-max':a['sourceScoring']['maximum']=6
 elif case=='synonym-credit':a['sourceScoring']['duplicateSynonymsAddCredit']=True
 elif case=='flame-credit':a['sourceScoring']['ignore']=[]
 elif case=='surface-concession':a['sourceScoring']['combinedSourceConcessions'][0]['categories']=['M2']
 elif case=='pool-additive':a['criteria'][0]['marks']=1
 elif case=='indicator-dependency':b['dependencies']=[{'criterionId':b['taskId']+':M2','requiresCriterionId':b['taskId']+':M1'}]
 elif case=='wrong-colour':b['sourceScoring']['M1']='purple'
 elif case=='wire-dependency':c['sourceScoring']['explicitM2DependencyOnM1']=True
 elif case=='choice-label':d['sourceScoring']['acceptedLabel']='A'
 elif case=='choice-text':d['sourceChoices'][2]['text']='yellow'
 elif case=='ion-additive':e['criteria'][2]['marks']=1
 elif case=='ion-threshold':e['sourceScoring']['creditBands'][0]['marks']=3
 elif case=='ion-notation':e['sourceScoring']['ions'][1]['allowed']=[]
 elif case=='hydrate-mass':f['sourceHydrationData']['hydratedMassG']=24.7
 elif case=='hydrate-Mr':f['sourceHydrationData']['saltMr']=256
 elif case=='water-ecf':f['sourceScoring']['ecfAllowedOn']='any mass'
 elif case=='general-ecf':f['sourceScoring']['generalEcfExplicit']=True
 elif case=='no-working-credit':f['sourceScoring']['correctAnswerWithoutWorkingCredit']=3
 elif case=='whole-number':f['sourceScoring']['m4WholeNumberRequired']=False
 elif case=='practical-promotion':c['syllabusMappings'][0]['kind']='primary'
 elif case=='source-page':f['markSchemePages']=[9]
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 21);
});

void test('Chemistry Q7 independently reconciles bond electrons, atom balance and conditional gas-test credit', () => {
  assert.equal(q7.tasks.length, 6);
  assert.equal(q7.tasks.reduce((n, t) => n + t.originalMarks, 0), 13);
  const [air, bond, equation, effect, formula, gas] = q7.tasks;
  assert.equal(air?.sourceChoices?.find((c) => c.label === air.sourceScoring.acceptedLabel)?.text, '80%');
  assert.equal(bond?.sourceScoring.sharedElectronPairs, 3);
  assert.equal(bond?.sourceScoring.totalOuterElectrons, 10);
  assert.equal(3 * 2 + 2 * 2, 10);
  assert.deepEqual(bond?.sourceScoring.lonePairsPerAtom, [1, 1]);
  assert.equal(bond?.sourceScoring.anyCombinationOfDotsAndCrossesAllowed, true);
  assert.equal(bond?.dependencies[0]?.requiresCriterionId, bond?.taskId + ':M1');
  assert.deepEqual(equation?.sourceScoring.coefficients, [4, 2, 1, 4]);
  const [no2, water, oxygen, acid] = equation?.sourceScoring.coefficients ?? [];
  assert.equal(no2, acid); // nitrogen
  assert.equal(2 * (water ?? 0), acid); // hydrogen
  assert.equal(2 * (no2 ?? 0) + (water ?? 0) + 2 * (oxygen ?? 0), 3 * (acid ?? 0));
  assert.equal(equation?.sourceScoring.coefficientFractionsAllowed, true);
  assert.equal(equation?.sourceScoring.ignoreStateSymbolsEvenIfIncorrect, true);
  assert.equal(equation?.sourceScoring.m2DependsOnM1, true);
  assert.deepEqual(effect?.syllabusMappings, []);
  assert.deepEqual(effect?.sourceScoring.reject, ['ozone layer']);
  assert.deepEqual(effect?.sourceScoring.ignore, ['climate change']);
  assert.equal(formula?.sourceChoices?.find((c) => c.label === formula.sourceScoring.acceptedLabel)?.text, '(NH4)2CO3');
  const ammonium = gas?.sourceScoring.ammonium;
  const carbonate = gas?.sourceScoring.carbonate;
  assert.deepEqual(ammonium?.m2CreditCondition.anyOf, ['M1 earned', 'heating solution and producing a gas to test']);
  assert.equal(gas?.conditionalDependencies?.length, 1);
  assert.equal(gas?.dependencies.length, 1);
  assert.equal(gas?.dependencies[0]?.criterionId, gas?.taskId + ':M5');
  assert.equal(gas?.dependencies[0]?.requiresCriterionId, gas?.taskId + ':M4');
  assert.deepEqual(ammonium?.indicatorAlternative.covers, ['M2', 'M3']);
  assert.deepEqual(ammonium?.indicatorAlternative.observations, ['blue', 'purple']);
  assert.equal(ammonium?.m3IndependentIf, 'ammonia gas correctly tested with correct paper colour change');
  assert.equal(ammonium?.noM2OrM3If, 'litmus paper added directly to solution');
  assert.equal(carbonate?.otherAcidsAccepted, true);
  assert.equal(carbonate?.m6IndependentIf, 'correct limewater test on carbon dioxide gas carried out');
  assert.equal(carbonate?.noM5OrM6If, 'limewater added directly to solution');
  assert.ok(q7.tasks.every((t) => t.scoringRule.recognitionStatus === 'not-implemented' && t.assessmentObjectives.length === 0));
});

void test('Chemistry Q7 rejects changed diagrams, equation dependencies and gas-test concessions before ledger writes', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['air-choice','bond-pairs','lone-pairs','dots-only','free-diagram-M2','coefficients','fractions','state-penalty','free-equation-M2','ozone-credit','climate-credit','invented-effect-mapping','ion-choice','gas-cap','heating-exception','unconditional-M2','free-M5','dependent-M3','dependent-M6','litmus-in-solution','limewater-in-solution','UI-alternative','other-acid']:
 m=copy.deepcopy(original);a,b,c,d,e,f=m['tasks'][32:38]
 if case=='air-choice':a['sourceChoices'][3]['text']='70%'
 elif case=='bond-pairs':b['sourceScoring']['sharedElectronPairs']=2
 elif case=='lone-pairs':b['sourceScoring']['lonePairsPerAtom']=[0,0]
 elif case=='dots-only':b['sourceScoring']['anyCombinationOfDotsAndCrossesAllowed']=False
 elif case=='free-diagram-M2':b['dependencies']=[]
 elif case=='coefficients':c['sourceScoring']['coefficients']=[4,1,2,4]
 elif case=='fractions':c['sourceScoring']['coefficientFractionsAllowed']=False
 elif case=='state-penalty':c['sourceScoring']['ignoreStateSymbolsEvenIfIncorrect']=False
 elif case=='free-equation-M2':c['dependencies']=[]
 elif case=='ozone-credit':d['sourceScoring']['reject']=[]
 elif case=='climate-credit':d['sourceScoring']['ignore']=[]
 elif case=='invented-effect-mapping':d['syllabusMappings']=copy.deepcopy(c['syllabusMappings'])
 elif case=='ion-choice':e['sourceScoring']['acceptedLabel']='C'
 elif case=='gas-cap':f['sourceScoring']['maximum']=8
 elif case=='heating-exception':f['sourceScoring']['ammonium']['m2CreditCondition']['anyOf']=['M1 earned']
 elif case=='unconditional-M2':f['conditionalDependencies']=[]
 elif case=='free-M5':f['dependencies']=[]
 elif case=='dependent-M3':f['sourceScoring']['ammonium']['m3IndependentIf']='M1 earned'
 elif case=='dependent-M6':f['sourceScoring']['carbonate']['m6IndependentIf']='M4 earned'
 elif case=='litmus-in-solution':f['sourceScoring']['ammonium']['noM2OrM3If']=''
 elif case=='limewater-in-solution':f['sourceScoring']['carbonate']['noM5OrM6If']=''
 elif case=='UI-alternative':f['sourceScoring']['ammonium']['indicatorAlternative']['observations']=['blue']
 elif case=='other-acid':f['sourceScoring']['carbonate']['otherAcidsAccepted']=False
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 23);
});

void test('Chemistry Q8 independently checks accepted structure valencies, repeat-unit atoms and both combustion balances', () => {
  assert.equal(q8.tasks.reduce((n, t) => n + t.originalMarks, 0), 15);
  const [definition, structures, addition, repeat, disposal, combustion, incomplete, effect] = q8.tasks;
  assert.equal(definition?.sourceScoring.m2IndependentOfM1, true);
  assert.deepEqual(definition?.dependencies, []);
  assert.equal(structures?.sourceScoring.allBondsMustBeShown, true);
  assert.equal(structures?.sourceScoring.cisAndTransIsomersAllowedForBothMarks, true);
  assert.equal(structures?.sourceScoring.cisTransKnowledgeRequiredByCurrentSpecification, false);
  for (const molecule of structures?.sourceScoring.acceptedConstitutionalStructures ?? []) {
    assert.equal(molecule.hydrogensPerCarbon.length, 4);
    assert.equal(molecule.hydrogensPerCarbon.reduce((n, x) => n + x, 0), 8);
    molecule.hydrogensPerCarbon.forEach((hydrogens, position) => {
      const bondValency = molecule.carbonEdges.filter(([a, b]) => a === position + 1 || b === position + 1).reduce((n, edge) => n + (edge[2] ?? 0), 0);
      assert.equal(bondValency + hydrogens, 4);
    });
  }
  assert.equal(addition?.sourceChoices?.find((c) => c.label === addition.sourceScoring.acceptedLabel)?.text, 'addition');
  assert.equal(repeat?.sourceScoring.backboneBondOrder, 1);
  assert.equal(repeat?.sourceScoring.continuationBondsRequired, true);
  assert.equal((repeat?.sourceScoring.backboneCarbonCount ?? 0) + 1, 3);
  assert.equal((repeat?.sourceScoring.hydrogensPerBackboneCarbon ?? []).reduce((n, h) => n + h, 0) + 3, 6);
  assert.deepEqual(repeat?.sourceScoring.ignore, ['brackets', 'n']);
  assert.deepEqual(disposal?.sourceScoring.ignore, ['global warming']);
  const given = combustion?.sourceCombustionData;
  assert.ok(given);
  const y = given.carbonDioxideMassG / given.carbonDioxideMr;
  const z = given.waterMassG / given.waterMr;
  assert.deepEqual([y, z, (2 * y + z) / 2], [9, 10, 14]);
  assert.equal(combustion?.sourceScoring.m3EcfOnIncorrectM1OrM2, true);
  assert.deepEqual(incomplete?.sourceScoring.coefficients, [1, 7, 5, 3, 9]);
  assert.equal(8, 5 + 3);
  assert.equal(18, 9 * 2);
  assert.equal(7 * 2, 5 + 9);
  assert.equal(incomplete?.sourceScoring.waterAlternativeState, 'g');
  assert.equal(incomplete?.sourceScoring.explicitM2DependencyOnM1, false);
  assert.equal(effect?.sourceScoring.m2DependsOnM1, true);
  assert.deepEqual(effect?.sourceScoring.ignore, ['harmful']);
  assert.equal(effect?.sourceScoring.extraMarksForMultipleRoutes, false);
  assert.ok(q8.tasks.every((t) => t.scoringRule.recognitionStatus === 'not-implemented'));
});

void test('Chemistry Q8 rejects structural, disposal, state and ECF changes before ledger writes', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['definition-dependent','chemical-formula-credit','elements-credit','missing-bonds','cyclo-credit','cis-trans-refusal','cis-trans-required','isomer-valency','mcq-choice','repeat-double-bond','missing-continuations','bracket-penalty','landfill','burning','global-warming','source-mass','product-Mr','wrong-x','no-M3-ecf','octane-balance','water-gas-refusal','state-dependency','free-effect-M2','harmful-credit','extra-routes']:
 m=copy.deepcopy(original);a,b,c,d,e,f,g,h=m['tasks'][38:46]
 if case=='definition-dependent':a['sourceScoring']['m2IndependentOfM1']=False
 elif case=='chemical-formula-credit':a['sourceScoring']['M1Rejected']=['elements with same molecular formula']
 elif case=='elements-credit':a['sourceScoring']['M1']='elements with same molecular formula'
 elif case=='missing-bonds':b['sourceScoring']['allBondsMustBeShown']=False
 elif case=='cyclo-credit':b['sourceScoring']['reject']=[]
 elif case=='cis-trans-refusal':b['sourceScoring']['cisAndTransIsomersAllowedForBothMarks']=False
 elif case=='cis-trans-required':b['sourceScoring']['cisTransKnowledgeRequiredByCurrentSpecification']=True
 elif case=='isomer-valency':b['sourceScoring']['acceptedConstitutionalStructures'][0]['hydrogensPerCarbon']=[3,2,1,3]
 elif case=='mcq-choice':c['sourceChoices'][0]['text']='substitution'
 elif case=='repeat-double-bond':d['sourceScoring']['backboneBondOrder']=2
 elif case=='missing-continuations':d['sourceScoring']['continuationBondsRequired']=False
 elif case=='bracket-penalty':d['sourceScoring']['ignore']=[]
 elif case=='landfill':e['sourceScoring']['landfillAccepted']=[]
 elif case=='burning':e['sourceScoring']['burningAccepted']=[]
 elif case=='global-warming':e['sourceScoring']['ignore']=[]
 elif case=='source-mass':f['sourceCombustionData']['carbonDioxideMassG']=398
 elif case=='product-Mr':f['sourceCombustionData']['carbonDioxideMr']=43
 elif case=='wrong-x':f['sourceScoring']['x']=12
 elif case=='no-M3-ecf':f['sourceScoring']['m3EcfOnIncorrectM1OrM2']=False
 elif case=='octane-balance':g['sourceScoring']['coefficients']=[1,8,5,3,9]
 elif case=='water-gas-refusal':g['sourceScoring']['waterAlternativeState']='l'
 elif case=='state-dependency':g['dependencies']=[{'criterionId':g['taskId']+':M2','requiresCriterionId':g['taskId']+':M1'}]
 elif case=='free-effect-M2':h['dependencies']=[]
 elif case=='harmful-credit':h['sourceScoring']['ignore']=[]
 elif case=='extra-routes':h['sourceScoring']['extraMarksForMultipleRoutes']=True
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 25);
});

void test('Chemistry Q9 distinguishes capped linked pairs, original grid tolerance and collision-energy contradiction limits', () => {
  assert.equal(q9.tasks.reduce((n, t) => n + t.originalMarks, 0), 11);
  const [escape, cotton, explanation, curve, collisions] = q9.tasks;
  assert.deepEqual(escape?.sourceScoring.ignore, ['marble dissolving', 'gas formed']);
  assert.deepEqual(cotton?.sourceScoring.ignore, ['stop solid escaping']);
  assert.deepEqual(explanation?.criteria.map((c) => c.marks), [0, 0, 0, 0, 0, 0]);
  assert.equal(explanation?.originalMarks, 4);
  assert.equal(explanation?.sourceScoring.maximumSelectedPairs, 2);
  assert.equal(explanation?.sourceScoring.descriptionCreditCap, 2);
  assert.deepEqual(explanation?.sourceScoring.pairs.map((p) => p.criteria), [['M1', 'M2'], ['M3', 'M4'], ['M5', 'M6']]);
  assert.equal(explanation?.sourceScoring.marbleChipsInExcess, true);
  assert.equal(explanation?.sourceScoring.standaloneExplanationCreditExplicit, false);
  assert.equal(explanation?.sourceScoring.partialPairCalibrationStatus, 'pending');
  const grid = curve?.originalGridAudit;
  assert.ok(grid);
  assert.equal(grid.horizontalGridLines - 1, grid.verticalIntervals);
  assert.ok(Math.abs((grid.yAxisMaximumG - grid.yAxisMinimumG) / grid.verticalIntervals - 0.02) < 1e-12);
  assert.equal(grid.minorIntervalG / 2, grid.halfSmallSquareG);
  assert.equal(curve?.sourceScoring.plateauG, 0.27);
  assert.equal(curve?.sourceScoring.tolerance.derivedToleranceG, 0.01);
  assert.equal(curve?.graphPresentation.webScaleValidated, false);
  assert.equal(curve?.sourceScoring.endpointInclusivityExplicit, false);
  assert.equal(collisions?.sourceScoring.maximumIfIncorrectEnergyOrSpeedReference, 1);
  assert.deepEqual(collisions?.sourceScoring.contradictionTriggers, ['particles have more energy', 'particles move faster']);
  assert.deepEqual(collisions?.sourceScoring.M3Allowed, ['more collisions per unit time', 'more frequent collisions']);
  assert.ok(q9.tasks.every((t) => t.scoringRule.recognitionStatus === 'not-implemented'));
});

void test('Chemistry Q9 rejects uncapped pairs, changed grid evidence and lost contradiction limits before ledger writes', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['formed-gas-credit','cotton-solid-credit','pool-additive','pair-cap','description-cap','wrong-pair','marble-limiting','standalone-assumed','partial-pair-ready','curve-origin','curve-final','grid-interval','grid-lines','web-validated','endpoint-inclusion','wrong-apparatus','energy-cap','speed-trigger','less-chance-credit','practical-promotion']:
 m=copy.deepcopy(original);a,b,c,d,e=m['tasks'][46:51]
 if case=='formed-gas-credit':a['sourceScoring']['ignore']=[]
 elif case=='cotton-solid-credit':b['sourceScoring']['ignore']=[]
 elif case=='pool-additive':c['criteria'][0]['marks']=1
 elif case=='pair-cap':c['sourceScoring']['maximumSelectedPairs']=3
 elif case=='description-cap':c['sourceScoring']['descriptionCreditCap']=3
 elif case=='wrong-pair':c['sourceScoring']['pairs'][0]['criteria']=['M1','M4']
 elif case=='marble-limiting':c['sourceScoring']['marbleChipsInExcess']=False
 elif case=='standalone-assumed':c['sourceScoring']['standaloneExplanationCreditExplicit']=True
 elif case=='partial-pair-ready':c['sourceScoring']['partialPairCalibrationStatus']='validated'
 elif case=='curve-origin':d['sourceScoring']['m1RequiresOriginAndBelowOriginal']=False
 elif case=='curve-final':d['sourceScoring']['plateauG']=0.54
 elif case=='grid-interval':d['sourceScoring']['tolerance']['smallSquareG']=0.01
 elif case=='grid-lines':d['originalGridAudit']['horizontalGridLines']=71
 elif case=='web-validated':d['graphPresentation']['webScaleValidated']=True
 elif case=='endpoint-inclusion':d['sourceScoring']['endpointInclusivityExplicit']=True
 elif case=='wrong-apparatus':c['sourceApparatus']['cottonWoolAtNeck']=False
 elif case=='energy-cap':e['sourceScoring']['maximumIfIncorrectEnergyOrSpeedReference']=3
 elif case=='speed-trigger':e['sourceScoring']['contradictionTriggers']=['particles have more energy']
 elif case=='less-chance-credit':e['sourceScoring']['ignore']=[]
 elif case=='practical-promotion':a['syllabusMappings'][0]['kind']='primary'
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 20);
});

void test('Chemistry Q10 independently checks temperature difference, heat arithmetic and signed enthalpy alternatives without processing promotion', () => {
  assert.equal(q10.tasks.reduce((n, t) => n + t.originalMarks, 0), 11);
  const [equation, temperature, heat, enthalpy, insulation] = q10.tasks;
  assert.deepEqual(equation?.sourceScoring.products, ['Mg(NO3)2', 'H2']);
  assert.equal(equation?.sourceScoring.bothProductsRequired, true);
  assert.equal(equation?.sourceScoring.ignoreStateSymbolsEvenIfIncorrect, true);
  assert.ok(equation?.sourceQualification.scopeCaution);
  assert.deepEqual(equation?.syllabusMappings.map((m) => m.pointId), ['4CH1:issue3:1.25']);
  assert.equal(temperature?.sourceScoring.decimalPlaces, 1);
  assert.ok(Math.abs(32.4 - 16.0 - 16.4) < 1e-12);
  assert.equal(temperature?.sourceScoring.ecfFromIncorrectHighestTemperatureAllowed, true);
  assert.equal(temperature?.sourceScoring.ecfFromIncorrectStartingTemperatureAllowed, true);
  const q = 40 * 4.2 * 16.4;
  assert.ok(Math.abs(q - 2755.2) < 1e-9);
  assert.equal(heat?.sourceScoring.exactProductJ, q);
  assert.equal(heat?.sourceScoring.sourceShownProductJ, 2755);
  assert.equal(heat?.sourceScoring.acceptedSignificantFigures, 'any except 1');
  const mol = 0.12 / 24;
  assert.equal(mol, 0.005);
  const round2sf = (x: number) => Number(x.toPrecision(2));
  assert.equal(round2sf(-2755 / mol / 1000), -550);
  assert.equal(round2sf(-2760 / mol / 1000), -550);
  assert.equal(round2sf(-2800 / mol / 1000), -560);
  assert.equal(enthalpy?.sourceScoring.requiredSign, 'negative');
  assert.equal(enthalpy?.sourceScoring.significantFigures, 2);
  assert.equal(enthalpy?.sourceScoring.correctAnswerWithMinusSignWithoutWorkingCredit, 4);
  assert.deepEqual(enthalpy?.sourceScoring.ecfM2From, ['incorrect answer to10.c.i', 'incorrect M1']);
  assert.equal(enthalpy?.sourceScoring.ecfM3From, 'incorrect M2');
  assert.equal(enthalpy?.sourceScoring.ecfM4From, 'incorrect M3');
  assert.equal(enthalpy?.sourceScoring.m4RequiresTwoSignificantFiguresAndCorrectSign, true);
  assert.deepEqual(insulation?.sourceScoring.reject, ['no heat loss']);
  assert.equal(meta.detailedLeafTasks, 56);
  assert.equal(meta.detailedOriginalMarks, 110);
  assert.equal(meta.fullyProcessed, false);
  assert.equal(meta.marksReconciled, false);
  assert.equal(index.fullyProcessed, false);
  assert.ok(q10.tasks.every((t) => t.templateLinkStatus === 'candidate-only' && t.scoringRule.recognitionStatus === 'not-implemented'));
});

void test('Chemistry Q10 rejects lost ECF, precision, sign, insulation and scope restrictions before ledger writes', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,copy,importlib.util,sys
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.read_extraction(Path(module.OVERLAY));passed=[]
before={p:p.read_bytes() for p in Path('research/ledger/v1').rglob('*.csv')}
for case in ['missing-product','equation-states','acid-scope','thermometer','temperature-dp','highest-ecf','start-ecf','heat-density','heat-product','one-sf','invented-heat-ecf','wrong-Ar','magnesium-mass','enthalpy-no-working','heat-alternatives','M2-ecf','M3-ecf','M4-ecf','enthalpy-sign','enthalpy-sf','zero-loss','practical-promotion','processed-promotion']:
 m=copy.deepcopy(original);a,b,c,d,e=m['tasks'][51:56]
 if case=='missing-product':a['sourceScoring']['products']=['Mg(NO3)2']
 elif case=='equation-states':a['sourceScoring']['ignoreStateSymbolsEvenIfIncorrect']=False
 elif case=='acid-scope':a['sourceQualification']['scopeCaution']=''
 elif case=='thermometer':b['sourceThermometer']['readingC']=32.6
 elif case=='temperature-dp':b['sourceScoring']['decimalPlaces']=0
 elif case=='highest-ecf':b['sourceScoring']['ecfFromIncorrectHighestTemperatureAllowed']=False
 elif case=='start-ecf':b['sourceScoring']['ecfFromIncorrectStartingTemperatureAllowed']=False
 elif case=='heat-density':c['sourceScoring']['densityGPerCm3']=1.1
 elif case=='heat-product':c['sourceScoring']['exactProductJ']=2755
 elif case=='one-sf':c['sourceScoring']['acceptedSignificantFigures']='any'
 elif case=='invented-heat-ecf':c['sourceScoring']['explicitEcfFromIncorrectTemperature']=True
 elif case=='wrong-Ar':d['sourceEnthalpyData']['magnesiumAr']=24.3
 elif case=='magnesium-mass':d['sourceEnthalpyData']['magnesiumMassG']=0.13
 elif case=='enthalpy-no-working':d['sourceScoring']['correctAnswerWithMinusSignWithoutWorkingCredit']=3
 elif case=='heat-alternatives':d['sourceScoring']['acceptedHeatAlternativesJ']=[]
 elif case=='M2-ecf':d['sourceScoring']['ecfM2From']=[]
 elif case=='M3-ecf':d['sourceScoring']['ecfM3From']='none'
 elif case=='M4-ecf':d['sourceScoring']['ecfM4From']='none'
 elif case=='enthalpy-sign':d['sourceScoring']['requiredSign']='positive'
 elif case=='enthalpy-sf':d['sourceScoring']['m4RequiresTwoSignificantFiguresAndCorrectSign']=False
 elif case=='zero-loss':e['sourceScoring']['reject']=[]
 elif case=='practical-promotion':b['syllabusMappings'][0]['kind']='primary'
 elif case=='processed-promotion':m['fullyProcessed']=True
 try:module.prepare(overlay=m)
 except ValueError:passed.append(case)
 else:raise AssertionError(case+' accepted')
 assert all(p.read_bytes()==v for p,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(report.length, 23);
});
