import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

void test('English pilot normalization is repeatable and preserves partial evidence and unrelated rows', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile,shutil,runpy
from pathlib import Path
source=Path.cwd();api=runpy.run_path(str(source/'scripts/export-english-pilot.py'))
def rows(root,name):
 with (root/'research/ledger/v1'/ (name+'.csv')).open(newline='') as f:return list(csv.DictReader(f))
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['research/pilot','research/ledger/v1']:shutil.copytree(source/folder,root/folder)
 before={p.relative_to(root):p.read_bytes() for p in (root/'research').rglob('*') if p.is_file()}
 unrelated={name:[r for r in rows(root,name) if not (r.get('paper_id','').startswith(api['PAPER']) or r.get('document_id','').startswith('pilot-'+api['PAPER']))] for name in ['documents','papers','tasks']}
 summary=api['export'](root)
 first={name:(root/'research/ledger/v1'/ (name+'.csv')).read_bytes() for name in unrelated}
 assert api['export'](root)==summary
 assert all((root/'research/ledger/v1'/ (name+'.csv')).read_bytes()==data for name,data in first.items())
 for name,old in unrelated.items():
  new=[r for r in rows(root,name) if not (r.get('paper_id','').startswith(api['PAPER']) or r.get('document_id','').startswith('pilot-'+api['PAPER']))]
  assert old==new,name
 allowed={Path('research/ledger/v1')/(name+'.csv') for name in unrelated}
 assert all((root/path).read_bytes()==data for path,data in before.items() if path not in allowed)
 tasks=[r for r in rows(root,'tasks') if r['paper_id']==api['PAPER']]
 assert len(tasks)==11
 assert sum(r['extraction_status']=='indexed' for r in tasks)==10
 q5=next(r for r in tasks if r['question_path']=='5')
 assert q5['extraction_status']=='source-checked' and q5['human_reviewed']=='false'
 assert json.loads(q5['acceptable_alternatives_json'])==[]
 assert json.loads(q5['assessment_objectives_json'])=={'AO1':2}
 assert q5['mapping_status']=='editorial-AO-skill-only'
 assert all(not json.loads(r['solution_structure_json']) and not r['context_summary'] for r in tasks if r is not q5)
 paper=next(r for r in rows(root,'papers') if r['paper_id']==api['PAPER'])
 assert paper['stage']=='indexed' and paper['complete_page_audit']=='false' and paper['template_links_complete']=='false'
 assert int(paper['assessed_marks'])==100 and int(paper['all_alternatives_marks'])==160
 print(json.dumps(summary))
`], { encoding: 'utf8' }));
  assert.equal(result.indexedTasks, 11);
  assert.equal(result.detailedTasks, 1);
  assert.equal(result.fullyProcessedPapers, 0);
  assert.equal(result.activeTemplates, 0);
});

void test('English normalization rejects changed stages, identities, marks and pages before any write', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,runpy
from pathlib import Path
source=Path.cwd();api=runpy.run_path(str(source/'scripts/export-english-pilot.py'));cases=[]
for mode in ['stage','completion','duplicate-task','ao-marks','option-marks','qp-page','scheme-page','new-extraction','duplicate-document']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for folder in ['research/pilot','research/ledger/v1']:shutil.copytree(source/folder,root/folder)
  path=root/api['PILOT'];m=json.loads(path.read_text())
  if mode=='stage':m['stage']='extracted'
  elif mode=='completion':m['completePageAudit']=True
  elif mode=='duplicate-task':m['tasks'][1]['id']=m['tasks'][0]['id']
  elif mode=='ao-marks':m['tasks'][4]['aoMarks']['AO1']=3
  elif mode=='option-marks':m['optionRules'][2]['choose']=2
  elif mode=='qp-page':m['tasks'][0]['qpPages']=[37]
  elif mode=='scheme-page':m['tasks'][0]['msPages']=[]
  elif mode=='new-extraction':m['tasks'][1]['detailedExtraction']=m['tasks'][4]['detailedExtraction']
  elif mode=='duplicate-document':m['documents'].append(m['documents'][0])
  path.write_text(json.dumps(m))
  before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
  try:api['export'](root)
  except ValueError:cases.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(p.read_bytes()==data for p,data in before.items()),mode
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(result.length, 9);
});
