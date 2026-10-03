import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { obtainedPaperCandidates, paperDetailedSummary } from '../lib/paper-discovery.ts';
import detail from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };

void test('Maths coverage exposes the reviewed subset without criteria or promotion', () => {
  const candidate = obtainedPaperCandidates('4MB1')[0];
  const summary = paperDetailedSummary(candidate)!;
  assert.ok(summary);
  assert.equal(summary.detailedTasks, 28);
  assert.equal(summary.originalMarks, 71);
  assert.equal(summary.indexedTasks, 38);
  assert.equal(summary.remainingTasks, 10);
  assert.equal(summary.fullyProcessed, false);
  assert.equal(summary.humanReviewed, false);
  assert.ok(!('tasks' in summary) && !('criteria' in summary));
  assert.equal(paperDetailedSummary({ ...candidate, questionPaper: { ...candidate.questionPaper, sha256: 'mismatch' } }), null);
  assert.equal(paperDetailedSummary({ ...candidate, markScheme: { ...candidate.markScheme, sha256: 'mismatch' } }), null);
  assert.deepEqual(detail.tasks.slice(0, 2).map((t) => t.criteria.map((c) => c.code)), [['M1', 'A1'], ['B2/B1']]);
  assert.ok(detail.tasks[1].dependencies.some((rule) => rule.includes('Do not ignore subsequent working')));
  const q16 = detail.tasks.find((task) => task.questionPath === '16')!;
  assert.equal(q16.originalMarks, 4);
  assert.deepEqual(q16.criteria.map((c) => 'dependsOn' in c ? c.dependsOn ?? [] : []), [[], ['mixed-number-representation'], [], ['mixed-number-representation', 'multiplication-method', 'common-denominator-addition']]);
  assert.match(q16.criteria[1].rule, /21\/4 is explicitly insufficient/);
  assert.match(q16.criteria[3].rule, /improper fraction must also be visible/);
  assert.equal(q16.responseRequirements?.calculatorAllowed, false);
  assert.equal(q16.responseRequirements?.workingRequired, true);
  const q19 = detail.tasks.find((task) => task.questionPath === '19')!;
  assert.equal(q19.syllabusMappings[0].currentApplicability, 'unresolved-specification-scope');
  assert.equal(q19.scopeReview?.status, 'unresolved');
  assert.equal(q19.specialCases?.[0].additive, false);
  assert.equal(q19.criteria.reduce((sum, c) => sum + c.marks, 0), 3);
  const q20 = detail.tasks.find((task) => task.questionPath === '20')!;
  assert.deepEqual('dependsOn' in q20.criteria[3] ? q20.criteria[3].dependsOn : [], ['square-numerator', 'conjugate-method', 'surd-or-denominator-simplification']);
  assert.equal(q20.responseRequirements?.workingRequired, true);
});

void test('Maths export rejects source, count, page and promotion errors before table changes', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import copy,importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('maths_export','scripts/export-maths-extraction.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def remove_task(m):
 m['tasks'].pop()
 m['detailedLeafTasks']=len(m['tasks'])
 m['detailedOriginalMarks']=sum(t['originalMarks'] for t in m['tasks'])
 m['reviewedQuestionTotals']={q:sum(t['originalMarks'] for t in m['tasks'] if t['questionPath'].split('.')[0]==q) for q in {t['questionPath'].split('.')[0] for t in m['tasks']}}
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['extractions','discovery','paper-indexes','paper-reviews','syllabus','ledger/v1']:
  shutil.copytree(Path('research')/folder,root/'research'/folder)
 path=root/module.OVERLAY;original=json.loads(path.read_text())
 before={p:p.read_bytes() for p in (root/'research/ledger/v1').rglob('*.csv')}
 outputs=module.prepare(root)
 assert all(text==p.read_text() for p,text in outputs.items()),'Saved export drift'
 mutations={
  'hash':lambda m:m['documents'][0].update(sha256='bad'),
  'count':lambda m:m.update(detailedLeafTasks=38),
  'marks':lambda m:m['tasks'][0].update(originalMarks=5),
  'duplicate':lambda m:m['tasks'].append(m['tasks'][0]),
  'promotion':lambda m:m.update(paperStage='processed',fullyProcessed=True),
  'visual':lambda m:m['pageAudit']['questionPaper'].update(visuallyReviewedPages=[1]),
  'spec-page':lambda m:m['tasks'][0]['syllabusMappings'][0]['evidenceRefs'][0].update(pdfPages=[19]),
  'scheme-page':lambda m:m['tasks'][1].update(markSchemePages=[15]),
  'rubric-max':lambda m:m['tasks'][1]['criteria'][0].update(marks=3),
  'cyclic-dependency':lambda m:m['tasks'][2]['criteria'][0].update(dependsOn=['mixed-number-result']),
  'unknown-dependency':lambda m:m['tasks'][2]['criteria'][3].update(dependsOn=['invented-method']),
  'removed-task':remove_task,
  'scope-promotion':lambda m:next(t for t in m['tasks'] if t['questionPath']=='19')['syllabusMappings'][0].update(currentApplicability='current-specification'),
  'scope-evidence':lambda m:m.update(sourceDiscrepancies=[]),
  'unknown-scope':lambda m:m['tasks'][0]['syllabusMappings'][0].update(currentApplicability='invented'),
 }
 for name,mutate in mutations.items():
  m=copy.deepcopy(original);mutate(m);path.write_text(json.dumps(m))
  try:module.prepare(root)
  except (ValueError,KeyError):pass
  else:raise AssertionError(name+' accepted')
  assert all(p.read_bytes()==data for p,data in before.items()),name+' changed a table'
 print(json.dumps({'rejected':len(mutations),'tablesChecked':len(outputs)}))
`], { encoding: 'utf8' }));
  assert.equal(result.rejected, 15);
  assert.equal(result.tablesChecked, 4);
});
