import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

void test('English retrieval follow-up composes source-bound one-mark groups without downgrading the immutable pilot', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,runpy,sys,hashlib
from pathlib import Path
source=Path.cwd();sys.path.insert(0,str(source/'scripts'));api=runpy.run_path(str(source/'scripts/export-english-pilot.py'))
from ledger_io import read_table
from english_followup import FOLLOWUP,PUBLIC_SUMMARY,load_followup,public_summary
def rows(root,name):return read_table(root/'research/ledger/v1',name)[1]
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['research/pilot','research/pilot-followups','research/pilot-summaries','research/ledger/v1']:shutil.copytree(source/folder,root/folder)
 before={p.relative_to(root):p.read_bytes() for p in (root/'research').rglob('*') if p.is_file()}
 old=[r for r in rows(root,'tasks') if r['paper_id']!=api['PAPER']]
 summary=api['export'](root)
 first={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
 assert api['export'](root)==summary and all(p.read_bytes()==data for p,data in first.items())
 assert old==[r for r in rows(root,'tasks') if r['paper_id']!=api['PAPER']]
 allowed={Path('research/ledger/v1/documents.csv'),Path('research/ledger/v1/papers.csv'),Path('research/ledger/v1/tasks/4EB1.csv'),PUBLIC_SUMMARY}
 assert all((root/p).read_bytes()==data for p,data in before.items() if p not in allowed)
 pilot=json.loads((root/api['PILOT']).read_text());model=load_followup(root,pilot)
 assert model['pilotSha256']=='1f916c911020f61f9391f74c237ab1c1b2e07857ed14f66b6799ee47c5c3471d'
 assert json.loads((root/PUBLIC_SUMMARY).read_text())==public_summary(model)
 tasks=[r for r in rows(root,'tasks') if r['paper_id']==api['PAPER']]
 assert sum(r['extraction_status']=='source-checked' for r in tasks)==4
 assert sum(r['extraction_status']=='indexed' for r in tasks)==7
 detailed=[r for r in tasks if r['extraction_status']=='source-checked'];assert sum(int(r['original_marks']) for r in detailed)==5
 q5=next(r for r in tasks if r['question_path']=='5');assert json.loads(q5['acceptable_alternatives_json'])==[]
 for n,groups in [('1',6),('2',7),('4',9)]:
  row=next(r for r in tasks if r['question_path']==n)
  assert int(row['original_marks'])==1 and row['mapping_status']=='official-AO-only'
  assert json.loads(row['assessment_objectives_json'])=={'AO1':1}
  assert len(json.loads(row['acceptable_alternatives_json']))==groups
  assert row['rubric_ref'].startswith(str(FOLLOWUP)) and row['human_reviewed']=='false'
 paper=next(r for r in rows(root,'papers') if r['paper_id']==api['PAPER'])
 docs=[r for r in rows(root,'documents') if r['document_id'].startswith('pilot-'+api['PAPER'])]
 assert all(json.loads(r['reviewed_pages_json']) and r['identity_status']=='agent-reviewed' for r in docs)
 assert sum('visual' in p['mode'] for p in json.loads(next(r for r in docs if r['document_type']=='question-paper')['reviewed_pages_json']))<36
 assert paper['stage']=='indexed' and paper['complete_page_audit']=='false' and paper['template_links_complete']=='false'
 assert paper['extracted_leaf_tasks']=='4' and paper['assessed_marks']=='100' and paper['all_alternatives_marks']=='160'
 print(json.dumps(summary))
`], { encoding: 'utf8' }));
  assert.equal(result.detailedTasks, 4);
  assert.equal(result.fullyProcessedPapers, 0);
  assert.equal(result.activeTemplates, 0);
});

void test('English follow-up rejects source, answer-pool, scope and activation corruption before any write', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,runpy,sys
from pathlib import Path
source=Path.cwd();sys.path.insert(0,str(source/'scripts'));api=runpy.run_path(str(source/'scripts/export-english-pilot.py'))
from english_followup import FOLLOWUP
cases=[]
for mode in ['pilot-hash','source-hash','extra-task','marks','boolean-credit','ao','page','source-lines','cap','pool-count','duplicate-group','blank-alternative','official-point','activation','human','combined-count']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for folder in ['research/pilot','research/pilot-followups','research/pilot-summaries','research/ledger/v1']:shutil.copytree(source/folder,root/folder)
  p=root/FOLLOWUP;m=json.loads(p.read_text());t=m['tasks'][0]
  if mode=='pilot-hash':m['pilotSha256']='0'*64
  elif mode=='source-hash':m['documentHashes'][next(iter(m['documentHashes']))]='0'*64
  elif mode=='extra-task':m['tasks'].append(m['tasks'][0])
  elif mode=='marks':t['marks']=2
  elif mode=='boolean-credit':t['acceptableGroups'][0]['credit']=True
  elif mode=='ao':t['aoMarks']={'AO2':1}
  elif mode=='page':t['msPages']=[6]
  elif mode=='source-lines':t['sourceLines']='Text1:1–5'
  elif mode=='cap':t['maximumCredit']=6
  elif mode=='pool-count':t['acceptableGroups'].pop()
  elif mode=='duplicate-group':t['acceptableGroups'][1]['id']=t['acceptableGroups'][0]['id']
  elif mode=='blank-alternative':t['acceptableGroups'][0]['alternatives']=['']
  elif mode=='official-point':t['mapping']['referenceKind']='official-numbered-point'
  elif mode=='activation':m['liveMarkerImplemented']=True
  elif mode=='human':t['humanReviewed']=True
  elif mode=='combined-count':m['combinedDetailedTasks']=11
  p.write_text(json.dumps(m));before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
  try:api['export'](root)
  except ValueError:cases.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(p.read_bytes()==data for p,data in before.items()),mode
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(result.length, 16);
});
