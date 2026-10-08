import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { coverageSummary } from '../lib/coverage.ts';
import inventory from '../research/syllabus/4BI1-living-organisms.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-life-characteristics-2026-10-09.json' with { type: 'json' };

void test('eight life-characteristic decisions complete one teaching point without promoting its chapter or other points', () => {
  assert.equal(review.points.length, 1);
  assert.equal(review.points[0].requirements.length, 8);
  assert.deepEqual(inventory.points.filter((p) => p.teachingCoverage === 'complete').map((p) => p.reference), ['1.1']);
  assert.ok(inventory.points.slice(1).every((p) => !p.substatementAuditComplete));
  assert.equal(coverageSummary().find((r) => r.subject.code === '4BI1')?.completePoints, 12);
  assert.ok(coverageSummary().every((r) => r.completeChapters === 0));
  const result = execFileSync('python3', ['-c', `
import json,shutil,sys,tempfile
from pathlib import Path
src=Path.cwd();sys.path.insert(0,str(src/'scripts'))
from teaching_review import validate_inventory_completion
ip='research/syllabus/4BI1-living-organisms.json';rp='research/teaching-reviews/4BI1-life-characteristics-2026-10-09.json'
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 for p in [ip,rp,'research/curriculum-audits/4BI1-living-organisms.json','content/notes/biology.json']:
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src/p,target)
 assert validate_inventory_completion(root,json.loads((root/ip).read_text()))==['4BI1:issue3:1.1']
 p=root/'content/notes/biology.json';n=json.loads(p.read_text());n['sections'][-3]['practice']['answer']='Undigested fibre is a metabolic waste.';p.write_text(json.dumps(n))
 try:validate_inventory_completion(root,json.loads((root/ip).read_text()))
 except ValueError:print('stale answer rejected')
 else:raise AssertionError('unreviewed answer accepted')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'stale answer rejected');
});
