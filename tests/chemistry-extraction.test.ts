import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import meta from '../research/extractions/4CH1-2024-June-1-standard.json' with { type: 'json' };
import q1 from '../research/extractions/4CH1-2024-June-1-standard/Q1.json' with { type: 'json' };
import q2 from '../research/extractions/4CH1-2024-June-1-standard/Q2.json' with { type: 'json' };
import raw from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import { subjectEvidence } from '../lib/coverage.ts';

void test('Chemistry exposes ten detailed Q1–Q2 leaves while keeping the unknown whole denominator and raw history honest', () => {
  const row = subjectEvidence('4CH1').find((x) => x.paperId === meta.paperId);
  assert.ok(row?.extraction);
  assert.equal(row.extraction.detailedTasks, 10);
  assert.equal(row.extraction.originalMarks, 16);
  assert.equal(row.extraction.expectedTasks, null);
  assert.equal(row.extraction.wholePageAudit, false);
  assert.equal(row.index, null);
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
 elif case=='whole-pages':m['pageAudit']['questionPaper']['wholeDocumentReviewed']=True
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
 for p in ['research/ledger/v1','research/extractions/4CH1-2024-June-1-standard','research/batches','research/reviews']:
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
 assert len(owned)==10 and sum(int(x['original_marks']) for x in owned)==16
 files=[Path(module.OVERLAY),*Path(module.OVERLAY).with_suffix('').glob('*.json')]
 for p in files:
  encoded=json.dumps(dict(repository_full_name='peterpeterpeter111/igcses',base_tree_sha='0'*40,tree_elements=[dict(path=str(p),mode='100644',type='blob',content=p.read_text())]),ensure_ascii=False,separators=(',',':')).encode()
  assert len(encoded)<195000
 print(json.dumps({'parts':len(owned),'marks':16,'foreignFilesPreserved':True}))
`], { encoding: 'utf8' }));
  assert.deepEqual(result, { parts: 10, marks: 16, foreignFilesPreserved: true });
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
