import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import migration from '../research/reviews/2026-09-30-coverage-partition-migration.json' with { type: 'json' };
import shardMigration from '../research/reviews/2026-10-06-ledger-shard-migration.json' with { type: 'json' };
import taskMigration from '../research/reviews/2026-10-07-task-partition-migration.json' with { type: 'json' };

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
 assert set(changed)<=set(['research/ledger/v1/syllabus-points/4MB1.csv','research/ledger/v1/coverage/4MB1.csv']),changed
 print(json.dumps({'preserved':len(new),'changed':changed}))
`], { encoding: 'utf8' }));
  assert.ok(result.preserved >= 356);
});

void test('subject and shard migration preserves every field and stays within the unchanged sync cap', () => {
  for (const table of shardMigration.tables) {
    assert.equal(table.rowsBefore, table.rowsAfter);
    assert.equal(table.canonicalRowsSha256Before, table.canonicalRowsSha256After);
    assert.equal(table.allFieldStringsPreserved, true);
    assert.ok(table.requestSizes.every((file) => file.requestBytes <= 195000));
  }
  assert.equal(shardMigration.contentCoveragePromotion, false);
});

void test('declared shards reject ambiguous, missing, linked and duplicate data', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile,shutil
from pathlib import Path
from scripts.ledger_io import read_table
source=Path('research/ledger/v1'); cases=[]
for mode in ['missing-shard','repeated-path','traversal','unknown-version','ambiguous-entry','linked-shard','cross-shard-duplicate']:
 with tempfile.TemporaryDirectory() as d:
  target=Path(d)/'ledger';shutil.copytree(source,target)
  manifest=target/'coverage-partitions.json';m=json.loads(manifest.read_text())
  entry=next(x for x in m['partitions'] if x['qualification']=='4HB1')
  first,second=[target/p for p in entry['paths']]
  if mode=='missing-shard':second.unlink()
  elif mode=='repeated-path':entry['paths'][1]=entry['paths'][0]
  elif mode=='traversal':entry['paths'][0]='coverage/../coverage/4HB1-001.csv'
  elif mode=='unknown-version':m['schemaVersion']=99
  elif mode=='ambiguous-entry':entry['path']='coverage/4HB1.csv'
  elif mode=='linked-shard':second.unlink();second.symlink_to(first.resolve())
  elif mode=='cross-shard-duplicate':
   with first.open(newline='') as f: duplicate=next(csv.DictReader(f))
   with second.open(newline='') as f: reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
   with second.open('w',newline='') as f:
    w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rows+[duplicate])
  manifest.write_text(json.dumps(m))
  try:read_table(target,'coverage')
  except ValueError:cases.append(mode)
  else:raise AssertionError(mode+' accepted')
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(result.length, 7);
});

void test('multi-shard teaching export preserves both logical tables and other subjects', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,subprocess
from pathlib import Path
from scripts.ledger_io import read_table
source=Path.cwd()
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['scripts','research/ledger/v1','research/syllabus','content/notes','content/note-sections']:shutil.copytree(source/folder,root/folder)
 directory=root/'research/ledger/v1'
 old={n:sorted(read_table(directory,n)[1],key=lambda r:r['coverage_id'] if n=='coverage' else r['point_id']) for n in ['coverage','syllabus-points']}
 before={p.relative_to(root):p.read_bytes() for p in directory.rglob('*') if p.is_file()}
 run=subprocess.run(['python3','scripts/export-teaching-ledger.py','research/syllabus/4HB1-disease-named.json'],cwd=root,capture_output=True,text=True);assert run.returncode==0,run.stderr
 for n in old:assert old[n]==sorted(read_table(directory,n)[1],key=lambda r:r['coverage_id'] if n=='coverage' else r['point_id'])
 changed=[str(p) for p,data in before.items() if (root/p).read_bytes()!=data]
 allowed={'research/ledger/v1/syllabus-points/4HB1.csv','research/ledger/v1/coverage/4HB1-001.csv','research/ledger/v1/coverage/4HB1-002.csv'}
 assert set(changed)<=allowed,changed
 # A second export is byte-idempotent, not merely equal after sorting.
 once={p:p.read_bytes() for p in directory.rglob('*') if p.is_file()}
 run=subprocess.run(['python3','scripts/export-teaching-ledger.py','research/syllabus/4HB1-disease-named.json'],cwd=root,capture_output=True,text=True);assert run.returncode==0,run.stderr
 assert all(p.read_bytes()==data for p,data in once.items())
 print(json.dumps({'preserved':len(old['coverage']),'repeatStable':True}))
`], { encoding: 'utf8' }));
  assert.ok(result.preserved >= 1283);
  assert.equal(result.repeatStable, true);
});

void test('legacy single-file partition manifests remain readable', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile
from pathlib import Path
from scripts.ledger_io import read_table
fields,rows=read_table('research/ledger/v1','coverage');row=next(r for r in rows if r['point_id'].startswith('4HB1:'))
with tempfile.TemporaryDirectory() as d:
 root=Path(d);(root/'coverage').mkdir()
 for name,rs in [('coverage.csv',[]),('coverage/4HB1.csv',[row])]:
  with (root/name).open('w',newline='') as f:
   w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rs)
 (root/'coverage-partitions.json').write_text(json.dumps({'schemaVersion':1,'table':'coverage','schemaPath':'coverage.csv','partitions':[{'qualification':'4HB1','path':'coverage/4HB1.csv'}]}))
 assert read_table(root,'coverage')[1]==[row]
 print(json.dumps({'legacyReadable':True}))
`], { encoding: 'utf8' }));
  assert.equal(result.legacyReadable, true);
});

void test('source identity partitions reject conflicting qualification and duplicate point identities', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile,shutil
from pathlib import Path
from scripts.ledger_io import read_table
cases=[]
for mode in ['qualification','duplicate','root-rows']:
 with tempfile.TemporaryDirectory() as d:
  target=Path(d)/'ledger';shutil.copytree('research/ledger/v1',target);part=target/'syllabus-points/4HB1.csv'
  if mode=='root-rows':shutil.copyfile(part,target/'syllabus-points.csv')
  else:
   with part.open(newline='') as f:reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
   if mode=='qualification':rows[0]['qualification']='4PH1'
   else:rows.append(rows[0])
   with part.open('w',newline='') as f:
    w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rows)
  try:read_table(target,'syllabus-points')
  except ValueError:cases.append(mode)
  else:raise AssertionError(mode+' accepted')
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(result.length, 3);
});

void test('task migration preserves rows and bounds each explicit subject file', () => {
  assert.equal(taskMigration.rowsBefore, 171);
  assert.equal(taskMigration.rowsBefore, taskMigration.rowsAfter);
  assert.equal(taskMigration.canonicalRowsSha256Before, taskMigration.canonicalRowsSha256After);
  assert.equal(taskMigration.allFieldStringsPreserved, true);
  assert.equal(taskMigration.contentCoveragePromotion, false);
  assert.equal(taskMigration.requestSizes.length, 6);
  assert.ok(taskMigration.requestSizes.every((file) => file.requestBytes < 195000));
});

void test('task partitions reject missing subjects, unsafe paths, duplicates and inconsistent paper identities', () => {
  const cases = JSON.parse(execFileSync('python3', ['-c', `
import csv,json,tempfile,shutil
from pathlib import Path
from scripts.ledger_io import read_table,csv_text
cases=[]
for mode in ['missing-subject','missing-file','undeclared','linked','header','wrong-subject','wrong-question','duplicate','root-rows','traversal','version']:
 with tempfile.TemporaryDirectory() as d:
  target=Path(d)/'ledger';shutil.copytree('research/ledger/v1',target)
  manifest=target/'tasks-partitions.json';m=json.loads(manifest.read_text())
  part=target/'tasks/4BI1.csv'
  fields,rows=read_table(target,'tasks');selected=[r for r in rows if r['paper_id'].startswith('4BI1-')]
  if mode=='missing-subject':m['partitions'].pop()
  elif mode=='missing-file':part.unlink()
  elif mode=='undeclared':shutil.copyfile(part,target/'tasks/extra.csv')
  elif mode=='linked':part.unlink();part.symlink_to((target/'tasks/4HB1.csv').resolve())
  elif mode=='header':part.write_text('wrong_header\\n')
  elif mode=='root-rows':(target/'tasks.csv').write_text(csv_text(fields,selected))
  elif mode=='traversal':m['partitions'][1]['paths']=['tasks/../tasks/4BI1.csv']
  elif mode=='version':m['schemaVersion']=99
  else:
   if mode=='wrong-subject':selected[0]['paper_id']='4PH1-2024-June-1-standard'
   elif mode=='wrong-question':selected[0]['question_path']='99'
   else:selected.append(dict(selected[0]))
   part.write_text(csv_text(fields,selected))
  manifest.write_text(json.dumps(m))
  before={p:p.read_bytes() for p in target.rglob('*') if p.is_file()}
  try:read_table(target,'tasks')
  except ValueError:cases.append(mode)
  else:raise AssertionError(mode+' accepted')
  assert all(p.read_bytes()==content for p,content in before.items())
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(cases.length, 11);
});

void test('task output refuses lost or changed foreign records before preparing any write', () => {
  const cases = JSON.parse(execFileSync('python3', ['-c', `
import copy,json
from pathlib import Path
from scripts.ledger_io import read_table,table_outputs
root=Path('research/ledger/v1');fields,old=read_table(root,'tasks');cases=[]
before={p:p.read_bytes() for p in root.rglob('*') if p.is_file()}
for mode in ['lost-foreign','changed-foreign','duplicate','wrong-question','wrong-subject','unknown-owner','schema']:
 rows=copy.deepcopy(old);headers=list(fields);owner='4BI1'
 foreign=next(r for r in rows if r['paper_id'].startswith('4PH1-'))
 if mode=='lost-foreign':rows.remove(foreign)
 elif mode=='changed-foreign':foreign['original_marks']='999'
 elif mode=='duplicate':rows.append(dict(rows[0]))
 elif mode=='wrong-question':rows[0]['question_path']='99'
 elif mode=='wrong-subject':rows[0]['paper_id']='unknown-paper'
 elif mode=='unknown-owner':owner='4XX1'
 elif mode=='schema':headers=headers[::-1]
 try:table_outputs(root,'tasks',headers,rows,owner)
 except ValueError:cases.append(mode)
 else:raise AssertionError(mode+' accepted')
 assert all(p.read_bytes()==content for p,content in before.items())
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(cases.length, 7);
});

void test('every paper task exporter round-trips all records and touches only its subject partition', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,subprocess
from pathlib import Path
from scripts.ledger_io import read_table
source=Path.cwd();checked=[]
commands=[('4BI1',['scripts/export-biology-q1.py']),('4HB1',['scripts/export-human-q1.py']),('4MB1',['scripts/export-maths-extraction.py']),('4EB1',['scripts/export-english-pilot.py']),('4PH1',['scripts/export-extraction-ledger.py','research/extractions/4PH1-2024-June-1-standard.json'])]
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for folder in ['scripts','research','content']:shutil.copytree(source/folder,root/folder)
 directory=root/'research/ledger/v1';original=sorted(read_table(directory,'tasks')[1],key=lambda r:r['task_id'])
 for owner,args in commands:
  before={p:p.read_bytes() for p in directory.rglob('*') if p.is_file()}
  run=subprocess.run(['python3',*args],cwd=root,capture_output=True,text=True);assert run.returncode==0,run.stderr
  assert sorted(read_table(directory,'tasks')[1],key=lambda r:r['task_id'])==original,owner
  permitted=directory/'tasks'/ (owner+'.csv')
  for p,content in before.items():
   if p.parent==directory/'tasks' or p.name in ['tasks.csv','tasks-partitions.json']:
    assert p==permitted or p.read_bytes()==content,owner+' changed '+str(p)
  once={p:p.read_bytes() for p in directory.rglob('*') if p.is_file()}
  run=subprocess.run(['python3',*args],cwd=root,capture_output=True,text=True);assert run.returncode==0,run.stderr
  assert all(p.read_bytes()==content for p,content in once.items()),owner+' is not byte-idempotent'
  checked.append(owner)
 print(json.dumps({'checked':checked,'preserved':len(original)}))
`], { encoding: 'utf8' }));
  assert.deepEqual(result.checked, ['4BI1', '4HB1', '4MB1', '4EB1', '4PH1']);
  assert.ok(result.preserved >= 171);
});
