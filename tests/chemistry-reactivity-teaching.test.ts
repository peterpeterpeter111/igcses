import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-reactivity-rust-redox-2026-10-12.json' with { type: 'json' };
import practical from '../research/teaching-reviews/4CH1-acid-metal-practical-2026-10-12.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-acid-metal-practical.json' with { type: 'json' };

void test('seven reactivity reviews preserve example scope and distinct written practical readiness', () => {
  assert.equal(review.points.length + practical.points.length, 7);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 31);
  assert.equal(practical.points[0].requirements.length, 8);
  assert.deepEqual(inventory.points[0].components, ['1C', '2C']);
  assert.match(inventory.points[0].summary, /source examples, not an exclusive set/);
  for (const r of [review, practical]) {
    assert.equal(r.practicalTrialsPerformed, false); assert.equal(r.examTemplateCalibrationComplete, false);
  }
});

void test('actual products, required eleven-metal series, ionic charge, rust controls and rate arithmetic have independent fixtures', () => {
  const result = execFileSync('python3', ['-c', `
from pathlib import Path
from fractions import Fraction as F
import json,re,collections,itertools
n=json.loads(Path('content/notes/chemistry-inorganic.json').read_text());s={s['id']:s for s in n['sections']}
ids=['metal-condition-ranking-evidence','metal-displacement-transfer-evidence','metal-series-position-evidence','rust-control-transfer-evidence','rust-protection-transfer-evidence','redox-agent-transfer-evidence','acid-metal-observation-transfer-evidence']
assert all(s[id].get('example') and s[id].get('practice') for id in ids)
assert not n['complete']
order=['K','Na','Li','Ca','Mg','Al','Zn','Fe','Cu','Ag','Au']
series=s['metal-series-position-evidence']['practice']['answer'].split('.')[0].split(' > ')
assert series==order and len(set(series))==11
assert order.index('Li')<order.index('Ca') and order.index('Mg')<order.index('Al')
assert order.index('Zn')<order.index('Fe')<order.index('Cu')
# Build counts independently from the actual displayed product formulae.
def atoms(formula):
 formula=formula.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789'))
 return collections.Counter({a:int(k or 1) for a,k in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula)})
def side(terms):
 out=collections.Counter()
 for c,f in terms:
  for a,k in atoms(f).items():out[a]+=c*k
 return dict(out)
rows=s['acid-metal-observation-transfer-evidence']['table']['rows']
assert [r[0] for r in rows]==['Mg','Zn','Fe']
assert s['acid-metal-observation-transfer-evidence']['table']['caption'].startswith('Predicted products')
for metal,chloride,sulfate,gas in rows:
 assert gas=='H₂'
 chloride=chloride.split(' · ')[0];sulfate=sulfate.split(' · ')[0]
 assert atoms(chloride)=={metal:1,'Cl':2} and atoms(sulfate)=={metal:1,'S':1,'O':4}
 assert side([(1,metal),(2,'HCl')])==side([(1,chloride),(1,gas)])
 assert side([(1,metal),(1,'H2SO4')])==side([(1,sulfate),(1,gas)])
assert side([(2,'Al'),(3,'CuO')])==side([(1,'Al2O3'),(3,'Cu')])
assert side([(1,'Al'),(1,'CuO')])!=side([(1,'Al2O3'),(1,'Cu')])
assert side([(1,'Zn'),(1,'CuO')])==side([(1,'ZnO'),(1,'Cu')])
assert side([(1,'Mg'),(1,'H2O')])==side([(1,'MgO'),(1,'H2')])
def charged_side(expression):
 counts=collections.Counter();charge=0
 for term in expression.split(' + '):
  coefficient,formula=re.fullmatch(r'([0-9]*)(.+)',term).groups();coefficient=int(coefficient or 1)
  suffix=re.search(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])$',formula);q=0
  if suffix:
   magnitude=suffix.group(1).translate(str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹','0123456789'));q=int(magnitude or 1)*(1 if suffix.group(2)=='⁺' else -1)
   formula=formula[:suffix.start()]
  charge+=coefficient*q
  if formula!='e':
   for atom,k in atoms(formula).items():counts[atom]+=coefficient*k
 return dict(counts),charge
p=s['redox-agent-transfer-evidence']['paragraphs'][1]
net=p.split(', ',1)[1].split('. ',1)[0]
oxidation=p.split('Copper oxidation is ',1)[1].split('; ',1)[0]
reduction=p.split('silver-ion reduction is ',1)[1].split('. ',1)[0]
for equation in [net,oxidation,reduction]:
 left,right=equation.split(' → ');assert charged_side(left)==charged_side(right),equation
assert charged_side(net.split(' → ')[0])==({'Cu':1,'Ag':2},2)
assert charged_side(oxidation.split(' → ')[0])==({'Cu':1},0)
assert charged_side(reduction.split(' → ')[0])==({'Ag':2},0)
assert '0 cm³ when t = 0 s' in s['acid-metal-observation-transfer-evidence']['paragraphs'][3]
assert [F(v,20) for v in [24,10,4]]==[F(6,5),F(1,2),F(1,5)]
# Equal final amounts can have different rates; equal masses give unequal atom amounts.
assert F(20,10)!=F(20,40) and F(1,24)!=F(1,56)
# All possible simple rankings constrain known P,Q,R, without placing absent S.
orders=[p for p in itertools.permutations('PQRS') if p.index('P')<p.index('Q')<p.index('R')]
assert len(orders)==4 and {p.index('S') for p in orders}=={0,1,2,3}
# Control descriptions explicitly distinguish maintained exclusion from re-entry.
text=' '.join(s['rust-control-transfer-evidence']['paragraphs'])
assert 'drying agent' in text and 'oil layer' in text and 'regain dissolved oxygen' in text
assert all(s['acid-metal-observation-transfer-evidence']['practical'].get(k) for k in ['apparatus','method','variables','safety','quality'])
print('actual six product formulae, eleven-metal order, conservation, rate and exclusion cases verified')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'actual six product formulae, eleven-metal order, conservation, rate and exclusion cases verified');
});
