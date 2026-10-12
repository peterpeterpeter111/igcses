import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-atmosphere-2026-10-12.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-atmosphere.json' with { type: 'json' };
import historical from '../research/reviews/2026-10-06-atmosphere-teaching-review.json' with { type: 'json' };

void test('six atmosphere identities have33 authored requirements with practical teaching separate from performed work', () => {
  assert.equal(review.points.length, 6);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 33);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete' && p.components.join(',') === '1C,2C'));
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.equal(historical.completePoints, 0);
  assert.equal(historical.fullyProcessedPapers, 0);
});

void test('independent atmosphere volume, endpoint, geometry, composition and product calculations match authored inputs', () => {
  const output = execFileSync('python3', ['-c', `
import json,re,collections,xml.etree.ElementTree as ET
from fractions import Fraction as F
from pathlib import Path
n=json.loads(Path('content/notes/chemistry-inorganic.json').read_text());s={s['id']:s for s in n['sections']}
ids=['dry-air-volume-transfer-evidence','oxygen-total-volume-transfer-evidence','oxygen-plan-and-error-transfer-evidence','element-combustion-transfer-evidence','carbonate-decomposition-transfer-evidence','greenhouse-mechanism-transfer-evidence']
assert all(s[id].get('example') and s[id].get('practice') for id in ids)
assert s['oxygen-plan-and-error-transfer-evidence']['practical']['quality']
assert n['complete']==False
fractions=[F(78,100),F(21,100),F(9,1000),F(4,10000)]
assert [250*f for f in fractions]==[F(195),F(105,2),F(9,4),F(1,10)]
assert sum(fractions)==F(4997,5000) and 250*(1-sum(fractions))==F(3,20)
assert 600*fractions[1]==126 and 600*fractions[2]==F(27,5)
def oxygen(fixed,start,end):return 100*F(start-end,fixed+start)
assert oxygen(95,30,5)==20 and oxygen(76,24,3)==21
assert F(25,30)*100!=20 and F(25,100)*100!=20 # wrong denominator choices
assert 100*F(125-104,125)==F(84,5) and 100*F(125-100,125)==20
values=[F(206,10),F(210,10),F(214,10)];assert sum(values)/len(values)==21 and max(values)-min(values)==F(4,5)
# Ideal-gas T scaling isolates a hot final reading from equally warmer initial/final readings.
start=F(125);end=F(100);ratio=F(303,293)
assert 100*(start-end*ratio)/start<20
assert 100*((start*ratio)-(end*ratio))/(start*ratio)==20
# Invented varying-bore example shows why length loss is not generally volume loss.
def V(length):return F(length)+F(length*length,10)
assert 100*(V(10)-V(8))/V(10)==28 and 100*F(10-8,10)==20
# No curve above is claimed as an actual apparatus measurement.
def atoms(side):
 result=collections.Counter()
 for coefficient,composition in side:
  for atom,count in composition.items():result[atom]+=coefficient*count
 return dict(result)
checks=[([(2,{'Mg':1}),(1,{'O':2})],[(2,{'Mg':1,'O':1})]), ([(2,{'H':2}),(1,{'O':2})],[(2,{'H':2,'O':1})]), ([(1,{'S':1}),(1,{'O':2})],[(1,{'S':1,'O':2})]), ([(1,{'S':8}),(8,{'O':2})],[(8,{'S':1,'O':2})]), ([(1,{'P':4}),(5,{'O':2})],[(1,{'P':4,'O':10})]), ([(1,{'Cu':1,'C':1,'O':3})],[(1,{'Cu':1,'O':1}),(1,{'C':1,'O':2})]), ([(1,{'Cu':2,'C':1,'O':5,'H':2})],[(2,{'Cu':1,'O':1}),(1,{'C':1,'O':2}),(1,{'H':2,'O':1})]), ([(1,{'C':1,'O':2}),(1,{'Ca':1,'O':2,'H':2})],[(1,{'Ca':1,'C':1,'O':3}),(1,{'H':2,'O':1})])]
assert all(atoms(left)==atoms(right) for left,right in checks)
assert atoms([(1,{'Mg':1}),(1,{'O':2})])!=atoms([(1,{'Mg':1,'O':1})])
assert F(48,100)/24*(24+16)==F(80,100)
assert F(124,100)/124*80==F(80,100) and F(124,100)/124*44==F(44,100)
assert F(80,100)+F(44,100)==F(124,100)
assert 240-237==3 and 240-240==0 # energy-gain rates do not supply temperatures
# Original old drawing retained: whole gas volume, not syringe-only, is labelled.
root=ET.fromstring(Path('public/diagrams/chemistry-oxygen-volume.svg').read_text());ns={'s':'http://www.w3.org/2000/svg'}
labels={(int(e.attrib['x']),int(e.attrib['y'])):''.join(e.itertext()) for e in root.findall('.//s:text',ns)}
def number_at(x,y):return int(re.search(r': ([0-9]+) cm³',labels[(x,y)]).group(1))
start=sum(number_at(58,y) for y in [181,211,241]);end=sum(number_at(488,y) for y in [181,211,241])
assert start==number_at(58,293)==100 and end==number_at(488,293)==79
assert labels[(60,374)]=='Gas removed: 100 − 79 = 21 cm³'
assert labels[(60,408)]=='Oxygen estimate: 21 ÷ 100 × 100 = 21%'
assert start-end==21 and 100*F(start-end,start)==21
print('volume denominators, endpoint/T/geometry contrasts, composition and eight balanced reactions verified')
`], { encoding: 'utf8' });
  assert.equal(output.trim(), 'volume denominators, endpoint/T/geometry contrasts, composition and eight balanced reactions verified');
});
