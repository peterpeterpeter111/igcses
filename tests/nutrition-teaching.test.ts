import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4BI1-human-nutrition.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-human-nutrition-2026-10-09.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-human-nutrition-teaching-source.json' with { type: 'json' };
import part from '../content/note-sections/biology-structures/05-nutrition.json' with { type: 'json' };

void test('nutrition teaching keeps its own Biology source, ten identities and forty-two bounded decisions', () => {
  assert.equal(review.points.length, 10);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 42);
  assert.deepEqual(inventory.points.map((p) => p.reference), ['2.24','2.25','2.26','2.27','2.28','2.29','2.30','2.31','2.32','2.33B']);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete' && p.substatementAuditComplete));
  assert.ok(inventory.points.slice(0,9).every((p) => JSON.stringify(p.components) === '["1B","2B"]'));
  assert.deepEqual(inventory.points.at(-1)!.components, ['2B']);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.deepEqual(source.specification.visuallyReviewedPages, [21]);
  assert.deepEqual(source.supplementaryGuide.visuallyReviewedPages, [30]);
  assert.match(source.primarySupport.find((p) => p.url.includes('VitaminC'))!.retrievalStatus, /error/);
  assert.equal(source.activeTemplates, 0);
});

void test('independent calorimetry arithmetic distinguishes mass burned, water mass and energy definitions', () => {
  const rows = part.sections.find((p) => p.id === 'food-energy-comparison-evidence')!.table!.rows;
  const output = execFileSync('python3', ['-c', `
import json,sys
from decimal import Decimal as D
rows=json.loads(sys.argv[1]);out=[]
for name,water,initial,final,before,after in rows:
 burned=D(before)-D(after);rise=D(final)-D(initial);q=D(water)*D('4.2')*rise
 out.append([str(burned),str(rise),int(q),str(q/burned/1000)])
assert [r[2] for r in out]==[2520,3528,1890]
assert [D(r[3]) for r in out]==[D('6.3'),D('5.04'),D('6.3')]
assert D(rows[2][3])-D(rows[2][2])>D(rows[0][3])-D(rows[0][2])
assert D(out[2][3])==D(out[0][3]) # Higher rise does not imply greater energy per gram.
assert D('40')*D('4.2')*(D('26.5')-D('19'))==1260
assert D('1260')/(D('1.10')-D('0.85'))/1000==D('5.04')
assert D('2520')/D('1.20')/1000!=D(out[0][3]) # Starting mass is wrong denominator.
print('independent invented calorimetry comparisons verified')
`, JSON.stringify(rows)], { encoding: 'utf8' });
  assert.equal(output.trim(), 'independent invented calorimetry comparisons verified');
});

void test('nutrition completion refuses changed secretion routes, invented measurements and calorimetry data', () => {
  const output = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-human-nutrition.json';rp='research/teaching-reviews/4BI1-human-nutrition-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-human-nutrition.json','content/notes/biology-structures.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 shutil.copytree(src/'content/note-sections/biology-structures',root/'content/note-sections/biology-structures')
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==10
 mutations=[
 ('public/diagrams/biology-digestion-route-evidence.svg',lambda b:b.replace(b'M346 416H289V355H254',b'M346 416H254')),
 ('content/note-sections/biology-structures/05-nutrition.json',lambda b:b.replace(b'"28.4"',b'"38.4"')),
 ('content/note-sections/biology-structures/05-nutrition.json',lambda b:b.replace(b'The table contains invented classroom readings',b'The table contains measured readings from our trials'))]
 for relative,mutate in mutations:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert changed!=original;p.write_bytes(changed)
  try:validate_inventory_completion(root,inv)
  except ValueError:print('stale nutrition evidence rejected')
  else:raise AssertionError('changed teaching accepted')
  p.write_bytes(original)
`], { encoding: 'utf8' });
  assert.equal(output.trim(), Array(3).fill('stale nutrition evidence rejected').join('\n'));
});
