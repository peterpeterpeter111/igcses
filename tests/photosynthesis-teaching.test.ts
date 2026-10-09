import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4BI1-photosynthesis.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-photosynthesis-2026-10-09.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-photosynthesis-teaching-source.json' with { type: 'json' };
import part from '../content/note-sections/biology-structures/04-photosynthesis.json' with { type: 'json' };

void test('photosynthesis authored teaching covers six source statements without inventing trials or exam readiness', () => {
  assert.equal(review.points.length, 6);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 19);
  assert.deepEqual(inventory.points.map((p) => p.reference), ['2.18','2.19','2.20','2.21','2.22','2.23']);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete' && p.substatementAuditComplete));
  assert.ok(inventory.points.every((p) => JSON.stringify(p.components) === '["1B","2B"]'));
  assert.equal(review.humanReviewed, false);
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.deepEqual(source.supplementaryGuide.visuallyReviewedPages, [26,27]);
  assert.match(source.practicalBiology.directFetchStatus, /403/);
  const rates = part.sections.find((s) => s.id === 'photosynthesis-rate-comparisons')!.table!.rows;
  assert.deepEqual(rates.map((r) => Number(r[4]) / 2), [0.3,0.6,1.2,1.2,1.5,0.45]);
  assert.equal(1.6 / 4, 0.4);
  assert.deepEqual([6, 6*2, 6*2+6], [6,12,18]);
  assert.deepEqual([6,12,6+6*2], [6,12,18]);
});

void test('photosynthesis completion refuses stale label endpoints, practical conclusions and fictional rate data', () => {
  const output = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-photosynthesis.json';rp='research/teaching-reviews/4BI1-photosynthesis-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-photosynthesis.json','content/notes/biology-structures.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 shutil.copytree(src/'content/note-sections/biology-structures',root/'content/note-sections/biology-structures')
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==6
 mutations=[
 ('public/diagrams/biology-leaf-evidence.svg',lambda b:b.replace(b'M323 417V364',b'M323 417L175 360')),
 ('content/note-sections/biology-structures/04-photosynthesis.json',lambda b:b.replace(b'"0.9"',b'"9.0"')),
 ('content/note-sections/biology-structures/04-photosynthesis.json',lambda b:b.replace(b'A failed positive C control prevents a strong conclusion',b'A failed positive C control proves the carbon dioxide requirement'))]
 for relative,mutate in mutations:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert changed!=original;p.write_bytes(changed)
  try:validate_inventory_completion(root,inv)
  except ValueError:print('stale photosynthesis evidence rejected')
  else:raise AssertionError('changed teaching accepted')
  p.write_bytes(original)
`], { encoding: 'utf8' });
  assert.equal(output.trim(), Array(3).fill('stale photosynthesis evidence rejected').join('\n'));
});
