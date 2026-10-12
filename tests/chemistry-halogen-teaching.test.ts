import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-halogen-reactivity-2026-10-12.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-halogen-reactivity.json' with { type: 'json' };
import previous from '../research/reviews/2026-10-09-HALOGEN-REACTIVITY-READINESS.json' with { type: 'json' };

void test('two halogen identities have ten authored decisions without practical or exam activation', () => {
  assert.equal(review.points.length, 2);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 10);
  assert.deepEqual(inventory.points.find((p) => p.reference === '2.7')!.components, ['1C', '2C']);
  assert.deepEqual(inventory.points.find((p) => p.reference === '2.8C')!.components, ['2C']);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete'));
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.equal(previous.structuredFixedPracticeCount, 0);
  assert.ok(previous.preservedGates.every((p) => p.complete === false));
});

void test('actual nine-cell drawing, unfamiliar ranking, conservation and ionic electron totals agree', () => {
  const output = execFileSync('python3', ['-c', `
import json,itertools,collections,re,xml.etree.ElementTree as ET
from pathlib import Path
n=json.loads(Path('content/notes/chemistry-inorganic.json').read_text()); sections={s['id']:s for s in n['sections']}
ids=['halogen-ranking-transfer-evidence','halogen-species-and-charge-evidence','halogen-observation-control-evidence','halogen-electron-gain-transfer-evidence']
assert all(sections[id].get('practice') and sections[id].get('example') for id in ids)
assert n['complete']==False and n['humanReviewed']==False
root=ET.fromstring(Path('public/diagrams/chemistry-halogen-displacement.svg').read_text());ns={'s':'http://www.w3.org/2000/svg'}
cells={(int(e.attrib['x']),int(e.attrib['y'])):''.join(e.itertext()) for e in root.findall('.//s:text',ns) if e.attrib.get('x') in ['350','510','670'] and e.attrib.get('y') in ['200','280','360']}
assert len(cells)==9
# Row=added element, column=starting halide; actual SVG labels independently read.
order=['Cl','Br','I']
for r,added in enumerate(order):
 for c,halide in enumerate(order):
  text=cells[(350+c*160,200+r*80)]
  assert text==(halide+'₂formed' if r<c else 'Nodisplacement'),(added,halide,text)
assert len(root.findall('.//s:rect',ns))==10 # background plus nine outcomes
# A ranking must satisfy every directed piece of evidence; contradictions do not receive an invented answer.
def rankings(edges):
 return [p for p in itertools.permutations('PQR') if all(p.index(a)<p.index(b) for a,b in edges)]
assert rankings([('Q','P'),('R','Q'),('R','P')])==[('R','Q','P')]
assert rankings([('P','Q'),('Q','R'),('R','P')])==[]
assert len(rankings([('P','Q')]))==3 # incomplete evidence is not a unique order
# Atom/charge conservation cannot decide which direction occurs.
def total(side):
 atoms=collections.Counter();charge=0
 for coeff,formula,q in side:
  charge+=coeff*q
  for element,count in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula):atoms[element]+=coeff*int(count or 1)
 return dict(atoms),charge
for added,halide in [('Cl','Br'),('Cl','I'),('Br','I')]:
 left=[(1,added+'2',0),(2,halide,-1)];right=[(2,added,-1),(1,halide+'2',0)]
 assert total(left)==total(right)
 assert total(left)[1]==-2
 assert total(right)==total(left) # reversed conservation still works; chemistry ranking is a separate gate
assert total([(1,'Br2',0),(1,'I',-1)])!=total([(1,'Br',-1),(1,'I2',0)])
assert total([(1,'Cl2',0),(2,'NaI',0)])==total([(2,'NaCl',0),(1,'I2',0)])
for config,Z in [([2,8,7],17),([2,8,18,7],35),([2,8,18,18,7],53)]:
 assert sum(config)==Z and config[-1]==7
 assert Z-(sum(config)+1)==-1
assert 2*35+2==2*36 and -2==2*(-1)
assert -1!=2*(-1) # proposed single-electron molecular equation fails charge
print('actual SVG nine cells, consistent/incomplete/cyclic ranks, atoms/charge and electrons verified')
`], { encoding: 'utf8' });
  assert.equal(output.trim(), 'actual SVG nine cells, consistent/incomplete/cyclic ranks, atoms/charge and electrons verified');
});
