import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4CH1-states-and-mixtures.json' with { type: 'json' };
import review from '../research/teaching-reviews/4CH1-states-mixtures-2026-10-09.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-chemistry-states-teaching-source.json' with { type: 'json' };
import note from '../content/notes/chemistry.json' with { type: 'json' };

void test('states-mixtures teaching promotes thirteen identities while preserving nine later partial rows', () => {
  assert.equal(review.points.length, 13);
  assert.equal(review.points.reduce((n,p) => n+p.requirements.length,0), 39);
  assert.equal(inventory.points.filter((p) => p.teachingCoverage === 'complete').length,13);
  assert.ok(inventory.points.slice(13).every((p) => p.teachingCoverage === 'partial' && !p.substatementAuditComplete));
  assert.deepEqual(inventory.points.filter((p) => p.components.length===1).map((p) => p.reference), ['1.5C','1.6C','1.7C']);
  assert.deepEqual(review.sourceVisualPages,[17,18]);
  assert.equal(review.humanReviewed,false);
  assert.equal(review.practicalTrialsPerformed,false);
  assert.equal(review.examTemplateCalibrationComplete,false);
  assert.deepEqual(source.supplementaryGuide.visuallyReviewedPages,[72,75]);
  assert.equal(source.activeTemplates,0);
});

void test('invented solubility and chromatography values agree with independent exact calculations and plotted coordinates', () => {
  const rows=note.sections.find((s)=>s.id==='saturation-and-solubility-data')!.table!.rows;
  const result=execFileSync('python3',['-c',`
import json,sys,re
from fractions import Fraction as F
from pathlib import Path
rows=json.loads(sys.argv[1]);assert rows==[['20','24'],['40','38'],['60','58'],['80','84']]
assert F(5,25)==F(1,5) and F(1,5)*F(5,25)==F(1,25)
assert F(24*15,100)==F(36,10) and F(24*15,100)+15==F(186,10)
assert F((84-38)*25,100)==F(115,10) and F((58-24)*40,100)==F(136,10)
assert F(316,10)-28==F(36,10)
water=F(424,10)-F(316,10);assert water==F(108,10)
assert F(36,10)/water*100==F(100,3)
assert [F(x,70) for x in [28,56,28,49]]==[F(2,5),F(4,5),F(2,5),F(7,10)]
assert F(18,45)==F(2,5) and [F(20,80),F(56,80)]==[F(1,4),F(7,10)]
svg=Path('public/diagrams/chemistry-solubility-evidence.svg').read_text()
points=re.findall(r'<circle cx="([0-9.]+)" cy="([0-9.]+)" r="5"',svg)
assert [(F(x),F(y)) for x,y in points]==[(76+5*int(t),390-F('2.8')*int(v)) for t,v in rows]
# The illustrative quadratic Bezier passes through every supplied point; it is not a measured interpolation claim.
for t,v in rows:
 u=F(int(t)-20,60);x=(1-u)**2*176+2*u*(1-u)*326+u*u*476
 y=(1-u)**2*F('322.8')+2*u*(1-u)*F('276.6')+u*u*F('154.8')
 assert x==76+5*int(t) and y==390-F('2.8')*int(v)
print('independent calculations and curve positions verified')
`,JSON.stringify(rows)],{encoding:'utf8'});
  assert.equal(result.trim(),'independent calculations and curve positions verified');
});

void test('states-mixtures completion rejects stale atom symbols, solubility points and purity assertions', () => {
  const result=execFileSync('python3',['-c',`
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4CH1-states-and-mixtures.json';rp='research/teaching-reviews/4CH1-states-mixtures-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4CH1-states-and-mixtures.json','content/notes/chemistry.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==13
 mutations=[
 ('public/diagrams/chemistry-particle-evidence.svg',lambda b:b.replace(b'Atom type B',b'Atom type A')),
 ('public/diagrams/chemistry-solubility-evidence.svg',lambda b:b.replace(b'cy="154.8"',b'cy="110"')),
 ('content/notes/chemistry.json',lambda b:b.replace(b'One detected spot does not prove purity',b'One detected spot proves purity'))]
 for relative,mutate in mutations:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert changed!=original;p.write_bytes(changed)
  try:validate_inventory_completion(root,inv)
  except ValueError:print('stale chemistry evidence rejected')
  else:raise AssertionError('changed teaching accepted')
  p.write_bytes(original)
`],{encoding:'utf8'});
  assert.equal(result.trim(),Array(3).fill('stale chemistry evidence rejected').join('\n'));
});
