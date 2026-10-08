import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import sections from '../content/note-sections/biology-structures/02-molecules.json' with { type: 'json' };
import inventory from '../research/syllabus/4BI1-molecules-and-enzymes.json' with { type: 'json' };
import review from '../research/teaching-reviews/4BI1-molecules-and-enzymes-2026-10-08.json' with { type: 'json' };

void test('molecule and enzyme review pins eight own-source statements and all twenty-four requirement decisions', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', "import json,sys;from pathlib import Path;sys.path.insert(0,'scripts');from teaching_review import validate_inventory_completion;print(json.dumps(validate_inventory_completion(Path('.'),json.loads(Path('research/syllabus/4BI1-molecules-and-enzymes.json').read_text()))))"], {encoding:'utf8'}));
  assert.deepEqual(result, inventory.points.map((p) => p.id));
  assert.equal(result.length, 8);
  assert.equal(review.points.reduce((sum, p) => sum + p.requirements.length, 0), 24);
  assert.equal(review.humanReviewed, false);
  assert.equal(review.practicalTrialsPerformed, false);
  assert.equal(review.examTemplateCalibrationComplete, false);
  assert.deepEqual(inventory.points.find((p) => p.reference === '2.14B')!.components, ['2B']);
  assert.deepEqual(inventory.points.find((p) => p.reference === '2.12')!.components, ['1B', '2B']);
});

void test('illustrative enzyme data retain reproducible means, censored outcomes and independent pH comparison', () => {
  const s = sections.sections.find((s) => s.id === 'enzyme-repeat-data-and-endpoints')!;
  assert.ok(s.table);
  assert.match(s.paragraphs[0], /invented/);
  for (const row of s.table.rows.slice(0, 3)) {
    const times = row[1].split(', ').map(Number);
    const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
    assert.equal(mean, Number(row[2]));
    assert.ok(Math.abs(Number(row[3]) - 1 / mean) < 0.00004);
  }
  const incomplete = s.table.rows[3];
  assert.equal(incomplete[2], 'Not calculable');
  assert.equal(incomplete[3], 'No exact value');
  assert.match(s.paragraphs.join(' '), /not.*rate of zero/);
  const firstMean = (40 + 50 + 60) / 3, secondMean = (80 + 90 + 100) / 3;
  assert.equal((1 / firstMean) / (1 / secondMean), 1.8);
  assert.match(s.practice.answer, /1.8/);
  for (const section of sections.sections) {
    if ('table' in section && section.table)
      assert.ok(section.table.rows.every((row) => row.length === section.table!.headers.length));
  }
});
