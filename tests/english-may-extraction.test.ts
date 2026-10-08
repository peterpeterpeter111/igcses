import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { subjectEvidence } from '../lib/coverage.ts';

void test('May English preserves its own source ranges, optional paths and unrelated ledger/history', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,sys,runpy,hashlib
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-may.py'))
from ledger_io import read_table
from english_paper_io import load_paper,public_summary,PAPER,SUMMARY
def rows(root,name):return read_table(root/'research/ledger/v1',name)[1]
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for name in ['english-extractions','batches','ledger/v1','pilot-summaries']:shutil.copytree(src/'research'/name,root/'research'/name)
 before={p:p.read_bytes() for p in (root/'research/batches').rglob('*') if p.is_file()}
 foreign={name:[r for r in rows(root,name) if not r.get('paper_id','').startswith(PAPER) and not r.get('document_id','').startswith(PAPER)] for name in ['documents','papers','tasks']}
 r=api['export'](root);first={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
 assert api['export'](root)==r and all(p.read_bytes()==b for p,b in first.items())
 assert all(p.read_bytes()==b for p,b in before.items())
 for name,old in foreign.items():assert [x for x in rows(root,name) if not x.get('paper_id','').startswith(PAPER) and not x.get('document_id','').startswith(PAPER)]==old,name
 m=load_paper(root);assert json.loads((root/SUMMARY).read_text())==public_summary(m)
 tasks=[x for x in rows(root,'tasks') if x['paper_id']==PAPER];assert len(tasks)==11 and sum(int(x['original_marks']) for x in tasks)==160
 base=sum(int(x['original_marks']) for x in tasks if x['option_group']!='C');assert base==70
 assert all(base+int(x['original_marks'])==100 for x in tasks if x['option_group']=='C')
 q5=next(x for x in tasks if x['question_path']=='5');assert json.loads(q5['stimulus_refs_json'])[0]['pdfPages']==[34]
 assert len(json.loads(q5['acceptable_alternatives_json']))==10 and int(q5['original_marks'])==2
 p=next(x for x in rows(root,'papers') if x['paper_id']==PAPER);assert p['series']=='June' and p['complete_page_audit']=='false' and p['template_links_complete']=='false' and p['stage']!='processed'
 assert all(x['human_reviewed']=='false' and x['extraction_status']=='source-checked' for x in tasks)
 print(json.dumps(r))
`], { encoding: 'utf8' }));
  assert.equal(result.detailedTasks, 11);
  assert.equal(result.assessedMarks, 100);
  assert.equal(result.printedMarks, 160);
  const row = subjectEvidence('4EB1').find((r) => r.paperId === result.paper)!;
  assert.ok(row.extraction);
  assert.equal(row.extraction.printedChoices, true);
  assert.equal(row.extraction.candidateAnsweredTasks, 9);
  assert.equal(row.index, null);
  assert.equal(row.extraction.wholePageAudit, false);
  const publicText = JSON.stringify(row.extraction);
  assert.doesNotMatch(publicText, /:grid:|:group-\d|rubric|acceptableGroups|solutionStructure/);
});

void test('May English rejects source, eligibility, task-demand and readiness corruption before any writes', () => {
  const cases = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,sys,runpy
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'));api=runpy.run_path(str(src/'scripts/export-english-may.py'))
from english_paper_io import EVIDENCE,SUMMARY
passed=[]
for mode in ['source-hash','source-url','source-id','source-pages','review-pages','task-pages','task-stimulus','task-lines','ao-boolean','grid-gap','grid-page','grid-duplicate','eligibility-pool','eligibility-credit','single-text-cap','writing-split','writing-form','choice','word-penalty','general-policy','printed-total','report-invented','historical','processed','active','human']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d)
  for name in ['english-extractions','batches','ledger/v1','pilot-summaries']:shutil.copytree(src/'research'/name,root/'research'/name)
  p=root/EVIDENCE;m=json.loads(p.read_text());q={t['number']:t for t in m['tasks']}
  if mode=='source-hash':m['documents'][0]['sha256']='0'*64
  elif mode=='source-url':m['documents'][0]['url']='https://example.com/wrong.pdf'
  elif mode=='source-id':m['documents'][0]['id']+='-wrong'
  elif mode=='source-pages':m['documents'][1]['pageCount']=20
  elif mode=='review-pages':m['documents'][0]['visualPages'].remove(34)
  elif mode=='task-pages':q[3]['msPages']=[7]
  elif mode=='task-stimulus':q[5]['stimulusPages']=[33]
  elif mode=='task-lines':q[5]['sourceLines']='Text Two: lines 9–15'
  elif mode=='ao-boolean':q[1]['aoMarks']['AO1']=True
  elif mode=='grid-gap':m['grids'][0]['levels'][2]['minMarks']=4
  elif mode=='grid-page':m['grids'][0]['sourcePdfPages']=[7,11]
  elif mode=='grid-duplicate':m['grids'][1]=m['grids'][0]
  elif mode=='eligibility-pool':q[5]['acceptableGroups'].pop()
  elif mode=='eligibility-credit':q[5]['acceptableGroups'][0]['credit']=5
  elif mode=='single-text-cap':q[7]['sourceCreditRules'][0]['maximum']=9
  elif mode=='writing-split':q[8]['sourceCreditRules'][0]['allocations']['AO1']=12
  elif mode=='writing-form':q[8]['writingContext']['form']='article'
  elif mode=='choice':m['optionRules'][2]['choose']=3
  elif mode=='word-penalty':q[10]['sourceCreditRules'][1]['automaticWordPenalty']=True
  elif mode=='general-policy':m['generalSchemeRules'][0]['rule']='negative-penalties'
  elif mode=='printed-total':m['allAlternativesMarks']=100
  elif mode=='report-invented':m['reportStatus']='fully-reviewed'
  elif mode=='historical':m['historicalApplicability']='verified'
  elif mode=='processed':m['fullyProcessedPaper']=True
  elif mode=='active':m['activeTemplates']=1
  elif mode=='human':m['humanReviewed']=True
  p.write_text(json.dumps(m));before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()};public=(root/SUMMARY).read_bytes()
  try:api['export'](root)
  except ValueError:passed.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(p.read_bytes()==b for p,b in before.items()) and (root/SUMMARY).read_bytes()==public
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(cases.length, 26);
});
