import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { coverageSummary, evidenceHighlights } from '../lib/coverage.ts';
import summary from '../research/pilot-summaries/4EB1-2024-November-01.json' with { type: 'json' };

void test('November source completion preserves optional paths, version history and inactive exam readiness', () => {
  assert.equal(summary.fullyProcessedPapers, 1);
  assert.equal(summary.wholePageAudit, true);
  assert.equal(summary.questionPaperPagesReviewed, 36);
  assert.equal(summary.markSchemePagesReviewed, 20);
  assert.equal(summary.detailedTasks, 11);
  assert.equal(summary.candidateAnsweredTasks, 9);
  assert.equal(summary.assessedMarks, 100);
  assert.equal(summary.allAlternativesMarks, 160);
  assert.equal(coverageSummary().find((r) => r.subject.code === '4EB1')?.fullyProcessed, 2);
  assert.equal(evidenceHighlights.provisionalFamilies, 17);
  assert.equal(evidenceHighlights.experimentalGenerators, 7);
  assert.equal(evidenceHighlights.activeFamilies, 0);
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile,runpy,hashlib
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-pilot.py'))
from ledger_io import read_table
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for name in ['pilot','pilot-followups','pilot-levels','pilot-summaries','processing','templates','ledger/v1','assessment-objectives']:
  shutil.copytree(src/'research'/name,root/'research'/name)
 sourcebytes={p:p.read_bytes() for folder in ['pilot','pilot-followups','pilot-levels','templates'] for p in (root/'research'/folder).glob('*.json')}
 unrelated={n:[r for r in read_table(root/'research/ledger/v1',n)[1] if not (r.get('paper_id','')==api['PAPER'] or r.get('document_id','').startswith('pilot-'+api['PAPER']))] for n in ['documents','papers','tasks']}
 first=api['export'](root);saved={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
 assert api['export'](root)==first and all(p.read_bytes()==b for p,b in saved.items())
 assert all(p.read_bytes()==b for p,b in sourcebytes.items())
 for n,old in unrelated.items():
  assert old==[r for r in read_table(root/'research/ledger/v1',n)[1] if not (r.get('paper_id','')==api['PAPER'] or r.get('document_id','').startswith('pilot-'+api['PAPER']))]
 print(json.dumps(first))
`], { encoding: 'utf8' }));
  assert.equal(result.fullyProcessedPapers, 1);
});

void test('November processing rejects stale overlays, incomplete page/report proof and readiness claims without writes', () => {
  const modes = JSON.parse(execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile,runpy,hashlib
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-pilot.py'))
from ledger_io import read_table,table_outputs
passed=[]
for mode in ['source-changed','wrong-source-path','missing-overlay','missing-page','duplicate-page','text-only-page','wrong-ms','wrong-spec','candidate-option-total','wrong-ao','missing-task','stale-family','changed-family-grid','unsupported-runtime','report-penalty','unreviewed-report-page','wrong-report','active','human','missing-link']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for name in ['pilot','pilot-followups','pilot-levels','pilot-summaries','processing','templates','ledger/v1','assessment-objectives']:
   shutil.copytree(src/'research'/name,root/'research'/name)
  p=root/'research/processing'/ (api['PAPER']+'.json');r=json.loads(p.read_text())
  if mode=='source-changed':
   q=root/'research/pilot-levels'/ (api['PAPER']+'.json');q.write_text(q.read_text()+' ')
  elif mode=='wrong-source-path':r['sourceEvidence'][0]['path']='research/other.json'
  elif mode=='missing-overlay':(root/'research/pilot-levels'/ (api['PAPER']+'.json')).unlink()
  elif mode=='missing-page':r['documents'][0]['pages'].pop()
  elif mode=='duplicate-page':r['documents'][1]['pages'][1]['page']=1
  elif mode=='text-only-page':r['documents'][1]['pages'][1]['mode']='text'
  elif mode=='wrong-ms':r['documents'][1]['sha256']='0'*64
  elif mode=='wrong-spec':r['specificationReview']['issue']='1'
  elif mode=='candidate-option-total':r['candidateMarks']=160
  elif mode=='wrong-ao':r['taskReviews'][7]['officialAoMarks']['AO4']=20
  elif mode=='missing-task':r['taskReviews'].pop()
  elif mode=='stale-family':r['taskReviews'][0]['template']['sha256']='0'*64
  elif mode in ['changed-family-grid','unsupported-runtime']:
   ref=r['taskReviews'][7]['template'];q=root/ref['path'];f=json.loads(q.read_text())
   if mode=='changed-family-grid':f['marking']['componentRubrics'][0]['levelRubric'][1]['descriptor']='generic writing'
   else:f['runtime']['implemented']=True;f['runtime']['generatorId']='invented'
   q.write_text(json.dumps(f));ref['sha256']=hashlib.sha256(q.read_bytes()).hexdigest()
  elif mode=='report-penalty':r['generalReportObservations'][0]['automaticPenalty']=True
  elif mode=='unreviewed-report-page':r['examinerReport']['textPagesReviewed']=[1,2]
  elif mode=='wrong-report':r['examinerReport']['publicationCode']='4EB1_01_2406_ER'
  elif mode=='active':r['activeTemplates']=1
  elif mode=='human':r['humanReviewed']=True
  elif mode=='missing-link':
   fields,rows=read_table(root/'research/ledger/v1','template-links');rows=[x for x in rows if x['task_id']!=r['taskReviews'][0]['taskId']]
   for q,c in table_outputs(root/'research/ledger/v1','template-links',fields,rows,'4EB1').items():q.write_text(c)
  p.write_text(json.dumps(r))
  before={q:q.read_bytes() for q in (root/'research/ledger/v1').rglob('*') if q.is_file()};summary=root/'research/pilot-summaries'/ (api['PAPER']+'.json');public=summary.read_bytes()
  try:api['export'](root)
  except (ValueError,FileNotFoundError):passed.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(q.read_bytes()==b for q,b in before.items()) and summary.read_bytes()==public
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(modes.length, 20);
});
