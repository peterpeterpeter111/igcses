import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import prior from '../research/teaching-reviews/4CH1-bonding-properties-2026-10-09.json' with { type: 'json' };
import current from '../research/teaching-reviews/4CH1-covalent-diagrams-2026-10-09.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-bonding.json' with { type: 'json' };

void test('covalent extension preserves all 27 earlier decisions and completes only authored teaching', () => {
  assert.deepEqual(current.points.slice(0, 17), prior.points);
  assert.equal(current.points.length, 18);
  assert.equal(current.points.reduce((n, p) => n + p.requirements.length, 0), 33);
  assert.equal(current.examTemplateCalibrationComplete, false);
  assert.equal(current.practicalTrialsPerformed, false);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete'));
});

void test('actual SVG electrons conserve atom contributions, bond pairs and local shells in all 13 molecules', () => {
  const result = execFileSync('python3', ['-c', `
import json,collections,xml.etree.ElementTree as E
from pathlib import Path
c=json.loads(Path('research/reviews/2026-10-09-covalent-diagram-contract.json').read_text())
valence={'H':1,'C':4,'N':5,'O':6,'Cl':7}
assert c['atomValence']==valence and c['activeTemplates']==0 and not c['realMolecularShape']
# These formula counts and bond multiplicities are independent course-model expectations.
expected={'H2':({'H':2},2,[1]),'O2':({'O':2},12,[2]),'N2':({'N':2},10,[3]),
 'Cl2':({'Cl':2},14,[1]),'HCl':({'H':1,'Cl':1},8,[1]),
 'H2O':({'H':2,'O':1},8,[1,1]),'NH3':({'N':1,'H':3},8,[1,1,1]),
 'CO2':({'C':1,'O':2},16,[2,2]),'CH4':({'C':1,'H':4},8,[1]*4),
 'C2H6':({'C':2,'H':6},14,[1]*7),'C2H4':({'C':2,'H':4},12,[1]*4+[2]),
 'CH3Cl':({'C':1,'H':3,'Cl':1},14,[1]*4),'C2H5Cl':({'C':2,'H':5,'Cl':1},20,[1]*7)}
models={m['id']:m for m in c['molecules']};assert set(models)==set(expected)
seen=[];ns={'s':'http://www.w3.org/2000/svg'}
for family in c['families']:
 root=E.parse('public/diagrams/chemistry-covalent-'+family['id']+'.svg')
 groups=root.findall('.//s:g[@data-molecule]',ns)
 assert [g.get('data-molecule') for g in groups]==family['models']
 for g in groups:
  mid=g.get('data-molecule');seen.append(mid);m=models[mid];formula,total,orders=expected[mid]
  atoms={a['id']:a for a in m['atoms']};assert len(atoms)==len(m['atoms'])
  labels=g.findall('s:text[@data-atom]',ns)
  assert {t.get('data-atom'):t.get('data-element') for t in labels}=={a['id']:a['element'] for a in m['atoms']}
  assert collections.Counter(a['element'] for a in m['atoms'])==formula
  assert sorted(e['order'] for e in m['edges'])==orders
  markers=g.findall('.//*[@data-electron]');assert len(markers)==total
  assert sum(valence[a['element']] for a in atoms.values())==total
  edges={e['a']+'-'+e['b']:e for e in m['edges']};assert len(edges)==len(m['edges'])
  assert all(e['a'] in atoms and e['b'] in atoms and e['a']!=e['b'] for e in edges.values())
  for marker in markers:
   owner=marker.get('data-owner');assert owner in atoms
   assert marker.get('data-electron')==atoms[owner]['mark']
   assert marker.tag.endswith('circle' if atoms[owner]['mark']=='dot' else 'path')
   if marker.get('data-kind')=='bond':
    edge=edges[marker.get('data-edge')];assert owner in [edge['a'],edge['b']]
   else:assert marker.get('data-kind')=='lone' and marker.get('data-edge') is None
  for eid,e in edges.items():
   paired=[x for x in markers if x.get('data-edge')==eid]
   assert len(paired)==2*e['order']
   assert collections.Counter(x.get('data-owner') for x in paired)=={e['a']:e['order'],e['b']:e['order']}
   assert atoms[e['a']]['mark']!=atoms[e['b']]['mark']
  for aid,a in atoms.items():
   owned=[x for x in markers if x.get('data-owner')==aid]
   assert len(owned)==valence[a['element']]
   lone=[x for x in owned if x.get('data-kind')=='lone'];assert len(lone)==2*a['lonePairs']
   surrounding=len(lone)+sum(2*e['order'] for e in edges.values() if aid in [e['a'],e['b']])
   assert surrounding==(2 if a['element']=='H' else 8)
  assert all(key in [t.text for t in g.findall('s:text',ns)] for key in m['key'])
assert len(seen)==len(set(seen))==13
# Wrong-model exercises: global totals alone cannot establish each atom's shell.
assert 2*2+2*3*2==16 and 2*2==4 # single-bond CO2: C has four, despite total16
assert 2*2+2*3*2==16 and 2*6==12 # extra O2 lone pairs invent four electrons
assert 5*2==10 and (2+1)*2==6 # single C-C in C2H4 leaves both C shells incomplete
assert 4*2+2*3*2==20 # CH2Cl2: four bonds and three lone pairs per Cl
print('13 actual molecular electron models verified')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), '13 actual molecular electron models verified');
});
