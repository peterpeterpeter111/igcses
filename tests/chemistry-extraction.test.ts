import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import meta from '../research/extractions/4CH1-2024-June-1-standard.json' with { type: 'json' };
import q1 from '../research/extractions/4CH1-2024-June-1-standard/Q1.json' with { type: 'json' };
import raw from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import { subjectEvidence } from '../lib/coverage.ts';

void test('Chemistry exposes two detailed Q1 leaves while keeping the unknown whole denominator and raw history honest', () => {
  const row = subjectEvidence('4CH1').find((x) => x.paperId === meta.paperId);
  assert.ok(row?.extraction);
  assert.equal(row.extraction.detailedTasks, 2);
  assert.equal(row.extraction.originalMarks, 7);
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
 m=copy.deepcopy(original);a,b=m['tasks']
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
 assert len(owned)==2 and sum(int(x['original_marks']) for x in owned)==7
 files=[Path(module.OVERLAY),Path(module.OVERLAY).with_suffix('')/'Q1.json']
 for p in files:
  encoded=json.dumps(dict(repository_full_name='peterpeterpeter111/igcses',base_tree_sha='0'*40,tree_elements=[dict(path=str(p),mode='100644',type='blob',content=p.read_text())]),ensure_ascii=False,separators=(',',':')).encode()
  assert len(encoded)<195000
 print(json.dumps({'parts':len(owned),'marks':7,'foreignFilesPreserved':True}))
`], { encoding: 'utf8' }));
  assert.deepEqual(result, { parts: 2, marks: 7, foreignFilesPreserved: true });
});
