import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

void test('English real-paper follow-up preserves every grid, option and source while normalization is repeatable', () => {
  const r = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,runpy,sys,hashlib
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-pilot.py'))
from ledger_io import read_table
from english_followup import load_followup,PUBLIC_SUMMARY
from english_levels import load_levels,LEVELS,levels_public_summary
def rows(root,name):return read_table(root/'research/ledger/v1',name)[1]
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for f in ['research/pilot','research/pilot-followups','research/pilot-levels','research/pilot-summaries','research/ledger/v1']:shutil.copytree(src/f,root/f)
 before={p.relative_to(root):p.read_bytes() for p in (root/'research').rglob('*') if p.is_file()}
 others={n:[r for r in rows(root,n) if not (r.get('paper_id','').startswith(api['PAPER']) or r.get('document_id','').startswith('pilot-'+api['PAPER']))] for n in ['documents','papers','tasks']}
 summary=api['export'](root);first={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
 assert api['export'](root)==summary and all(p.read_bytes()==data for p,data in first.items())
 for n,old in others.items():assert old==[r for r in rows(root,n) if not (r.get('paper_id','').startswith(api['PAPER']) or r.get('document_id','').startswith('pilot-'+api['PAPER']))],n
 allowed={Path('research/ledger/v1/documents.csv'),Path('research/ledger/v1/papers.csv'),Path('research/ledger/v1/tasks/4EB1.csv'),PUBLIC_SUMMARY}
 assert all((root/p).read_bytes()==data for p,data in before.items() if p not in allowed)
 pilot=json.loads((root/api['PILOT']).read_text());m=load_levels(root,pilot,load_followup(root,pilot))
 assert m['pilotSha256']=='1f916c911020f61f9391f74c237ab1c1b2e07857ed14f66b6799ee47c5c3471d'
 assert json.loads((root/PUBLIC_SUMMARY).read_text())==levels_public_summary(m)
 tasks=[r for r in rows(root,'tasks') if r['paper_id']==api['PAPER']]
 assert len(tasks)==11 and all(r['extraction_status']=='source-checked' and r['human_reviewed']=='false' for r in tasks)
 assert sum(int(r['original_marks']) for r in tasks)==160
 base=sum(int(r['original_marks']) for r in tasks if r['option_group']!='C')
 assert base==70 and all(base+int(r['original_marks'])==100 for r in tasks if r['option_group']=='C')
 q5=next(r for r in tasks if r['question_path']=='5');assert len(json.loads(q5['acceptable_alternatives_json']))==8
 q7=next(r for r in tasks if r['question_path']=='7');assert json.loads(q7['dependencies_json'])[0]['maximum']==6
 q8=next(r for r in tasks if r['question_path']=='8');assert json.loads(q8['assessment_objectives_json'])=={'AO1':10,'AO4':12,'AO5':8}
 paper=next(r for r in rows(root,'papers') if r['paper_id']==api['PAPER'])
 assert paper['extracted_leaf_tasks']=='11' and paper['assessed_marks']=='100' and paper['all_alternatives_marks']=='160'
 docs=[r for r in rows(root,'documents') if r['document_id'].startswith('pilot-'+api['PAPER'])]
 assert all(json.loads(r['reviewed_pages_json']) and r['identity_status']=='agent-reviewed' for r in docs)
 assert sum('visual' in p['mode'] for p in json.loads(next(r for r in docs if r['document_type']=='question-paper')['reviewed_pages_json']))<36
 assert paper['stage']=='indexed' and paper['complete_page_audit']=='false' and paper['template_links_complete']=='false'
 print(json.dumps(summary))
`], { encoding: 'utf8' }));
  assert.equal(r.detailedTasks, 11);
  assert.equal(r.fullyProcessedPapers, 0);
});

void test('English levels rejects changed official ranges, allocations, caps, source scope and activation before writing', () => {
  const r = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,runpy,sys
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-pilot.py'))
from english_levels import LEVELS
cases=[]
for mode in ['source','grid-gap','grid-overlap','wrong-grid-page','duplicate-grid','boolean-range','wrong-task-ao','missing-grid','duplicate-task','wrong-task-page','q5-pool','q7-cap','q8-split','writing-choice','word-penalty','printed-marks','processed','activation']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for f in ['research/pilot','research/pilot-followups','research/pilot-levels','research/pilot-summaries','research/ledger/v1']:shutil.copytree(src/f,root/f)
  p=root/LEVELS;m=json.loads(p.read_text());q={t['number']:t for t in m['tasks']};g=m['grids'][0]
  if mode=='source':m['pilotSha256']='0'*64
  elif mode=='grid-gap':g['levels'][2]['minMarks']=4
  elif mode=='grid-overlap':g['levels'][2]['minMarks']=2
  elif mode=='wrong-grid-page':g['sourcePdfPages']=[6]
  elif mode=='duplicate-grid':m['grids'][1]=g
  elif mode=='boolean-range':g['levels'][1]['minMarks']=True
  elif mode=='wrong-task-ao':q[3]['aoMarks']={'AO1':10}
  elif mode=='missing-grid':q[8]['gridIds'].pop()
  elif mode=='duplicate-task':m['tasks'][1]=m['tasks'][0]
  elif mode=='wrong-task-page':q[6]['qpPages']=[8]
  elif mode=='q5-pool':q[5]['acceptableGroups'].pop()
  elif mode=='q7-cap':q[7]['sourceCreditRules'][0]['maximum']=7
  elif mode=='q8-split':q[8]['sourceCreditRules'][0]['allocations']['AO4']=10
  elif mode=='writing-choice':q[9]['sourceCreditRules'][0]['choose']=3
  elif mode=='word-penalty':q[10]['sourceCreditRules'][1]['automaticWordPenalty']=True
  elif mode=='printed-marks':m['combinedPrintedMarks']=100
  elif mode=='processed':m['fullyProcessedPaper']=True
  elif mode=='activation':m['liveMarkerImplemented']=True
  p.write_text(json.dumps(m));before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
  try:api['export'](root)
  except ValueError:cases.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(p.read_bytes()==data for p,data in before.items()),mode
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(r.length, 18);
});
