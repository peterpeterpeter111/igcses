import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4CH1-organic-foundations.json' with { type: 'json' };
import review from '../research/teaching-reviews/4CH1-organic-oil-2026-10-14.json' with { type: 'json' };
import current from '../research/teaching-reviews/4CH1-organic-foundations-2026-10-15.json' with { type: 'json' };

void test('original twelve oil decisions remain exact when the later foundations review completes authored coverage', () => {
  assert.deepEqual(review.points.map((p) => p.pointId.split(':').at(-1)), Array.from({ length: 12 }, (_, i) => `4.${i + 7}`));
  assert.equal(inventory.points.filter((p) => p.teachingCoverage === 'complete').length, 28);
  assert.deepEqual(current.points.filter((p) => review.points.some((old) => old.pointId === p.pointId)), review.points);
  assert.ok(inventory.points.every((p) => p.components.join(',') === '1C,2C'));
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 35);
  assert.equal(review.humanReviewed, false); assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
});

void test('actual oil exercises conserve all atoms, assess six uses, bound refinery yields and retain seven arrowheads', () => {
  const result = execFileSync('python3', ['-c', `
import json,re,collections,xml.etree.ElementTree as E
n=json.load(open('content/notes/chemistry-organic.json'));s={s['id']:s for s in n['sections']}
assert not n['complete'] and not n['humanReviewed']
assert all(x.get('example') and x.get('practice') for x in n['sections'][6:18])
def side(text):
 totals=collections.Counter()
 for term in text.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789')).split(' + '):
  coefficient,formula=re.fullmatch(r'([0-9]*)([A-Za-z0-9]+)',term).groups();coefficient=int(coefficient or 1)
  for element,count in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula):totals[element]+=coefficient*int(count or 1)
 return dict(totals)
actual=[]
actual.append(s['hydrocarbon-complete-combustion']['practice']['answer'].split('. ')[0])
answer=s['hydrocarbon-incomplete-combustion']['practice']['answer']
actual.append(answer.split('CO model: ')[1].split(', conserving')[0])
actual.append(answer.split('Carbon model: ')[1].split(', conserving')[0])
actual.append(s['cracking-process']['practice']['answer'].split('The model is ')[1].split(', conserving')[0])
for equation in actual:
 left,right=equation.split(' → ');assert side(left)==side(right),equation
assert side('C14H30')!=side('C8H18 + C3H6')
assert 60-35==25 and 40-25==15
assert '25 units' in s['cracking-demand']['practice']['answer'] and '15 units' in s['cracking-demand']['practice']['answer']
assert 'product distribution and conversion' in s['cracking-demand']['practice']['answer']
uses=s['fraction-uses']['practice']['answer']
for pair in ['Refinery gases—cooking/heating','gasoline (petrol)—car petrol engines','kerosene—jet aircraft','diesel—diesel engines','fuel oil—large-scale heating','bitumen—road surfacing/roofing']:assert pair in uses,pair
assert 'silica or alumina' in s['cracking-process']['practice']['answer'] and '600–700 °C' in s['cracking-process']['practice']['answer']
assert 'higher to lower liquid outlets put A, B, C' in s['fractional-column']['practice']['answer']
root=E.parse('public/diagrams/chemistry-fractionating-column.svg').getroot();ns={'s':'http://www.w3.org/2000/svg'}
g=next(g for g in root.findall('s:g',ns) if g.get('marker-end'))
paths=[p.get('d') for p in g.findall('s:path',ns)]
assert len(paths)==7 and all(p.count('M')==1 for p in paths)
assert [int(re.search(r'M430 ([0-9]+)',p).group(1)) for p in paths[:5]]==[132,207,282,357,432]
print('four actual equations, fraction-use pairs, bounded yield inference and all feed/outlet arrows verified')
`], { encoding: 'utf8' });
  assert.match(result, /all feed\/outlet arrows verified/);
});
