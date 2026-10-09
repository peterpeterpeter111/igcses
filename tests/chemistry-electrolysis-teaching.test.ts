import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-electrolysis-2026-10-09.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-electrolysis.json' with { type: 'json' };
import notes from '../content/notes/chemistry.json' with { type: 'json' };

void test('electrolysis review remains Paper2C authored teaching with actual trials and calibration incomplete', () => {
  assert.equal(review.points.length, 6);
  assert.equal(review.points.reduce((n, p) => n + p.requirements.length, 0), 19);
  assert.ok(inventory.points.every((p) => p.teachingCoverage === 'complete'));
  assert.ok(inventory.points.every((p) => JSON.stringify(p.components) === '["2C"]'));
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.equal(notes.complete, false);
});

void test('electrode connections, collection ratios and independently specified half-equations conserve the appropriate evidence', () => {
  const result = execFileSync('python3', ['-c', `
import json,re,collections,xml.etree.ElementTree as E
from pathlib import Path
root=E.parse('public/diagrams/chemistry-electrolysis-cell.svg')
byid={e.get('id'):e for e in root.iter() if e.get('id')}
assert byid['negative-terminal'].text=='−' and byid['positive-terminal'].text=='+'
for electrode,terminal,start in [('cathode','negative-terminal',320),('anode','positive-terminal',480)]:
 rect=byid[electrode];x=float(rect.get('x'))+float(rect.get('width'))/2;y=float(rect.get('y'))
 assert float(byid[terminal].get('x'))==start
 assert byid[electrode+'-wire'].get('d')==f'M{start} 130V165H{int(x)}V{int(y)}'
 assert y<290<float(rect.get('y'))+float(rect.get('height'))<460
assert float(byid['cathode'].get('x'))+float(byid['cathode'].get('width'))<float(byid['anode'].get('x'))
n=json.loads(Path('content/notes/chemistry.json').read_text());s={s['id']:s for s in n['sections']}
assert any(x['url'].endswith('#page=88') for x in n['supportingSources'] if x['title'].endswith('guide: electrolysis'))
rows=s['aqueous-cell-control-evidence']['table']['rows'];assert rows==[['A: current on','12','5'],['B: repeated conditions','14','6'],['Control: no current','0','0']]
assert [int(r[1])/int(r[2]) for r in rows[:2]]==[12/5,14/6]
assert all(int(r[1])/int(r[2])>2 for r in rows[:2]) and 20/10==2
predictions=s['electrolysis-condition-comparison-evidence']['table']['rows']
assert predictions==[['Molten PbBr₂','Lead','Bromine'],['Aqueous CuSO₄','Copper','Oxygen'],['Dilute aqueous H₂SO₄','Hydrogen','Oxygen'],['Concentrated aqueous NaCl','Hydrogen','Chlorine']]
def totals(side):
 atoms=collections.Counter();charge=0
 for k,formula,q in side:
  if formula!='e':
   for a,num in re.findall(r'([A-Z][a-z]?)([0-9]*)',formula):atoms[a]+=k*int(num or 1)
  charge+=k*q
 return dict(atoms),charge
valid=[
 ([(1,'Pb',2),(2,'e',-1)],[(1,'Pb',0)]),
 ([(2,'Br',-1)],[(1,'Br2',0),(2,'e',-1)]),
 ([(1,'Cu',2),(2,'e',-1)],[(1,'Cu',0)]),
 ([(2,'H',1),(2,'e',-1)],[(1,'H2',0)]),
 ([(2,'H2O',0),(2,'e',-1)],[(1,'H2',0),(2,'OH',-1)]),
 ([(2,'Cl',-1)],[(1,'Cl2',0),(2,'e',-1)]),
 ([(4,'OH',-1)],[(1,'O2',0),(2,'H2O',0),(4,'e',-1)]),
 ([(2,'H2O',0)],[(1,'O2',0),(4,'H',1),(4,'e',-1)]),
 ([(2,'H2O',0)],[(2,'H2',0),(1,'O2',0)])]
assert all(totals(l)==totals(r) for l,r in valid)
invalid=[
 ([(2,'Cl',-1)],[(1,'Cl2',0),(1,'e',-1)]),
 ([(1,'Cu',2)],[(1,'Cu',0),(2,'e',-1)]),
 ([(2,'H2O',0)],[(1,'O2',0),(4,'H',1),(2,'e',-1)])]
assert all(totals(l)[0]==totals(r)[0] and totals(l)[1]!=totals(r)[1] for l,r in invalid)
text=' '.join(s['half-equation-correction-evidence']['paragraphs'])
for equation in ['Pb²⁺ + 2e⁻ → Pb','2Br⁻ → Br₂ + 2e⁻','Cu²⁺ + 2e⁻ → Cu','2H⁺ + 2e⁻ → H₂','2H₂O + 2e⁻ → H₂ + 2OH⁻','2H₂O → O₂ + 4H⁺ + 4e⁻','4OH⁻ → O₂ + 2H₂O + 4e⁻','2H₂O → 2H₂ + O₂']:assert equation in text
print('actual circuit, original data, conditions and atom/charge conservation checked')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'actual circuit, original data, conditions and atom/charge conservation checked');
});
