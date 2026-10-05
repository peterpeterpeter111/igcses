import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { subjectEvidence, evidenceHighlights } from '../lib/coverage.ts';

const setup = `
import csv,json,tempfile,shutil,runpy
from pathlib import Path
source=Path.cwd();api=runpy.run_path(str(source/'scripts/export-human-q1.py'))
def copy(root):
 for folder in ['research/extractions','research/paper-indexes','research/syllabus','research/syllabus-skills','research/ledger/v1','research/batches','research/reviews']:
  shutil.copytree(source/folder,root/folder)
 shutil.copy(source/'research/sources.json',root/'research/sources.json')
def rows(root,name):
 with (root/'research/ledger/v1'/ (name+'.csv')).open(newline='') as f:return list(csv.DictReader(f))
`;

void test('Human Q1–Q6 export separates complete inventory from partial detail and preserves, rubric caps and unrelated/historical evidence', () => {
  const result = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        setup +
          `
with tempfile.TemporaryDirectory() as d:
 root=Path(d);copy(root)
 before={p.relative_to(root):p.read_bytes() for p in (root/'research').rglob('*') if p.is_file()}
 unrelated={n:[r for r in rows(root,n) if not (r.get('paper_id')==api['PAPER'] or r.get('task_id','').startswith(api['PAPER']+'.Q') or r.get('document_id','').startswith(api['PAPER']+':'))] for n in ['documents','papers','tasks','task-mappings']}
 result=api['export'](root)
 first={n:(root/'research/ledger/v1'/ (n+'.csv')).read_bytes() for n in unrelated}
 assert api['export'](root)==result
 assert all((root/'research/ledger/v1'/ (n+'.csv')).read_bytes()==v for n,v in first.items())
 for n,old in unrelated.items():
  assert [r for r in rows(root,n) if not (r.get('paper_id')==api['PAPER'] or r.get('task_id','').startswith(api['PAPER']+'.Q') or r.get('document_id','').startswith(api['PAPER']+':'))]==old,n
 allowed={Path('research/ledger/v1')/(n+'.csv') for n in unrelated}
 assert all((root/p).read_bytes()==v for p,v in before.items() if p not in allowed)
 paper=next(r for r in rows(root,'papers') if r['paper_id']==api['PAPER'])
 assert paper['stage']=='indexed' and paper['expected_leaf_tasks']==paper['indexed_leaf_tasks']=='42'
 assert paper['reconciled_marks']==paper['complete_page_audit']=='true' and paper['template_links_complete']=='false'
 tasks=[r for r in rows(root,'tasks') if r['paper_id']==api['PAPER']]
 assert len(tasks)==42 and sum(int(t['original_marks']) for t in tasks)==90
 detailed=[t for t in tasks if t['extraction_status']=='source-checked'];indexed=[t for t in tasks if t['extraction_status']=='indexed-only']
 assert len(detailed)==29 and sum(int(t['original_marks']) for t in detailed)==64
 assert len(indexed)==13 and all(t['required_knowledge']==t['marking_method']==t['rubric_ref']=='' and json.loads(t['solution_structure_json'])==[] and t['mapping_status']=='not-started' for t in indexed)
 m=json.loads((root/api['OVERLAY']).read_text())
 assert sum(sum(c['marks'] for c in t['criteria']) for t in m['tasks'])==70
 assert sum(api['rubric_maximum'](t) for t in m['tasks'])==64
 any_two=next(t for t in m['tasks'] if t['questionPath']=='1.b.ii')
 assert len(any_two['criteria'])==3 and api['rubric_maximum'](any_two)==2
 dna=next(t for t in m['tasks'] if t['questionPath']=='3.c')
 assert len(dna['criteria'])==5 and api['rubric_maximum'](dna)==4
 assert dna['sourceDiscrepancy']['generatedUse']=='blocked-until-authoritative-clarification'
 assert m['pageAudit']['markScheme']['visuallyReviewedPages']==[3,4,5,6,7,8,9]
 assert all(json.loads(t['assessment_objectives_json'])==[] for t in tasks)
 assert next(t for t in tasks if t['question_path']=='1.b.ii')['marking_method']=='capped-discrete-points'
 print(json.dumps(result))
`,
      ],
      { encoding: 'utf8' },
    ),
  );
  assert.equal(result.indexedTasks, 42);
  assert.equal(result.indexedMarks, 90);
  assert.equal(result.detailedTasks, 29);
  assert.equal(result.detailedMarks, 64);
  assert.equal(result.fullyProcessedPapers, 0);
});

void test('Human Q1–Q6 rejects completion, inventory and source/rubric changes before any table write', () => {
  const result = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        setup +
          `
cases=[]
for mode in ['stage','human','whole-count','whole-marks','whole-pages','hash','task-page','task-duplicate','criteria-duplicate','cap','any-two-mode','eligibility','ao','activation','practical-mapping','shared-stimulus','stale-row','graph-cap','graph-exclusion','gap-order','skill-source','index-missing','index-mark','index-blank','index-pages','index-stimulus','index-promoted','index-solution','index-paperlog','dna-cap','dna-activation','dna-wording','carrier-concession','pedigree-parent','pedigree-choice','q3-mapping','apparatus-topology','drawing-promotion','exercise-data','pace-control','oxygen-cap','enzyme-cap','enzyme-amount','numeric-optimum','enzyme-calibration','cube-answer-cap','cube-ecf','cube-data','cube-dependent','cube-promoted','heat-policy','cube-skill']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d);copy(root);p=root/api['OVERLAY'];m=json.loads(p.read_text());t=m['tasks'][3]
  if mode=='stage':m['paperStage']='extracted'
  elif mode=='human':m['humanReviewed']=True
  elif mode=='whole-count':m['wholePaperLeafCount']=8
  elif mode=='whole-marks':m['marksReconciled']=True
  elif mode=='whole-pages':m['pageAudit']['markScheme']['wholeDocumentReviewed']=True
  elif mode=='hash':m['documents'][0]['sha256']='0'*64
  elif mode=='task-page':m['tasks'][0]['questionPaperPages']=[24]
  elif mode=='task-duplicate':m['tasks'][1]=m['tasks'][0]
  elif mode=='criteria-duplicate':t['criteria'][1]['id']=t['criteria'][0]['id']
  elif mode=='cap':t['scoringRule']['maximum']=3
  elif mode=='any-two-mode':t['scoringRule']['mode']='all-distinct'
  elif mode=='eligibility':t['scoringRule']['eligibleCriterionIds'].pop()
  elif mode=='ao':t['assessmentObjectives']=['AO1']
  elif mode=='activation':t['templateLinkStatus']='active'
  elif mode=='practical-mapping':m['tasks'][5]['syllabusMappings'][0]['kind']='primary'
  elif mode=='shared-stimulus':m['tasks'][4]['stimulusRefs'][0]['pdfPages']=[4]
  elif mode=='graph-cap':m['tasks'][8]['graphScoring']['sourceConcession']['maximum']=4
  elif mode=='graph-exclusion':m['tasks'][8]['graphScoring']['sourceConcession']['eligibleCriterionIds'].append(m['tasks'][8]['criteria'][3]['id'])
  elif mode=='gap-order':m['tasks'][10]['orderedGapRubric']['answers'].reverse()
  elif mode=='dna-cap':m['tasks'][16]['scoringRule']['maximum']=5
  elif mode=='dna-activation':m['tasks'][16]['sourceDiscrepancy']['generatedUse']='active'
  elif mode=='dna-wording':m['tasks'][16]['sourceDiscrepancy']['publishedAmbiguousAlternative']='silently corrected'
  elif mode=='carrier-concession':m['tasks'][14]['sourceQualification']['generatedUse']='active'
  elif mode=='pedigree-parent':m['tasks'][15]['sourcePedigreeModel']['parents'][0]['affected']=False
  elif mode=='pedigree-choice':m['tasks'][15]['sourcePedigreeModel']['answer']='W'
  elif mode=='q3-mapping':m['tasks'][11]['syllabusMappings'][0]['kind']='primary'
  elif mode=='apparatus-topology':m['tasks'][17]['apparatusTopology']['rightVessel']['mouthpieceTube']='short-above-indicator'
  elif mode=='drawing-promotion':m['tasks'][17]['apparatusTopology']['recognitionStatus']='implemented'
  elif mode=='exercise-data':m['tasks'][19]['sourceData']['meanBreathingRates'][2]=60
  elif mode=='pace-control':m['tasks'][19]['controlScope']['pace']='Same intensity for gentle and vigorous exercise'
  elif mode=='oxygen-cap':m['tasks'][20]['scoringRule']['maximum']=6
  elif mode=='enzyme-cap':m['tasks'][21]['scoringRule']['maximum']=6
  elif mode=='enzyme-amount':m['tasks'][21]['sourceRejectedEvidence']=[]
  elif mode=='numeric-optimum':m['tasks'][21]['sourceGraph']['optimumTemperatureValue']=37
  elif mode=='enzyme-calibration':m['tasks'][21]['methodScope']['endpointCalibration']='complete'
  elif mode=='cube-answer-cap':m['tasks'][24]['numericScoring']['correctFinalAnswerAloneMaximum']=1
  elif mode=='cube-ecf':m['tasks'][26]['numericScoring']['ecfScope']='invented'
  elif mode=='cube-data':m['tasks'][24]['sourceData']['cubeXSideCm']=4
  elif mode=='cube-dependent':m['tasks'][26]['dependencies']=[]
  elif mode=='cube-promoted':m['tasks'][24]['numericScoring']['recognitionStatus']='implemented'
  elif mode=='heat-policy':m['tasks'][27]['sourceDiscrepancy']['generatedUse']='active'
  elif mode=='cube-skill':m['tasks'][24]['skillMappings'][0]['evidenceRefs'][0]['pdfPages']=[42]
  elif mode=='skill-source':m['tasks'][8]['skillMappings'][0]['evidenceRefs'][0]['pdfPages']=[44]
  elif mode=='stale-row':
   path=root/'research/ledger/v1/tasks.csv';data=rows(root,'tasks');stale=dict(data[0]);stale['task_id']=api['PAPER']+'.Q9';stale['paper_id']=api['PAPER'];data.append(stale)
   with path.open('w',newline='') as f:
    writer=csv.DictWriter(f,list(stale),lineterminator='\\n');writer.writeheader();writer.writerows(data)
  if mode.startswith('index-'):
   ip=root/api['INDEX'];index=json.loads(ip.read_text())
   if mode=='index-missing':index['tasks'].pop()
   elif mode=='index-mark':index['tasks'][-1]['originalMarks']=2
   elif mode=='index-blank':index['blankQuestionPaperPages']=[24]
   elif mode=='index-pages':index['markSchemeVisualPages'].pop()
   elif mode=='index-stimulus':index['tasks'][15]['stimulusRefs'][0]['pdfPages']=[9]
   elif mode=='index-promoted':index['tasks'][-1]['extractionStatus']='source-checked'
   elif mode=='index-solution':index['tasks'][-1]['solutionStructure']=['invented']
   elif mode=='index-paperlog':index['paperMatch']['schemePaperLog']='OTHER'
   ip.write_text(json.dumps(index))
  p.write_text(json.dumps(m))
  before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
  try:api['export'](root)
  except ValueError:cases.append(mode)
  else:raise AssertionError('accepted '+mode)
  assert all(p.read_bytes()==v for p,v in before.items()),mode
print(json.dumps(cases))
`,
      ],
      { encoding: 'utf8' },
    ),
  );
  assert.equal(result.length, 52);
});

void test('coverage separates Human visual inventory from detailed subset', () => {
  const rows = subjectEvidence('4HB1');
  assert.equal(rows.length, 1);
  const detail = rows[0].extraction!;
  assert.equal(detail.detailedTasks, 29);
  assert.equal(detail.originalMarks, 64);
  assert.equal(detail.expectedTasks, 42);
  assert.equal(detail.wholePageAudit, false);
  assert.deepEqual(detail.reviewedQuestions, ['1', '2', '3', '4', '5', '6']);
  assert.equal(rows[0].index?.visualTasks, 42);
  assert.equal(rows[0].index?.reconciledMarks, 90);
  assert.equal(rows[0].index?.questionPaperPages, 24);
  assert.equal(rows[0].index?.markSchemePages, 12);
  assert.equal(rows[0].index?.hasEquationBooklet, false);
  assert.equal(evidenceHighlights.activeFamilies, 0);
});
