import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import acids from '../research/teaching-reviews/4CH1-acids-salts-2026-10-12.json' with { type: 'json' };
import tests from '../research/teaching-reviews/4CH1-chemical-tests-2026-10-12.json' with { type: 'json' };
import acidInventory from '../research/syllabus/4CH1-acids-salts.json' with { type: 'json' };
import source from '../research/reviews/2026-10-12-CHEMICAL-TESTS-TEACHING-SOURCE.json' with { type: 'json' };

void test('twenty-three authored identities retain component, practical and evidence-link boundaries', () => {
  assert.equal(acids.points.length, 16); assert.equal(tests.points.length, 7);
  assert.equal(acids.points.reduce((sum, p) => sum + p.requirements.length, 0), 61);
  assert.equal(tests.points.reduce((sum, p) => sum + p.requirements.length, 0), 30);
  assert.deepEqual(acidInventory.points.filter((p) => p.components.length === 1).map((p) => p.reference), ['2.33C', '2.40C', '2.41C', '2.43C']);
  assert.deepEqual(acidInventory.points.find((p) => p.reference === '2.42')!.components, ['1C', '2C']);
  for (const r of [acids, tests]) {
    assert.equal(r.practicalTrialsPerformed, false);
    assert.equal(r.examTemplateCalibrationComplete, false);
    assert.equal(r.humanReviewed, false);
  }
  assert.deepEqual(source.evidenceLinkRepairs.map((r) => r.requirementId), ['4CH1:issue3:2.47:r5', '4CH1:issue3:2.48:r7', '4CH1:issue3:2.50:r4']);
});

void test('actual acid/test practice equations balance; delivered-volume and colour/inference fixtures remain independent', () => {
  const output = execFileSync('python3', ['-c', `
import sys,re,collections,json
from decimal import Decimal as D
sys.path.insert(0,'scripts');from note_io import read_note
n=read_note('content/notes/chemistry-inorganic.json');s={s['id']:s for s in n['sections']}
ids=[id for id in s if id.startswith(('acid-','salt-','test-')) and '2.21' not in s[id]['points']]
assert len(ids)==34 and all(s[id].get('example') and s[id].get('practice') for id in ids)
assert not n['complete'] and not n['humanReviewed']
def atoms(formula):
 formula=formula.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789'))
 tokens=re.findall(r'[A-Z][a-z]?|[0-9]+|[(]|[)]',formula);stack=[collections.Counter()];i=0
 while i<len(tokens):
  t=tokens[i]
  if t=='(':stack.append(collections.Counter());i+=1;continue
  if t==')':
   block=stack.pop();i+=1;k=int(tokens[i]) if i<len(tokens) and tokens[i].isdigit() else 1
   if i<len(tokens) and tokens[i].isdigit():i+=1
   for a,v in block.items():stack[-1][a]+=v*k
   continue
  assert not t.isdigit();i+=1;k=int(tokens[i]) if i<len(tokens) and tokens[i].isdigit() else 1
  if i<len(tokens) and tokens[i].isdigit():i+=1
  stack[-1][t]+=k
 assert len(stack)==1
 return dict(stack[0])
def side(expression):
 counts=collections.Counter();charge=0
 for term in expression.split(' + '):
  term=re.sub(r'[(](aq|s|l|g)[)]','',term)
  c,f=re.fullmatch(r'([0-9]*)(.+)',term).groups();c=int(c or 1)
  suffix=re.search(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])$',f)
  if suffix:
   magnitude=suffix.group(1).translate(str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹','0123456789'));charge+=c*int(magnitude or 1)*(1 if suffix.group(2)=='⁺' else -1);f=f[:suffix.start()]
  for a,v in atoms(f).items():counts[a]+=c*v
 return dict(counts),charge
equations=[]
equations.extend(s['acid-base-salts']['practice']['answer'].split('. ')[0].split('; '))
equations.extend(s['acid-metal-salts']['practice']['answer'].split('. ')[0].split('; '))
equations.append(s['acid-carbonate-salts']['practice']['answer'].split('. ')[0])
equations.extend(s['salt-lead-sulfate']['practice']['answer'].split('. ')[0].split('; '))
for id,start,end in [('test-metal-hydroxides','Cu²⁺: ','. B'),('test-metal-hydroxides','Fe²⁺: ','; later'),('test-metal-hydroxides','Fe³⁺: ','. Name'),('test-ammonium','supported: ','. Atoms')]:
 equations.append(s[id]['practice']['answer'].split(start,1)[1].split(end,1)[0])
equations.append(s['test-halide-ions']['practice']['answer'].split('. ')[1])
equations.append(s['test-sulfate-ions']['practice']['answer'].split('Ba²⁺ + ',1)[1].split('; ',1)[0]);equations[-1]='Ba²⁺ + '+equations[-1]
equations.append(s['test-carbonate-ions']['practice']['answer'].split('. ')[1].split(' conserves')[0])
equations.append(s['test-carbon-dioxide']['practice']['answer'].split(': ',1)[1].split('. ',1)[0])
for eq in equations:
 left,right=eq.split(' → ');assert side(left)==side(right),eq
assert side('Mg(OH)2 + HNO3')!=side('Mg(NO3)2 + 2H2O')
assert side('Pb2SO4')!=side('PbSO4')
# Unfamiliar titration readings are accounted for independently, not rounded binary-float equality.
initial=list(map(D,['3.20','1.10','2.00']));final=list(map(D,['28.00','26.00','26.85']))
titres=[b-a for a,b in zip(initial,final)]
assert titres==list(map(D,['24.80','24.90','24.85']))
assert max(titres)-min(titres)==D('.10') and sum(titres)/3==D('24.85')
assert 'mean = 24.85' in s['acid-titration-results']['practice']['answer']
acid_amount=D('10.0')/1000*D('.10')
assert acid_amount/D('.10')*1000==D('10.0') and 2*acid_amount/D('.10')*1000==D('20.0')
assert D('98.5')-D('98.4')==D('.1')<D('.2')
assert '0.1 °C difference' in s['test-water-purity']['practice']['answer']
pairs=re.findall(r'(Li⁺|Na⁺|K⁺|Ca²⁺|Cu²⁺): ([^;]+)',s['test-flame-colours']['paragraphs'][0].split('. Use')[0].split('are ')[1])
assert pairs==[('Li⁺','red'),('Na⁺','yellow'),('K⁺','lilac'),('Ca²⁺','orange-red'),('Cu²⁺','blue-green')]
for id in ['acid-titration-method','salt-copper-hydrated','salt-lead-sulfate']:
 assert all(s[id]['practical'].get(k) for k in ['apparatus','method','variables','safety','quality'])
assert 'contact with fresh white anhydrous' in s['test-water-presence']['paragraphs'][0]
assert 'filter paper to dry' in s['salt-lead-sulfate']['paragraphs'][1]
print('actual practice formulae/charges, titres, stoichiometry, colour pairs and repaired operations verified')
`], { encoding: 'utf8' });
  assert.equal(output.trim(), 'actual practice formulae/charges, titres, stoichiometry, colour pairs and repaired operations verified');
});
