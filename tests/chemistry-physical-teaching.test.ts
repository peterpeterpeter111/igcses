import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import note from '../content/notes/chemistry-physical.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-physical.json' with { type: 'json' };
import review from '../research/teaching-reviews/4CH1-physical-2026-10-14.json' with { type: 'json' };

void test('Physical Chemistry preserves exact paper scope and separates authored from examiner readiness', () => {
  assert.equal(review.points.length, 22);
  assert.equal(review.points.reduce((sum, p) => sum + p.requirements.length, 0), 78);
  assert.deepEqual(inventory.points.filter((p) => p.components.length === 1).map((p) => p.reference),
    ['3.5C', '3.6C', '3.7C', '3.14C', '3.19C', '3.20C', '3.21C', '3.22C']);
  assert.equal(note.sections.length, 27);
  assert.ok(note.sections.every((s) => s.example && s.practice));
  assert.equal(note.complete, false); assert.equal(note.humanReviewed, false);
  assert.equal(review.practicalTrialsPerformed, false); assert.equal(review.examTemplateCalibrationComplete, false);
  assert.match(note.sections.find((s) => s.id === 'reversible-arrow')!.practice!.explanation, /separate dynamic-equilibrium rate criteria are Paper 2C/);
  assert.match(note.sections.find((s) => s.id === 'copper-water-reverse')!.paragraphs[2], /Optional Paper 2C/);
});

void test('actual calorimetry, tangent and profile tasks retain independently checked signs, bases and arrow directions', () => {
  const result = execFileSync('python3', ['-c', `
import json,re,xml.etree.ElementTree as E
from decimal import Decimal as D
n=json.load(open('content/notes/chemistry-physical.json'));s={s['id']:s for s in n['sections']}
assert D('75.0')*D('4.00')*(D('19.0')-D('23.0'))==D('-1200')
assert D('.900')/D('.0250')==D('36')
acid=D('.0200')*D('1.00');alkali=D('.0300')*D('1.00')
assert min(acid,alkali)==D('.0200') and alkali-acid==D('.0100')
assert -D('50.0')*D('4.00')*D('4.0')/1000/acid==D('-40')
assert -D('.700')/(D('.0250')*D('.200'))==D('-140')
fuel=D('.50')/D('32.0');assert -D('150')*D('4.00')*D('10.0')/1000/fuel==D('-384')
assert '−384 kJ' in s['fuel-calorimeter']['practice']['answer'] and '−3.8 × 10²' in s['fuel-calorimeter']['practice']['answer']
assert '−8.7 × 10²' in ' '.join(s['fuel-calorimeter']['example']['steps'])
assert 436+242-2*431==-184 and -184/2==-92
assert '−184' in s['bond-balance']['practice']['answer'] and '−92' in s['bond-balance']['practice']['answer']
assert (D('38')-8)/(D('25')-5)==D('1.5') and (D('52')-12)/(D('25')-5)==D('2')
assert D('18')/12==D('1.5') and D('18')/20==D('.90') and D('18')/60==D('.30')
assert 100-20==80 and 70-20==50 and 50-20==30
assert '80' in s['reaction-profile']['practice']['answer'] and '+30' in s['reaction-profile']['practice']['answer']
assert D('.4')/2*100==20 and D('.4')/8*100==5
for id in ['neutralization-calorimeter','marble-design','peroxide-solids']:
 assert all(s[id]['practical'].get(k) for k in ['apparatus','method','variables','safety','quality'])
# A compound path gets an end marker only at its final endpoint. Each scientific
# direction therefore needs its own path, rather than a visually missing arrowhead.
ns={'s':'http://www.w3.org/2000/svg'}
for name,expected in [('chemistry-energy-levels.svg',['M252 183 V287','M708 287 V183']),('chemistry-reaction-profile.svg',['M282 287 V143','M541 287 V218','M849 293 V422'])]:
 root=E.parse('public/diagrams/'+name).getroot()
 groups=[g for g in root.findall('s:g',ns) if g.get('marker-end')=='url(#arrow)']
 assert len(groups)==1
 paths=[p.get('d') for p in groups[0].findall('s:path',ns)]
 assert paths==expected and all(p.count('M')==1 for p in paths)
print('independent signed calculations, limiting amounts, rate/profile values and separate direction arrows verified')
`], { encoding: 'utf8' });
  assert.match(result, /separate direction arrows verified/);
});
