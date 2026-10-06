import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import retrievalFamily from '../research/templates/4EB1-retrieve-two-causes.v0.1.0.json' with { type: 'json' };
import model from '../research/assessment-objectives/4EB1-issue4.json' with { type: 'json' };
import readingReview from '../research/teaching-reviews/4EB1-reading-foundations.json' with { type: 'json' };
import writingReview from '../research/teaching-reviews/4EB1-writing-foundations.json' with { type: 'json' };
import { assessmentObjectiveCoverage } from '../lib/assessment-objectives.ts';
import { getNotes } from '../content/notes.ts';
import { reviewedInventories } from '../lib/syllabus.ts';

void test('English official objective weights preserve the separate optional endorsement', () => {
  const rows = assessmentObjectiveCoverage('4EB1');
  assert.deepEqual(rows.map((r) => [r.reference, r.qualificationWeightPercent]),
    [['AO1',15],['AO2',20],['AO3',15],['AO4',32],['AO5',18],['AO6',null]]);
  assert.equal(rows.filter((r) => r.scope === 'exam').reduce((n, r) => n + r.qualificationWeightPercent!, 0), 100);
  assert.equal(rows.find((r) => r.reference === 'AO6')?.scope, 'optional-endorsement');
  assert.equal(rows.find((r) => r.reference === 'AO6')?.links.length, 0);
  assert.ok(rows.every((r) => r.referenceKind === 'assessment-objective' && !r.complete && !r.humanReviewed));
  assert.deepEqual(assessmentObjectiveCoverage('4MB1'), []);
  assert.equal(reviewedInventories.filter((r) => r.qualification === '4EB1').length, 0);
});

void test('every partial English AO link resolves to its exact saved lesson and historical review', () => {
  assert.equal(model.teachingLinks.length, 41);
  assert.equal(new Set(model.teachingLinks.map((r) => `${r.chapterId}:${r.sectionId}`)).size, 24);
  const expected = [
    ...readingReview.sections.flatMap((row) => row.assessmentObjectiveRefs.map((ref) =>
      `4EB1:issue4:${ref}:${readingReview.chapterId}:${row.sectionId}`)),
    ...writingReview.sections.flatMap((row) => row.assessmentObjectiveRefs.map((ref) =>
      `4EB1:issue4:${ref}:${row.chapterId}:${row.sectionId}`)),
  ];
  assert.deepEqual(model.teachingLinks.map((r) => r.id).sort(), expected.sort());
  for (const link of model.teachingLinks) {
    const objective = model.objectives.find((r) => r.id === link.objectiveId)!;
    const note = getNotes('english', link.chapterId)!;
    const section = note.sections.find((r) => r.id === link.sectionId)!;
    assert.ok(section && section.points?.includes(objective.reference));
    assert.equal(note.sourceId, model.specificationDocumentId);
    assert.equal(link.status, 'partial');
    assert.equal(link.humanReviewed, false);
    assert.equal(link.teachingReviewedAt,
      link.chapterId === 'reading' ? readingReview.reviewDate : writingReview.reviewDate);
  }
});

void test('AO CSV projections match all saved fields without changing numbered ledgers', () => {
  const result = execFileSync('python3', ['-c', `
import sys,json,csv
from pathlib import Path
sys.path.insert(0,'scripts')
from assessment_objective_io import objective_tables
from ledger_io import read_table
root=Path('.')
model=json.loads((root/'research/assessment-objectives/4EB1-issue4.json').read_text())
for name,(fields,expected) in objective_tables(model,root).items():
 with (root/'research/ledger/v1'/(name+'.csv')).open(newline='') as f:
  reader=csv.DictReader(f);assert reader.fieldnames==fields
  actual=[r for r in reader if r['qualification']=='4EB1']
  assert sorted(actual,key=lambda r:r[fields[0]])==sorted(expected,key=lambda r:r[fields[0]])
  if name=='assessment-objectives':assert next(r for r in actual if r['official_reference']=='AO6')['qualification_weight_percent']==''
for table in ['syllabus-points','coverage']:
 _,rows=read_table(root/'research/ledger/v1',table)
 assert not [r for r in rows if r['point_id'].startswith('4EB1:')]
print('separate AO tables match; no numbered English rows invented')
`], { encoding: 'utf8' });
  assert.match(result, /no numbered English rows invented/);
});

void test('objective normalization rejects stale links, altered scope and invented completion', () => {
  const result = execFileSync('python3', ['-c', `
import sys,json,copy
from pathlib import Path
sys.path.insert(0,'scripts')
from assessment_objective_io import objective_tables
root=Path('.')
original=json.loads((root/'research/assessment-objectives/4EB1-issue4.json').read_text())
for mode in ['optional-weight','exam-null','weight-total','duplicate-objective','scope','hash','complete','human','missing-link','dangling','date','link-human','link-complete']:
 m=copy.deepcopy(original)
 if mode=='optional-weight':m['objectives'][-1]['qualificationWeightPercent']=0
 elif mode=='exam-null':m['objectives'][0]['qualificationWeightPercent']=None
 elif mode=='weight-total':m['objectives'][0]['qualificationWeightPercent']=16
 elif mode=='duplicate-objective':m['objectives'][-1]=copy.deepcopy(m['objectives'][0])
 elif mode=='scope':m['objectives'][0]['scope']='optional-endorsement'
 elif mode=='hash':m['specificationSha256']='0'*64
 elif mode=='complete':m['objectives'][0]['complete']=True
 elif mode=='human':m['humanReviewed']=True
 elif mode=='missing-link':m['teachingLinks'].pop()
 elif mode=='dangling':m['teachingLinks'][0]['sectionId']='missing'
 elif mode=='date':m['teachingLinks'][0]['teachingReviewedAt']='2026-10-06'
 elif mode=='link-human':m['teachingLinks'][0]['humanReviewed']=True
 elif mode=='link-complete':m['teachingLinks'][0]['status']='complete'
 try:objective_tables(m,root)
 except ValueError:pass
 else:raise AssertionError('accepted '+mode)
print('13 inconsistent objective contracts rejected before projection')
`], { encoding: 'utf8' });
  assert.match(result, /13 inconsistent objective contracts rejected/);
});

void test('English retrieval family maps to the official AO domain without becoming an active template', () => {
  const ref = retrievalFamily.syllabusRefs[0];
  const objective = model.objectives.find((row) => row.id === ref.pointId)!;
  assert.ok(objective);
  assert.equal(objective.reference, 'AO1');
  assert.equal(objective.scope, 'exam');
  assert.equal(ref.documentId, model.specificationDocumentId);
  assert.deepEqual(ref.pdfPages, objective.sourcePdfPages);
  assert.deepEqual(retrievalFamily.assessmentObjectives, ['AO1']);
  assert.equal(retrievalFamily.status, 'provisional');
  assert.deepEqual(retrievalFamily.customQuiz.validatedMarks, []);
});
