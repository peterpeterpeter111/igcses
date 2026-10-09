import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4BI1-cell-organisation.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-cell-organisation-2026-10-09.json' with { type: 'json' };

void test('cell organisation review covers 31 requirements with exact Paper 2B-only differentiation and stem-cell scope', () => {
  assert.equal(review.points.length, 6);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 31);
  assert.ok(inventory.points.every((p) => p.substatementAuditComplete && p.teachingCoverage === 'complete'));
  assert.deepEqual(inventory.points.filter((p) => p.reference.endsWith('B')).map((p) => [p.reference, p.components]), [['2.5B', ['2B']], ['2.6B', ['2B']]]);
  assert.deepEqual(Object.keys(review.diagramSha256).sort(), ['/diagrams/biology-cell-comparison.svg', '/diagrams/biology-cell-evidence.svg']);
  assert.equal(review.humanReviewed, false); assert.equal(review.examTemplateCalibrationComplete, false);
});
void test('cell organisation completion rejects changed label targets, source applicability and evidence answers', () => {
  const r = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-cell-organisation.json';rp='research/teaching-reviews/4BI1-cell-organisation-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-cell-organisation.json','content/notes/biology-structures.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 shutil.copytree(src/'content/note-sections/biology-structures',root/'content/note-sections/biology-structures')
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==6
 mutations=[
 ('public/diagrams/biology-cell-evidence.svg',lambda b:b.replace(b'M332 383L289 353',b'M332 383L213 281')),
 (ip,lambda b:b.replace(b'"2.5B",',b'"2.5",')),
 ('content/note-sections/biology-structures/01-cells.json',lambda b:b.replace(b'Division alone increases cell number',b'Division alone gives every specialised function'))]
 for relative,mutate in mutations:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert original!=changed;p.write_bytes(changed)
  try:validate_inventory_completion(root,json.loads((root/ip).read_text()))
  except ValueError:print('stale cell evidence rejected')
  else:raise AssertionError('changed evidence accepted')
  p.write_bytes(original)
`], { encoding: 'utf8' });
  assert.equal(r.trim(), Array(3).fill('stale cell evidence rejected').join('\n'));
});
