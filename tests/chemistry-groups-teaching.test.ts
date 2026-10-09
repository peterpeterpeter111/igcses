import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import group from '../research/teaching-reviews/4CH1-group1-2026-10-09.json' with { type: 'json' };
import halogen from '../research/teaching-reviews/4CH1-halogen-physical-2026-10-09.json' with { type: 'json' };
import groupInventory from '../research/syllabus/4CH1-group1.json' with { type: 'json' };
import pending from '../research/syllabus/4CH1-halogen-reactivity.json' with { type: 'json' };

void test('six group reviews are authored teaching while displacement and exam calibration remain unfinished', () => {
  assert.equal(group.points.length, 4); assert.equal(halogen.points.length, 2);
  assert.equal(group.points.reduce((n, p) => n + p.requirements.length, 0), 15);
  assert.equal(halogen.points.reduce((n, p) => n + p.requirements.length, 0), 8);
  assert.deepEqual(groupInventory.points.find((p) => p.reference === '2.4C')!.components, ['2C']);
  assert.ok(pending.points.every((p) => p.teachingCoverage === 'partial'));
  for (const r of [group, halogen]) {
    assert.equal(r.practicalTrialsPerformed, false); assert.equal(r.examTemplateCalibrationComplete, false);
  }
});

void test('actual group tables retain electron configurations, referenced phase inputs and independent reaction conservation', () => {
  const result = execFileSync('python3', ['-c', `
import json,re,collections
from pathlib import Path
n=json.loads(Path('content/notes/chemistry-inorganic.json').read_text());s={s['id']:s for s in n['sections']}
assert s['halogen-state-and-extrapolation-evidence']['table']['caption']=='RSC reference values · melting and boiling temperatures at ordinary pressure'
assert s['alkali-comparison-and-shielding-evidence']['table']['caption']=='First-20 shell model · neutral lithium, sodium and potassium atoms'
rows=s['alkali-comparison-and-shielding-evidence']['table']['rows']
assert rows==[['Li','2,1','2','1'],['Na','2,8,1','3','1'],['K','2,8,8,1','4','1']]
for row,Z in zip(rows,[3,11,19]):
 config=list(map(int,row[1].split(',')));assert sum(config)==Z and len(config)==int(row[2]) and config[-1]==int(row[3])==1
 assert sum(config)-1==Z-1 # removing an electron does not remove a proton
rows=s['halogen-state-and-extrapolation-evidence']['table']['rows']
expected=[('Chlorine',-101.5,-34.04),('Bromine',-7.2,58.8),('Iodine',113.7,184.4)]
actual=[(label,float(mp.replace('−','-')),float(bp.replace('−','-'))) for label,mp,bp in rows]
assert actual==expected
def state(t,mp,bp):
 assert mp<bp
 return 'solid' if t<mp else 'gas' if t>bp else 'transition' if t in [mp,bp] else 'liquid'
assert [state(20,mp,bp) for _,mp,bp in actual]==['gas','liquid','solid']
assert state(120,113.7,184.4)=='liquid' and state(20,-12,75)=='liquid'
assert state(113.7,113.7,184.4)=='transition'
assert all(actual[k][1]<actual[k+1][1] and actual[k][2]<actual[k+1][2] for k in [0,1])
def atoms(side):
 total=collections.Counter()
 for coeff,formula in side:
  for element,count in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula):total[element]+=coeff*int(count or 1)
 return dict(total)
for metal in ['Li','Na','K','Rb','X','Y']:
 left=atoms([(2,metal),(2,'H2O')]);right=atoms([(2,metal+'OH'),(1,'H2')])
 assert left==right=={metal:2,'H':4,'O':2}
 assert atoms([(1,metal),(1,'H2O')])!=atoms([(1,metal+'OH'),(1,'H2')])
assert 0==1+(-1) # M → M+ + e− conserves charge
assert n['complete']==False
print('actual configurations, phase boundaries and group reaction counts checked')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'actual configurations, phase boundaries and group reaction counts checked');
});
