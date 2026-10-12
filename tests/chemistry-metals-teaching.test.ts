import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-metal-extraction-uses-2026-10-12.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-metal-extraction-uses.json' with { type: 'json' };

void test('six metal extraction points retain Paper 2C scope and distinct authored versus exam readiness', () => {
  assert.equal(review.points.length, 6);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 28);
  assert.deepEqual(inventory.points.map((p) => p.reference), ['2.22C', '2.23C', '2.24C', '2.25C', '2.26C', '2.27C']);
  assert.ok(inventory.points.every((p) => p.components.length === 1 && p.components[0] === '2C'));
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.equal(review.humanReviewed, false);
  const process = review.points.find((p) => p.pointId.endsWith(':2.24C'))!;
  assert.match(process.requirements[4].judgement, /detailed specific extraction processes not required/);
});

void test('actual metal lessons conserve formulae and charge; supplied recoveries, percentages and distorted model have independent fixtures', () => {
  const result = execFileSync('python3', ['-c', `
import sys,re,collections,xml.etree.ElementTree as ET
from fractions import Fraction as F
sys.path.insert(0,'scripts');from note_io import read_note
n=read_note('content/notes/chemistry-inorganic.json');s={p['id']:p for p in n['sections']}
ids=['ore-species-transfer-evidence','extraction-route-transfer-evidence','extraction-comparison-transfer-evidence','metal-property-choice-evidence','steel-choice-transfer-evidence','alloy-fraction-transfer-evidence','alloy-model-transfer-evidence']
assert all(s[id].get('example') and s[id].get('practice') for id in ids)
assert not n['complete'] and not n['humanReviewed']
def atoms_side(expression):
 out=collections.Counter()
 for term in expression.split(' + '):
  coefficient,formula=re.fullmatch(r'([0-9]*)(.+)',term).groups();coefficient=int(coefficient or 1)
  formula=formula.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789'))
  for element,k in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula):out[element]+=coefficient*int(k or 1)
 return dict(out)
p=s['extraction-route-transfer-evidence']['paragraphs'][1]
equation=re.search(r'Fe₂O₃.+?CO₂',p).group()
left,right=equation.split(' → ')
assert atoms_side(left)==atoms_side(right)=={'Fe':2,'C':3,'O':6}
assert atoms_side('Fe2O3 + CO')!=atoms_side('Fe + CO2')
half=re.search(r'2Al³⁺.*?2Al',s['extraction-route-transfer-evidence']['practice']['answer']).group()
left,right=half.split(' → ')
assert left=='2Al³⁺ + 6e⁻' and right=='2Al'
assert 2*3-6==0
# Exact independent supplied-data accounting, including unfamiliar C and concentration.
iron_fraction=F(2*56,2*56+3*16)
assert iron_fraction==F(7,10)
cases=[(250,F(1,5),F(4,5),140,35,28,5),(200,F(3,10),F(3,4),189,42,F(63,2),6),(80,F(1,4),F(9,10),F(378,5),14,F(63,5),6)]
for ore,grade,recovery,energy,theory,actual,normalized in cases:
 assert ore*grade*iron_fraction==theory
 assert theory*recovery==actual and energy/actual==normalized
text=' '.join(s['extraction-comparison-transfer-evidence']['paragraphs'])+' '+s['extraction-comparison-transfer-evidence']['practice']['answer']
assert all(v in text for v in ['35 kg','28 kg','31.5 kg','14 kg','12.6 kg','5 MJ','6 MJ'])
assert F(40,200)*100==20 and F(40,100)*100==40
assert F(30,150-60)*100==F(100,3)
assert '33⅓%' in s['ore-species-transfer-evidence']['practice']['answer']
assert [50*d for d in [F(27,10),F(224,25)]]==[135,448]
assert all(str(v)+' g' in s['metal-property-choice-evidence']['practice']['answer'] for v in [135,448])
mass=F(5,2);chromium=mass*F(12,100);carbon=mass*F(8,1000);iron=mass-chromium-carbon
assert [chromium,carbon,iron,iron/mass*100]==[F(3,10),F(1,50),F(109,50),F(436,5)]
assert F(4,1000)*3==F(12,1000) and F(32,20)==F(8,5)
assert '1.6' in s['alloy-model-transfer-evidence']['practice']['answer']
# Inspect the retained drawing, not an invented shadow geometry.
ns={'s':'http://www.w3.org/2000/svg'};svg=ET.parse('public/diagrams/chemistry-alloy-hardness.svg').getroot()
uses=svg.findall('.//s:use',ns);pure=[u for u in uses if float(u.attrib['x'])<447];alloy=[u for u in uses if float(u.attrib['x'])>498]
assert len(pure)==15 and len(alloy)==14
assert sorted({float(u.attrib['y']) for u in pure})==[159,219,279]
assert all(u.attrib['href']=='#atom' for u in pure+alloy)
atoms=svg.findall('.//s:circle',ns)
assert len(atoms)==2 and float(atoms[0].attrib['r'])==25 and float(atoms[1].attrib['r'])==38
assert float(atoms[1].attrib['cx'])==700 and float(atoms[1].attrib['cy'])==219
assert {float(u.attrib['y']) for u in alloy}!={159,219,279}
steel=' '.join(s['steel-choice-transfer-evidence']['paragraphs'])
assert 'chromium-rich oxide' in steel and 'not compulsory' in steel and 'not automatically tougher' in steel
assert 'water can compete' in ' '.join(s['extraction-route-transfer-evidence']['paragraphs'])
print('actual formulae, charge, supplied mass/recovery/energy and SVG geometry verified')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'actual formulae, charge, supplied mass/recovery/energy and SVG geometry verified');
});
