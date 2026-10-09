import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4MB1-number-2026-10-09.json' with { type: 'json' };
import inventory from '../research/syllabus/4MB1-number.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-maths-number-teaching-source.json' with { type: 'json' };

void test('Maths B Number teaching preserves eleven section-row identities and forty-three reviewed requirements', () => {
  assert.equal(review.points.length, 11);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 43);
  assert.deepEqual(inventory.points.map((p) => p.reference), Array.from('ABCDEFGHIJK', (c) => '1' + c));
  assert.ok(inventory.points.every((p) => p.substatementAuditComplete && p.teachingCoverage === 'complete'));
  assert.ok(inventory.points.every((p) => JSON.stringify(p.components) === '["01","02"]'));
  assert.deepEqual(review.sourceVisualPages, [17,18]);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.equal(source.matchesRetainedSource, true);
  assert.equal(source.activeTemplates, 0);
});

void test('independent exact number calculations support the new mixed lesson answers and endpoint choices', () => {
  const output = execFileSync('python3', ['-c', `
from fractions import Fraction as F
from decimal import Decimal as D,ROUND_HALF_UP
from math import gcd,isqrt
assert F(-9+3,-2*3)-(-4)==5
assert -(7-11)+F(-12,3)==0
assert F(24,3)*(-2)==-16 and F(24,3*(-2))==-4
assert gcd(84,126)==42 and 84*126//gcd(84,126)==252
assert isqrt(49)==7 and 3**2==9 and F(1,2**4)==F(1,16)
assert 5**3*F(1,5)/5==5 and (3**2)**2==81
def mul(a,b,d):return (a[0]*b[0]+d*a[1]*b[1],a[0]*b[1]+a[1]*b[0])
assert mul((F(-1),F(1)),(F(2),F(2)),5)==(F(8),F(0))
assert mul((F(0),F(1)),(F(0),F(5,2)),2)==(F(5),F(0))
assert F(30*20,10000)==F(6,100)
assert F(30*20*25,1000000)==F(15,1000) and F(30*20*25,1000)==15
assert F(1250,1000)+F(75,100)==2
assert (18+12)/((20+40)/60)==30 and (20+40)*60==3600
assert F(875,10)/F(25,10)+2==37
assert [F(2,5)+F(1,6),F(3,4)-F(1,8),F(2,3)*F(9,10),F(4,5)/F(2,3)]==[F(17,30),F(5,8),F(3,5),F(6,5)]
assert [D('1.25')+D('0.8'),D('2.4')-D('0.65'),D('0.6')*D('0.25'),D('1.44')/D('0.12')]==[D('2.05'),D('1.75'),D('0.15'),D('12')]
assert F(3,8)*100==F(375,10)
assert [F(240,12)*x for x in [3,4,5]]==[60,80,100]
assert F(15,6)*10==25 and F(100-80,80)*100==25 and F(68)/F(85,100)==80
assert D('0.007865').quantize(D('0.0001'),rounding=ROUND_HALF_UP)==D('0.0079')
assert D('0.007865').quantize(D('0.00001'),rounding=ROUND_HALF_UP)==D('0.00787')
assert D('12.995').quantize(D('0.01'),rounding=ROUND_HALF_UP)==D('13.00')
loM,hiM,loN,hiN=25,35,35,45
assert [loM+loN,hiM+hiN,loM-hiN,hiM-loN,loM*loN,hiM*hiN]==[60,80,-20,0,875,1575]
assert F(loM,hiN)==F(5,9) and F(hiM,loN)==1
# Strict limits: actual upper input endpoints are excluded; these interior samples cannot attain them.
for m,n in [(F(25),F(35)),(F(34999,1000),F(44999,1000)),(F(30),F(40))]:
 assert F(5,9)<m/n<1 and -20<m-n<0
assert F(75,10)*F(1,10000)-F(25,10)*F(1,10000)==F(5,10000)
assert F(600000000,2400)==250000
assert F(4,1000)*300==F(12,10)
assert 8*(6000000+400000)==51200000 and F(51200000,2000000)==F(256,10)
print('exact arithmetic and domain limits verified')
`], { encoding: 'utf8' });
  assert.equal(output.trim(), 'exact arithmetic and domain limits verified');
});

void test('Maths Number completion rejects stale answers, omitted decisions and invented decimal references', () => {
  const output = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4MB1-number.json';rp='research/teaching-reviews/4MB1-number-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4MB1-number.json','content/notes/mathematics.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==11
 mutations=[
 ('content/notes/mathematics.json',lambda b:b.replace(b'5/9<m/n<1',b'5/9<=m/n<=1')),
 (rp,lambda b:b.replace(b'"verdict": "approved"',b'"verdict": "pending"',1)),
 (ip,lambda b:b.replace(b'"reference": "1A"',b'"reference": "1.1"'))]
 for relative,mutate in mutations:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert changed!=original;p.write_bytes(changed)
  try:validate_inventory_completion(root,json.loads((root/ip).read_text()))
  except ValueError:print('stale Number evidence rejected')
  else:raise AssertionError('changed evidence accepted')
  p.write_bytes(original)
`], { encoding: 'utf8' });
  assert.equal(output.trim(), Array(3).fill('stale Number evidence rejected').join('\n'));
});
