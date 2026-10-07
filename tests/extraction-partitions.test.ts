import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import extraction from '../research/extractions/biology-extraction.ts';
import proof from '../research/reviews/2026-10-07-biology-extraction-partitions.json' with { type: 'json' };

void test('partitioned Biology extraction preserves every Q7 snapshot field and bounded per-question source files', () => {
  const report = JSON.parse(execFileSync('python3', ['-c', `
import json,hashlib,sys
from pathlib import Path
sys.path.insert(0,'scripts');from extraction_io import read_extraction
path=Path('research/extractions/4BI1-2024-June-1-standard.json')
new=read_extraction(path);new.pop('taskPartitions')
sha=lambda m:hashlib.sha256(json.dumps(m,sort_keys=True,separators=(',',':')).encode()).hexdigest()
files=[path,*path.with_suffix('').glob('*.json')]
sizes=[]
for p in files:
 request=dict(repository_full_name='peterpeterpeter111/igcses',base_tree_sha='0'*40,tree_elements=[dict(path=str(p),mode='100644',type='blob',content=p.read_text())])
 sizes.append(len(json.dumps(request,ensure_ascii=False,separators=(',',':')).encode())+1)
assert max(sizes)<195000
print(json.dumps({'sha':sha(new),'files':len(files),'largest':max(sizes)}))
`], { encoding: 'utf8' }));
  assert.equal(proof.everyFieldPreserved, true);
  assert.equal(proof.beforeLogicalSha256, proof.afterLogicalSha256);
  assert.equal(report.sha, proof.beforeLogicalSha256);
  assert.equal(report.files, 8);
  assert.equal(extraction.tasks.length, 33);
  assert.equal(extraction.tasks.reduce((sum, t) => sum + t.originalMarks, 0), 78);
});

void test('extraction reader refuses absent, foreign, duplicated, unsafe and undeclared question partitions without writes', () => {
  const cases = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile,shutil,sys
from pathlib import Path
sys.path.insert(0,'scripts');from extraction_io import read_extraction
source=Path('research/extractions/4BI1-2024-June-1-standard.json');passed=[]
for mode in ['missing-file','extra-file','linked-file','wrong-paper','wrong-question','duplicate-task','foreign-task','wrong-count','wrong-total','root-tasks','unsafe-path','missing-declaration','reverse-order']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d);p=root/source.name;shutil.copy2(source,p);folder=root/source.stem;shutil.copytree(source.with_suffix(''),folder)
  meta=json.loads(p.read_text());child=folder/'Q1.json';part=json.loads(child.read_text())
  if mode=='missing-file':child.unlink()
  elif mode=='extra-file':(folder/'unknown.json').write_text('{}')
  elif mode=='linked-file':child.unlink();child.symlink_to(source.resolve().with_suffix('')/'Q1.json')
  elif mode=='wrong-paper':part['paperId']='foreign';child.write_text(json.dumps(part))
  elif mode=='wrong-question':part['question']='2';child.write_text(json.dumps(part))
  elif mode=='duplicate-task':part['tasks'].append(dict(part['tasks'][0]));child.write_text(json.dumps(part))
  elif mode=='foreign-task':part['tasks'][0]['paperId']='foreign';child.write_text(json.dumps(part))
  elif mode=='wrong-count':meta['detailedLeafTasks']=32
  elif mode=='wrong-total':meta['detailedOriginalMarks']=79
  elif mode=='root-tasks':meta['tasks']=[part['tasks'][0]]
  elif mode=='unsafe-path':meta['taskPartitions']['parts'][0]['path']='../escape.json'
  elif mode=='missing-declaration':meta['taskPartitions']['parts'].pop()
  elif mode=='reverse-order':meta['taskPartitions']['parts'].reverse()
  p.write_text(json.dumps(meta))
  before={f:f.read_bytes() for f in root.rglob('*') if f.is_file()}
  try:read_extraction(p)
  except ValueError:passed.append(mode)
  else:raise AssertionError(mode+' accepted')
  assert all(f.read_bytes()==v for f,v in before.items())
print(json.dumps(passed))
`], { encoding: 'utf8' }));
  assert.equal(cases.length, 13);
});
