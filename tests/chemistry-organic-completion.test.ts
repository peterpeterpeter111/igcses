import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import note from '../content/notes/chemistry-organic.json' with { type: 'json' };
import foundation from '../research/teaching-reviews/4CH1-organic-foundations-2026-10-15.json' with { type: 'json' };
import families from '../research/syllabus/4CH1-organic-families-polymers.json' with { type: 'json' };

void test('whole Organic authored coverage retains exact C-only scope and concrete drawing demands', () => {
  assert.equal(note.sections.length, 51); assert.ok(note.sections.every((s) => s.example && s.practice));
  assert.equal(note.complete, false); assert.equal(note.humanReviewed, false);
  assert.equal(foundation.points.length, 28); assert.equal(foundation.examTemplateCalibrationComplete, false);
  assert.deepEqual(families.points.filter((p) => p.components.length === 2).map((p) => p.reference), ['4.44', '4.45', '4.46', '4.47']);
  assert.equal(families.points.filter((p) => p.components.length === 1).length, 18);
  for (const id of ['alkane-drawings', 'alkane-branched-isomers', 'alkene-drawings', 'alcohol-drawings', 'carboxylic-drawings', 'ethyl-ethanoate-drawing', 'addition-repeat-drawings', 'polyester-repeat-drawing'])
    assert.match(note.sections.find((s) => s.id === id)!.practice!.question, /[Dd]raw/);
  assert.match(note.sections.find((s) => s.id === 'ester-practical-plan')!.paragraphs[0], /such as ethyl ethanoate/);
});

void test('actual new route equations, salt charges and finite polymer water counts conserve source quantities', () => {
  const output = execFileSync('python3', ['-c', `
import json,re,collections
from decimal import Decimal as D
s={s['id']:s for s in json.load(open('content/notes/chemistry-organic.json'))['sections']}
def atoms(formula):
 tokens=re.findall(r'[A-Z][a-z]?|[0-9]+|[(]|[)]',formula);stack=[collections.Counter()];i=0
 while i<len(tokens):
  t=tokens[i];i+=1
  if t=='(':stack.append(collections.Counter());continue
  if t==')':block=stack.pop()
  else:block=collections.Counter({t:1})
  factor=int(tokens[i]) if i<len(tokens) and tokens[i].isdigit() else 1
  if i<len(tokens) and tokens[i].isdigit():i+=1
  for atom,count in block.items():stack[-1][atom]+=count*factor
 assert len(stack)==1
 return stack[0]
def side(text):
 total=collections.Counter()
 for term in text.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789')).split(' + '):
  k,f=re.fullmatch(r'([0-9]*)(.+)',term).groups()
  for atom,count in atoms(f).items():total[atom]+=int(k or 1)*count
 return total
eq=[]
eq.append(s['alkane-monosubstitution']['practice']['answer'].split(', with')[0])
eq.append(s['ethanol-combustion']['practice']['answer'].split('. ')[0])
eq.append(s['ethyl-ethanoate-formation']['practice']['answer'].split('CH₃COOH + ')[1].split(', conserving')[0]);eq[-1]='CH₃COOH + '+eq[-1]
for id,start in [('carboxylic-metal-reaction','2CH₃CH₂COOH'),('carboxylic-carbonate-reaction','2CH₃COOH')]:
 eq.append(start+s[id]['practice']['answer'].split(start,1)[1].split('. ')[0])
for equation in eq:
 left,right=re.split(' → | ⇌ ',equation);assert side(left)==side(right),equation
assert side('CH3CH3 + Cl2')!=side('CH3CH2Cl')
assert D('.300')*2==D('.600') and '0.600 mol' in s['ethanol-fermentation']['practice']['answer']
assert 'Mg²⁺ needs two singly negative' in s['carboxylic-metal-reaction']['practice']['answer']
assert 'two ethanoate ions balance Ca²⁺' in s['carboxylic-carbonate-reaction']['practice']['answer']
assert atoms('C2H2O4')+atoms('C2H6O2')==atoms('C4H4O4')+side('2H2O')
for n in [1,2,5,10]:assert (n+n)-1==2*n-1
assert '2n−1' in s['polyester-repeat-drawing']['practice']['answer']
assert 'concentrated sulfuric acid' in s['ester-practical-plan']['practice']['answer']
assert all(s['ester-practical-plan']['practical'].get(k) for k in ['apparatus','method','variables','safety','quality'])
print('five actual task equations, ionic stoichiometry, ideal amount and repeat-water distinctions verified')
`], { encoding: 'utf8' });
  assert.match(output, /five actual task equations/);
});

void test('actual fully displayed molecule sheets preserve every atom and correct accessible scope', () => {
  const output = execFileSync('python3', ['-c', `
import collections,xml.etree.ElementTree as E
expected={'alkane-displayed':dict(C=15,H=40),'branched-alkanes':dict(C=14,H=34),'alkene-displayed':dict(C=17,H=34),'alcohol-displayed':dict(C=10,H=28,O=4),'carboxylic-displayed':dict(C=10,H=20,O=8),'ethyl-ethanoate':dict(C=4,H=8,O=2),'addition-repeats':dict(C=9,H=13,Cl=1,F=4),'polyester-repeat':dict(C=8,H=12,O=10)}
for name,counts in expected.items():
 root=E.parse('public/diagrams/chemistry-'+name+'.svg').getroot()
 actual=collections.Counter(t.text for t in root.findall('{http://www.w3.org/2000/svg}text') if t.text in ['C','H','O','Cl','F'])
 assert dict(actual)==counts,(name,actual,counts)
 if name in ['alcohol-displayed','carboxylic-displayed','ethyl-ethanoate']:
  assert 'Polymer bonds' not in root.find('{http://www.w3.org/2000/svg}desc').text
print('eight actual model sheets have independent formula totals and corrected molecular descriptions')
`], { encoding: 'utf8' });
  assert.match(output, /eight actual model sheets/);
});
