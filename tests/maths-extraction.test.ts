import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { obtainedPaperCandidates, paperDetailedSummary } from '../lib/paper-discovery.ts';
import detail from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };

void test('Maths coverage exposes the reviewed subset without criteria or promotion', () => {
  const candidate = obtainedPaperCandidates('4MB1')[0];
  const summary = paperDetailedSummary(candidate)!;
  assert.ok(summary);
  assert.equal(summary.detailedTasks, 2);
  assert.equal(summary.originalMarks, 4);
  assert.equal(summary.indexedTasks, 38);
  assert.equal(summary.remainingTasks, 36);
  assert.equal(summary.fullyProcessed, false);
  assert.equal(summary.humanReviewed, false);
  assert.ok(!('tasks' in summary) && !('criteria' in summary));
  assert.equal(paperDetailedSummary({ ...candidate, questionPaper: { ...candidate.questionPaper, sha256: 'mismatch' } }), null);
  assert.equal(paperDetailedSummary({ ...candidate, markScheme: { ...candidate.markScheme, sha256: 'mismatch' } }), null);
  assert.deepEqual(detail.tasks.map((t) => t.criteria.map((c) => c.code)), [['M1', 'A1'], ['B2/B1']]);
  assert.ok(detail.tasks[1].dependencies.some((rule) => rule.includes('Do not ignore subsequent working')));
});

void test('Maths export rejects source, count, page and promotion errors before table changes', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import copy,importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('maths_export','scripts/export-maths-extraction.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
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
  'removed-task':lambda m:(m['tasks'].pop(),m.update(detailedLeafTasks=1,detailedOriginalMarks=2,reviewedQuestionTotals={'15':2})),
 }
 for name,mutate in mutations.items():
  m=copy.deepcopy(original);mutate(m);path.write_text(json.dumps(m))
  try:module.prepare(root)
  except (ValueError,KeyError):pass
  else:raise AssertionError(name+' accepted')
  assert all(p.read_bytes()==data for p,data in before.items()),name+' changed a table'
 print(json.dumps({'rejected':len(mutations),'tablesChecked':len(outputs)}))
`], { encoding: 'utf8' }));
  assert.equal(result.rejected, 10);
  assert.equal(result.tablesChecked, 4);
});
