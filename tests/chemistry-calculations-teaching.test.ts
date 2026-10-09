import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import inventory from '../research/syllabus/4CH1-formulae-and-calculations.json' with { type: 'json' };
import review from '../research/teaching-reviews/4CH1-calculations-2026-10-09.json' with { type: 'json' };
import source from '../research/reviews/2026-10-09-chemistry-calculations-teaching-source.json' with { type: 'json' };

void test('calculation teaching completion excludes the unaudited full reaction collection and preserves Paper 2 scope', () => {
  assert.equal(review.points.length,13);
  assert.equal(review.points.reduce((n,p)=>n+p.requirements.length,0),34);
  const pending=inventory.points.find((p)=>p.reference==='1.25')!;
  assert.equal(pending.teachingCoverage,'partial');
  assert.equal(pending.substatementAuditComplete,false);
  assert.equal(review.points.some((p)=>p.pointId===pending.id),false);
  for(const ref of ['1.34C','1.35C']) assert.deepEqual(inventory.points.find((p)=>p.reference===ref)!.components,['2C']);
  assert.equal(review.practicalTrialsPerformed,false);
  assert.equal(review.examTemplateCalibrationComplete,false);
  assert.equal(source.activeTemplates,0);
});

void test('independent exact arithmetic checks limiting reagent, hydration, gas ratio and incomplete-heating bias', () => {
  const result=execFileSync('python3',['-c',`
from fractions import Fraction as F
import json
from pathlib import Path
s=json.loads(Path('research/reviews/2026-10-09-chemistry-calculations-teaching-source.json').read_text())['arithmetic']
al=F('5.4')/27;cl=F('10.65')/71;extent=min(al/2,cl/3)
assert cl/3<al/2
assert 2*extent*F('133.5')==F(s['AlCase']['theoreticalMassG'])
assert (al-2*extent)*27==F(s['AlCase']['unreactedAlG'])
assert F('10.68')/(2*extent*F('133.5'))*100==F(s['AlCase']['yieldPercent'])
assert (F('4.92')-F('2.40'))/18/(F('2.40')/120)==s['hydrateNumbers'][0]
assert (F('3.75')-F('2.40'))/18/(F('2.40')/160)==s['hydrateNumbers'][1]
assert (F('2.25')-2)/1 / (F(2)/16)==2
assert F('2.8')/56/(F('1.2')/16)==F(2,3)
assert F('0.120')*F('0.0350')/2*24000==F(s['gasVolumesCm3'][0])
assert F('0.150')*F('0.0400')/2*24000==F(s['gasVolumesCm3'][1])
assert F(600)/24000*44==F(s['CO2MassG'])
first=(F('19.56')-F('19.14'))/16
mg=(F('19.14')-F('18.42'))/24
final=(F('19.62')-F('19.14'))/16
assert first/mg==F(s['firstHeatingOtoMg'])<1
assert final/mg==1
assert (F('21.90')-F('21.58'))/16==(F('21.58')-F('21.10'))/24
assert F('0.12')*F('0.035')/F('0.140')==F('0.030')
assert F('0.150')*F('0.040')/F('0.050')==F('0.120')
print('independent calculation and bias checks passed')
`],{encoding:'utf8'});
  assert.equal(result.trim(),'independent calculation and bias checks passed');
});
