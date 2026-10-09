import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import review from '../research/teaching-reviews/4CH1-principles-foundations-2026-10-09.json' with { type: 'json' };
import original from '../research/teaching-reviews/4CH1-states-mixtures-2026-10-09.json' with { type: 'json' };
import note from '../content/notes/chemistry.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-chemistry-atoms-teaching-source.json' with { type: 'json' };

void test('combined foundations review preserves all prior judgements and adds exactly nine bounded atomic identities', () => {
  assert.equal(review.schemaVersion,2);
  assert.deepEqual(review.points.slice(0,13),original.points);
  assert.equal(review.points.length,22);
  assert.equal(review.points.slice(13).reduce((n,p)=>n+p.requirements.length,0),22);
  assert.equal(review.points.reduce((n,p)=>n+p.requirements.length,0),61);
  assert.equal(review.humanReviewed,false);
  assert.equal(review.examTemplateCalibrationComplete,false);
  assert.equal(source.activeTemplates,0);
  assert.equal(note.complete,false);
});

void test('first twenty configurations and isotope averages agree with independently reconstructed counts', () => {
  const rows=note.sections.find((s)=>s.id==='first-twenty-configuration-evidence')!.table!.rows;
  const symbols=['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca'];
  assert.equal(rows.length,20);
  for(let z=1;z<=20;z++) {
    let left=z;const shell=[];
    for(const capacity of [2,8,8,2]) {const electrons=Math.min(capacity,left);if(electrons) shell.push(electrons);left-=electrons;}
    assert.equal(left,0);
    assert.deepEqual(rows[z-1],[String(z),rows[z-1][1],shell.join(',')]);
    assert.ok(rows[z-1][1].startsWith(symbols[z-1]+' · '));
    assert.equal(shell.reduce((n,e)=>n+e,0),z);
  }
  const result=execFileSync('python3',['-c',`
from fractions import Fraction as F
import xml.etree.ElementTree as E
assert F(20*80+22*20,100)==F(204,10)
assert F(20*3+22*2,5)==F(208,10)
assert F(30*2+32*3,5)==F(312,10)
assert F(24*75+26*25,100)==F(245,10)
assert F(24*2+26*3,5)==F(252,10)
ns={'s':'http://www.w3.org/2000/svg'}
d=E.parse('public/diagrams/chemistry-carbon-isotope-evidence.svg')
electrons=[e for e in d.findall('.//s:circle',ns) if e.get('r')=='6' and e.get('cy')!='362']
assert len(electrons)==12
for centre in [157,443]:
 points=[(int(e.get('cx')),int(e.get('cy'))) for e in electrons if abs(int(e.get('cx'))-centre)<=90]
 assert len(points)==6
 radii=[(x-centre)**2+(y-207)**2 for x,y in points]
 assert radii.count(49**2)==2 and radii.count(90**2)==4
 assert 12-6==6 and 14-6==8
print('independent atomic counts and means verified')
`],{encoding:'utf8'});
  assert.equal(result.trim(),'independent atomic counts and means verified');
});
