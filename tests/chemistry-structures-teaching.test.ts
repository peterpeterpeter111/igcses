import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-bonding-properties-2026-10-09.json' with { type:'json' };
import ionic from '../research/teaching-reviews/4CH1-ionic-bonding-2026-10-09.json' with { type:'json' };
import inventory from '../research/syllabus/4CH1-bonding.json' with { type:'json' };
import note from '../content/notes/chemistry.json' with { type:'json' };

void test('combined property review preserves ionic decisions and preserves its historical omission of the later-reviewed molecule collection',()=>{
  assert.deepEqual(review.points.slice(0,7),ionic.points);
  assert.equal(review.points.length,17);
  assert.equal(review.points.slice(7).reduce((n,p)=>n+p.requirements.length,0),13);
  const pending=inventory.points.find((p)=>p.reference==='1.46')!;
  assert.equal(pending.teachingCoverage,'complete');assert.equal(pending.substatementAuditComplete,true);
  assert.equal(review.points.some((p)=>p.pointId===pending.id),false);
  for(const ref of ['1.52C','1.53C','1.54C'])assert.deepEqual(inventory.points.find((p)=>p.reference===ref)!.components,['2C']);
  assert.equal(review.examTemplateCalibrationComplete,false);assert.equal(note.complete,false);
});

void test('metallic model is a neutral monovalent patch and supplied phase data are sufficient for the stated classifications',()=>{
  const r=execFileSync('python3',['-c',`
import json,xml.etree.ElementTree as E
from pathlib import Path
ns={'s':'http://www.w3.org/2000/svg'}
d=E.parse('public/diagrams/chemistry-bonding-metallic.svg')
ions=d.findall('.//s:circle',ns)
electrons=[t for t in d.findall('.//s:text',ns) if t.text=='e⁻']
assert len(ions)==len(electrons)==18
for low,high in [(0,450),(450,900)]:
 assert sum(low<float(c.get('cx'))<high for c in ions)==9
 assert sum(low<float(t.get('x'))<high for t in electrons)==9
for y in [140,215,290]:
 left=sorted(float(c.get('cx')) for c in ions if float(c.get('cy'))==y and float(c.get('cx'))<450)
 right=sorted(float(c.get('cx')) for c in ions if float(c.get('cy'))==y and float(c.get('cx'))>450)
 assert [b-a-450 for a,b in zip(left,right)]==[34 if y==215 else 0]*3
n=json.loads(Path('content/notes/chemistry.json').read_text())
rows=next(s for s in n['sections'] if s['id']=='molecular-property-comparison-evidence')['table']['rows']
states=[]
for label,mass,melt,boil in rows:
 melt=int(melt.replace('−','-'));boil=int(boil.replace('−','-'));assert melt<boil
 states.append('solid' if 20<melt else 'gas' if 20>boil else 'liquid')
assert states==['gas','liquid','solid']
print('actual metallic neutrality, layer displacement and phase inputs verified')
`],{encoding:'utf8'});
  assert.equal(r.trim(),'actual metallic neutrality, layer displacement and phase inputs verified');
});
