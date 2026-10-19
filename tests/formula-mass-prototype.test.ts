import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { buildFormulaMassQuestion, generateFormulaMassQuestion, validateFormulaMassQuestion } from '../server/generators/relative-formula-mass.ts';
import { markFormulaMassResponse } from '../server/generators/formula-mass-marking.ts';
import { formulaMassCalibrationCases } from '../server/generators/formula-mass-calibration.ts';
import { activeFamilies } from '../server/template-registry.ts';

void test('formula-mass generation covers the finite domain deterministically with independent arithmetic and private answers', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 1000; seed++) {
    const q = generateFormulaMassQuestion(seed);
    const n = (seed % 10) + 1;
    assert.ok(validateFormulaMassQuestion(q));
    assert.deepEqual(q, generateFormulaMassQuestion(seed));
    assert.equal(q.privateSolution.relativeFormulaMass, 14 * n + 61);
    assert.equal(q.publicQuestion.stimulus.molecularFormula, `C${n + 1}H${2 * n + 3}NO2`);
    assert.deepEqual(Object.keys(q.publicQuestion).sort(), ['maximumMarks', 'prompt', 'stimulus']);
    assert.equal(q.publicQuestion.stimulus.relativeAtomicMasses.length, 4);
    assert.equal(Object.isFrozen(q.privateSolution.terms[0]), true);
    assert.equal(q.validation.liveEligible, false);
    assert.equal(q.validation.markingCalibrated, false);
    seen.add(JSON.stringify(q.publicQuestion));
  }
  assert.equal(seen.size, 10); // Seeds repeat; never claim 1,000 unique questions.
  assert.equal(activeFamilies.length, 0);
});

void test('80 synthetic scoring/deferral cases preserve source credit without claiming examiner calibration', () => {
  const cases = formulaMassCalibrationCases();
  assert.equal(cases.length, 80);
  for (const [i, c] of cases.entries()) {
    const result = markFormulaMassResponse(generateFormulaMassQuestion(Math.floor(i / 8)), c.response);
    assert.deepEqual({ status: result.status, score: result.score }, c.expected, c.id);
  }
});

void test('formula-mass validation rejects tampering, invalid inputs and ambiguous evidence', () => {
  for (const seed of [-1, 1.5, NaN, Infinity, 0x100000000]) assert.throws(() => generateFormulaMassQuestion(seed));
  for (const n of [0, 11, 1.5, NaN]) assert.throws(() => buildFormulaMassQuestion(0, { methyleneCount: n }));
  const original = generateFormulaMassQuestion(0);
  const mutations = [
    (q: typeof original) => { q.privateSolution.relativeFormulaMass++; },
    (q: typeof original) => { q.publicQuestion.stimulus.molecularFormula = 'C8H10N4O2'; },
    (q: typeof original) => { q.privateSolution.terms[0].count++; },
    (q: typeof original) => { q.seed = -1; },
  ];
  for (const mutate of mutations) {
    const q = structuredClone(original); mutate(q);
    assert.equal(validateFormulaMassQuestion(q), false);
    assert.throws(() => markFormulaMassResponse(q, { finalAnswer: '', terms: [], additionalEvidence: '' }));
  }
  for (const answer of ['75;process.exit()', '7.5e1', '75 or 76', '75 g', 'NaN', '7 5']) {
    assert.equal(markFormulaMassResponse(original, { finalAnswer: answer, terms: [], additionalEvidence: '' }).status, 'needs-review');
  }
  const duplicate = [original.privateSolution.terms[0], original.privateSolution.terms[0]];
  assert.equal(markFormulaMassResponse(original, { finalAnswer: '75', terms: duplicate, additionalEvidence: '' }).status, 'needs-review');
});

void test('DeepSeek runner hides gold labels, respects request caps and rejects invalid model results without network access', () => {
  const result = execFileSync('python3', ['-c', `
import json,sys,copy,tempfile
from pathlib import Path
sys.path.insert(0,'scripts')
from deepseek_calibration import packets,evaluate,CalibrationError,api_transport,validate_results,configured_key
cases=[]
for i in range(80):
 cases.append(dict(id='secret-gold-case-'+str(i),publicQuestion={'prompt':'Calculate Mr','stimulus':{'molecularFormula':'C2H5NO2','relativeAtomicMasses':[dict(symbol=s,value=v) for s,v in [('C',12),('H',1),('N',14),('O',16)]]},'maximumMarks':2},response={'finalAnswer':'75','terms':[],'additionalEvidence':''},expected={'status':'scored','score':2}))
d=dict(schemaVersion=1,origin='original-synthetic-research',familyId='4CH1.relative-formula-mass',cases=cases)
selected,batches=packets(d)
assert len(selected)==16 and len(batches)==2
all_ids=[]
for offset in range(0,80,16):
 chosen,_=packets(d,case_offset=offset);all_ids.extend(c['id'] for c in chosen)
assert len(all_ids)==len(set(all_ids))==80
calls=[]
def transport(p):
 calls.append(p)
 user=json.loads(p['messages'][1]['content'])
 assert 'expected' not in json.dumps(user) and 'secret-gold-case' not in json.dumps(user)
 rows=[dict(id=c['id'],status='scored',score=2,reason='Computed from supplied formula') for c in user['cases']]
 return dict(choices=[dict(finish_reason='stop',message=dict(content=json.dumps({'results':rows})))])
r=evaluate(d,transport)
assert len(calls)==r['requests']==2 and r['agreements']==r['evaluatedCases']==16 and r['totalCases']==80
assert not r['examinerCalibrated'] and not r['templateActivationAuthorised']
for mode in ['empty','truncated','duplicate','boolean-score','over-credit']:
 def bad(p):
  ids=json.loads(p['messages'][1]['content'])['cases']
  rows=[dict(id=c['id'],status='scored',score=2,reason='test') for c in ids]
  if mode=='duplicate':rows[1]['id']=rows[0]['id']
  if mode=='boolean-score':rows[0]['score']=True
  if mode=='over-credit':rows[0]['score']=3
  content='' if mode=='empty' else json.dumps({'results':rows})
  return dict(choices=[dict(finish_reason='length' if mode=='truncated' else 'stop',message={'content':content})])
 r=evaluate(d,bad);assert r['evaluatedCases']==r['agreements']==0 and r['invalidCases']==16,mode
attempts=[]
def failed(p):
 attempts.append(p);raise CalibrationError('DeepSeek HTTP status 401; no retry performed')
try:evaluate(d,failed)
except CalibrationError:pass
else:raise AssertionError('transport failure swallowed')
assert len(attempts)==1
with tempfile.TemporaryDirectory() as folder:
 p=Path(folder)/'secure.env';p.write_text('OTHER_SECRET=ignored\\nDEEPSEEK_API_KEY="'+('x'*24)+'"\\n')
 assert configured_key(p)=='x'*24
 p.write_text('DEEPSEEK_API_KEY=one\\nDEEPSEEK_API_KEY=two\\n')
 try:configured_key(p)
 except CalibrationError:pass
 else:raise AssertionError('duplicate credential accepted')
for key in [None,'','bad','x'*20+'\\n']:
 try:api_transport(key)
 except CalibrationError:pass
 else:raise AssertionError('invalid credential accepted')
try:packets(d,max_requests=3)
except CalibrationError:pass
else:raise AssertionError('request cap bypassed')
try:packets(d,case_offset=80)
except CalibrationError:pass
else:raise AssertionError('invalid cursor accepted')
print('blind scoring, bounded spend, failed-response and credential gates verified offline')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'blind scoring, bounded spend, failed-response and credential gates verified offline');
});
