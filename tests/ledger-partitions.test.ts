import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import migration from '../research/reviews/2026-09-30-coverage-partition-migration.json' with { type: 'json' };

void test('coverage partition reader refuses incomplete or ambiguous tables', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile,shutil
from pathlib import Path
from scripts.ledger_io import read_table
source=Path('research/ledger/v1')
fields,rows=read_table(source,'coverage')
assert len(rows)==len({r['coverage_id'] for r in rows})
cases=[]
for mode in ['missing','undeclared','header','wrong-subject','duplicate','root-rows']:
 with tempfile.TemporaryDirectory() as d:
  target=Path(d)/'ledger';shutil.copytree(source,target)
  part=target/'coverage/4MB1.csv'
  if mode=='missing':part.unlink()
  elif mode=='undeclared':shutil.copyfile(part,target/'coverage/extra.csv')
  elif mode=='header':part.write_text('wrong_header\\n')
  elif mode in ['wrong-subject','duplicate']:
   with part.open(newline='') as f: rs=list(csv.DictReader(f))
   if mode=='wrong-subject':rs[0]['point_id']='4PH1:issue4:1.1'
   else:rs.append(rs[0])
   with part.open('w',newline='') as f:
    w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rs)
  elif mode=='root-rows':shutil.copyfile(part,target/'coverage.csv')
  try:read_table(target,'coverage')
  except ValueError:cases.append(mode)
  else:raise AssertionError(mode+' was accepted')
print(json.dumps({'cases':cases,'rows':len(rows)}))
`], { encoding: 'utf8' }));
  assert.equal(result.cases.length, 6);
  assert.ok(result.rows >= 356);
  assert.equal(migration.rowsBefore, migration.rowsAfter);
  assert.equal(migration.canonicalRowsSha256Before, migration.canonicalRowsSha256After);
  assert.equal(migration.allFieldStringsPreserved, true);
});

void test('teaching export preserves all subject rows and writes only its declared partition', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,subprocess
from pathlib import Path
from scripts.ledger_io import read_table
source=Path.cwd()
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['scripts','research/ledger/v1','research/syllabus','content/notes','content/note-sections']:
  shutil.copytree(source/folder,root/folder)
 before={p.relative_to(root):p.read_bytes() for p in (root/'research/ledger/v1').rglob('*') if p.is_file()}
 old=read_table(root/'research/ledger/v1','coverage')[1]
 run=subprocess.run(['python3','scripts/export-teaching-ledger.py','research/syllabus/4MB1-algebra-foundations.json'],cwd=root,capture_output=True,text=True)
 assert run.returncode==0,run.stderr
 new=read_table(root/'research/ledger/v1','coverage')[1]
 assert sorted(old,key=lambda r:r['coverage_id'])==sorted(new,key=lambda r:r['coverage_id'])
 changed=[str(p) for p,data in before.items() if (root/p).read_bytes()!=data]
 assert set(changed)<=set(['research/ledger/v1/syllabus-points.csv','research/ledger/v1/coverage/4MB1.csv']),changed
 print(json.dumps({'preserved':len(new),'changed':changed}))
`], { encoding: 'utf8' }));
  assert.ok(result.preserved >= 356);
});
