import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4CH1-bonding.json' with { type: 'json' };
import review from '../research/teaching-reviews/4CH1-ionic-bonding-2026-10-09.json' with { type: 'json' };

void test('historical ionic review keeps its seven decisions while the newer property review preserves molecule scope',()=>{
  assert.equal(review.points.length,7);
  assert.equal(review.points.reduce((n,p)=>n+p.requirements.length,0),14);
  assert.equal(inventory.points.filter((p)=>p.teachingCoverage==='complete').length,18);
  assert.equal(inventory.points.filter((p)=>p.teachingCoverage==='partial').length,0);
  assert.equal(review.examTemplateCalibrationComplete,false);
  assert.equal(review.practicalTrialsPerformed,false);
});

void test('actual electron markers conserve both sources across ion formation and each negative ion has an octet',()=>{
  const result=execFileSync('python3',['-c',`
import xml.etree.ElementTree as E
from math import gcd
ns={'s':'http://www.w3.org/2000/svg'}
for file,donors,acceptors,loss,original in [('lithium-nitride',3,1,1,5),('aluminium-oxide',2,3,3,6)]:
 d=E.parse('public/diagrams/chemistry-'+file+'-transfer.svg')
 groups=[g for g in d.findall('.//s:g',ns) if g.get('data-kind')]
 before=[g for g in groups if g.get('data-kind').startswith('neutral')]
 after=[g for g in groups if g.get('data-kind').endswith('ion')]
 pos=[g for g in after if g.get('data-kind')=='positive-ion'];neg=[g for g in after if g.get('data-kind')=='negative-ion']
 assert len(pos)==donors and len(neg)==acceptors
 def markers(gs,kind):return sum(len(g.findall('.//*[@data-electron="'+kind+'"]')) for g in gs)
 assert markers(before,'dot')==markers(after,'dot')==acceptors*original
 assert markers(before,'cross')==markers(after,'cross')==donors*loss
 assert donors*loss==acceptors*(8-original)
 for g in neg:
  assert markers([g],'dot')==original and markers([g],'cross')==8-original
  labels=[t.text for t in g.findall('s:text',ns)]
  assert str(8-original)+'−' in labels
 for g in pos:
  assert markers([g],'dot')==markers([g],'cross')==0
  assert ('+' if loss==1 else str(loss)+'+') in [t.text for t in g.findall('s:text',ns)]
for positive,negative,ratio in [(3,2,(2,3)),(1,2,(2,1)),(2,1,(1,2)),(1,2,(2,1)),(2,2,(1,1))]:
 common=gcd(positive,negative);assert (negative//common,positive//common)==ratio
print('actual marker counts, charges and smallest ratios checked')
`],{encoding:'utf8'});
  assert.equal(result.trim(),'actual marker counts, charges and smallest ratios checked');
});
