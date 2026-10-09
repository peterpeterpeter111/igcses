import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { coverageSummary } from '../lib/coverage.ts';
import inventory from '../research/syllabus/4BI1-living-organisms.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-life-characteristics-2026-10-09.json' with { type: 'json' };
import current from '../research/teaching-reviews/4BI1-organism-groups-2026-10-09.json' with { type: 'json' };

void test('historical eight life-characteristic decisions are preserved in the four-point organism review', () => {
  assert.equal(review.points.length, 1);
  assert.equal(review.points[0].requirements.length, 8);
  assert.deepEqual(current.points[0], review.points[0]);
  assert.deepEqual(inventory.points.filter((p) => p.teachingCoverage === 'complete').map((p) => p.reference), ['1.1', '1.2', '1.3', '1.4']);
  assert.equal(current.points.reduce((n, p) => n + p.requirements.length, 0), 34);
  assert.equal(coverageSummary().find((r) => r.subject.code === '4BI1')?.completePoints, 21);
  assert.ok(coverageSummary().every((r) => r.completeChapters === 0));
  const result = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-living-organisms.json';rp='research/teaching-reviews/4BI1-organism-groups-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-living-organisms.json','content/notes/biology.json']:
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,target)
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 assert validate_inventory_completion(root,json.loads((root/ip).read_text()))==['4BI1:issue3:1.1','4BI1:issue3:1.2','4BI1:issue3:1.3','4BI1:issue3:1.4']
 p=root/'content/notes/biology.json';n=json.loads(p.read_text());next(s for s in n['sections'] if s['id']=='life-process-observations')['practice']['answer']='Undigested fibre is a metabolic waste.';p.write_text(json.dumps(n))
 try:validate_inventory_completion(root,json.loads((root/ip).read_text()))
 except ValueError:print('stale answer rejected')
 else:raise AssertionError('unreviewed answer accepted')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'stale answer rejected');
});

void test('organism-group completion rejects changed label assets and unreviewed host-dependence answers', () => {
  const result = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-living-organisms.json';rp='research/teaching-reviews/4BI1-organism-groups-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-living-organisms.json','content/notes/biology.json']:
  t=root/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,t)
 shutil.copytree(src/'public/diagrams',root/'public/diagrams')
 inv=json.loads((root/ip).read_text());assert len(validate_inventory_completion(root,inv))==4
 for relative,mutate in [
 ('public/diagrams/biology-bacterial-model.svg',lambda b:b.replace(b'M116 82 L132 138',b'M116 82 L200 230')),
 ('content/notes/biology.json',lambda b:b.replace(b'Viral reproduction requires living host cells',b'Viral reproduction requires no living host cells'))]:
  p=root/relative;original=p.read_bytes();changed=mutate(original);assert changed!=original;p.write_bytes(changed)
  try:validate_inventory_completion(root,inv)
  except ValueError:print('stale evidence rejected')
  else:raise AssertionError('changed classification evidence accepted')
  p.write_bytes(original)
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'stale evidence rejected\nstale evidence rejected');
});
