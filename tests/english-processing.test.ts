import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { coverageSummary, subjectEvidence } from '../lib/coverage.ts';

void test('two English source papers are processed while exam templates and chapters stay incomplete', () => {
  const row = subjectEvidence('4EB1').find((r) => r.paperId === '4EB1-2024-May-01-standard')!;
  assert.equal(row.fullyProcessed, true);
  assert.equal(row.extraction?.wholePageAudit, true);
  assert.equal(row.extraction?.candidateAnsweredTasks, 9);
  assert.equal(row.extraction?.assessedMarks, 100);
  assert.equal(row.extraction?.originalMarks, 160);
  assert.equal(row.extraction?.questionPaperPages, 36);
  assert.equal(row.extraction?.markSchemePages, 21);
  assert.equal(coverageSummary().reduce((sum, r) => sum + r.fullyProcessed, 0), 2);
  assert.ok(coverageSummary().every((r) => r.completeChapters === 0));
});

void test('processing promotion rejects missing pages, stale contracts and invented readiness before writing', () => {
  const modes = JSON.parse(execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile,runpy
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-may.py'))
from english_processing import REF
passed=[]
for mode in ['page-missing','page-duplicate','wrong-page-mode','no-page-proof','wrong-source-hash','source-changed','wrong-spec','wrong-choice-marks','missing-task','wrong-ao','stale-family','family-changed','unreviewed-report-page','report-calibrated','report-whole-visual','general-penalty','human','active','live-marker','missing-link']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for name in ['english-extractions','batches','ledger/v1','pilot-summaries','processing','templates','assessment-objectives']:
   shutil.copytree(src/'research'/name,root/'research'/name)
  p=root/REF;r=json.loads(p.read_text())
  if mode=='page-missing':r['documents'][0]['pages'].pop()
  elif mode=='page-duplicate':r['documents'][1]['pages'][0]['page']=2
  elif mode=='wrong-page-mode':r['documents'][0]['pages'][0]['mode']='text'
  elif mode=='no-page-proof':r['documents'][0]['pages'][0]['evidenceRef']=''
  elif mode=='wrong-source-hash':r['documents'][0]['sha256']='0'*64
  elif mode=='source-changed':
   q=root/'research/english-extractions/4EB1-2024-May-01-standard.json';q.write_text(q.read_text()+' ')
  elif mode=='wrong-spec':r['specificationReview']['pdfPages']=[10]
  elif mode=='wrong-choice-marks':r['candidateMarks']=160
  elif mode=='missing-task':r['taskReviews'].pop()
  elif mode=='wrong-ao':r['taskReviews'][7]['officialAoMarks']['AO4']=20
  elif mode=='stale-family':r['taskReviews'][0]['template']['sha256']='0'*64
  elif mode=='family-changed':
   q=root/r['taskReviews'][7]['template']['path'];q.write_text(q.read_text()+' ')
  elif mode=='unreviewed-report-page':r['taskReviews'][0]['reportObservation']['pdfPages']=[66]
  elif mode=='report-calibrated':r['examinerReport']['calibrationStatus']='passed'
  elif mode=='report-whole-visual':r['examinerReport']['wholeVisualAudit']=True
  elif mode=='general-penalty':r['generalReportObservations'][0]['automaticPenalty']=True
  elif mode=='human':r['humanReviewed']=True
  elif mode=='active':r['activeTemplates']=1
  elif mode=='live-marker':r['liveMarkerImplemented']=True
  elif mode=='missing-link':
   from ledger_io import read_table,table_outputs
   fields,rows=read_table(root/'research/ledger/v1','template-links');rows=[x for x in rows if x['task_id']!=r['taskReviews'][0]['taskId']]
   for q,content in table_outputs(root/'research/ledger/v1','template-links',fields,rows,'4EB1').items():q.write_text(content)
  p.write_text(json.dumps(r));before={q:q.read_bytes() for q in (root/'research/ledger/v1').rglob('*') if q.is_file()}
  summary=root/'research/pilot-summaries/4EB1-2024-May-01-standard.json';public=summary.read_bytes()
  try:api['export'](root)
  except ValueError:passed.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(q.read_bytes()==b for q,b in before.items()) and summary.read_bytes()==public
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(modes.length, 20);
});
