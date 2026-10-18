import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { subjectEvidence, coverageSummary } from '../lib/coverage.ts';

void test('Chemistry exposes selected report evidence and current demand without promoting paper or templates', () => {
  const row = subjectEvidence('4CH1')[0];
  assert.ok(row?.examinerReport && row.currentApplicability);
  assert.equal(row.examinerReport.taskObservations, 46);
  assert.equal(row.examinerReport.tasksWithoutDirectObservation, 10);
  assert.equal(row.examinerReport.pageCount, 83);
  assert.equal(row.examinerReport.ocrTextReviewedPages, 48);
  assert.equal(row.examinerReport.wholeVisualAudit, false);
  assert.equal(row.currentApplicability.reviewedTasks, 56);
  assert.equal(row.currentApplicability.numberedPartialDemands, 53);
  assert.equal(row.currentApplicability.skillOnlyDemands, 1);
  assert.equal(row.currentApplicability.contextualExceptions, 2);
  assert.equal(row.fullyProcessed, false);
  assert.equal(coverageSummary().find((s) => s.subject.code === '4CH1')?.fullyProcessed, 0);
  const publicData = JSON.stringify([row.examinerReport, row.currentApplicability]);
  for (const hidden of ['sourceScoring', 'Mg(NO3)2', 'observations":', 'criteria', 'work/', 'automaticPenalty']) {
    assert.ok(!publicData.includes(hidden));
  }
});

void test('Report normalization matches saved rows without modifying source evidence', () => {
  const result = execFileSync('python3', ['-c', `
import sys,importlib.util
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('chem','scripts/export-chemistry-q1.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
outputs=m.prepare()
assert all(p.read_text()==v for p,v in outputs.items())
print('consistent')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'consistent');
});

void test('Source reviews reject invented penalties, unread pages, stale evidence and broadened exceptions before writes', () => {
  const result = execFileSync('python3', ['-c', `
import sys,json,tempfile,shutil
from pathlib import Path
sys.path.insert(0,'scripts')
from chemistry_report import load_report,REF as REPORT
from chemistry_applicability import load_applicability,REF as SCOPE
from extraction_io import read_extraction
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in ['research/extractions','research/ledger/v1','research/examiner-reports','research/reviews']:
  shutil.copytree(p,root/p)
 source=read_extraction(root/'research/extractions/4CH1-2024-June-1-standard.json')
 before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*.csv')}
 for case in ['penalty','scheme-override','unreviewed-page','duplicate-task','stale-partition','whole-report','fake-AO','nitric-broadening','invented-effects-point']:
  path=root/(REPORT if case in ['penalty','scheme-override','unreviewed-page','duplicate-task','whole-report'] else SCOPE)
  saved=path.read_bytes();r=json.loads(saved)
  if case=='penalty':r['observations'][0]['automaticPenalty']=True
  elif case=='scheme-override':r['observations'][0]['markSchemeOverride']=True
  elif case=='unreviewed-page':r['observations'][0]['pdfPages']=[82]
  elif case=='duplicate-task':r['observations'][1]['taskId']=r['observations'][0]['taskId']
  elif case=='stale-partition':r['sourcePartitions'][0]['sha256']='0'*64
  elif case=='whole-report':r['method']['wholeVisualAudit']=True
  elif case=='fake-AO':r['tasks'][0]['officialPerLeafAO']={'AO1':5}
  elif case=='nitric-broadening':next(t for t in r['tasks'] if t['questionPath']=='10.a')['verifiedCurrentPointMappings'][0]['role']='ordinary-current-content'
  elif case=='invented-effects-point':
   t=next(t for t in r['tasks'] if t['questionPath']=='7.c.ii')
   t['verifiedCurrentPointMappings']=[r['tasks'][0]['verifiedCurrentPointMappings'][0]]
  path.write_text(json.dumps(r))
  try:(load_report if path.name==Path(REPORT).name else load_applicability)(root,source)
  except ValueError:pass
  else:raise AssertionError(case+' accepted')
  path.write_bytes(saved)
  assert all(p.read_bytes()==v for p,v in before.items())
print('9 invalid reviews rejected; ledger unchanged')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), '9 invalid reviews rejected; ledger unchanged');
});
