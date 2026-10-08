import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import inventory from '../research/syllabus/4HB1-cells-foundations.json' with { type: 'json' };
import review from '../research/teaching-reviews/4HB1-cell-functions-gene-flow-2026-10-08.json' with { type: 'json' };
import { getNotes } from '../content/notes.ts';

void test('Human Biology review completes seven function/sequence statements while real microscopy stays incomplete', () => {
  const approved = JSON.parse(execFileSync('python3', ['-c', "import json,sys;from pathlib import Path;sys.path.insert(0,'scripts');from teaching_review import validate_inventory_completion;print(json.dumps(validate_inventory_completion(Path('.'),json.loads(Path('research/syllabus/4HB1-cells-foundations.json').read_text()))))"], {encoding:'utf8'}));
  assert.deepEqual(approved.slice(0,7), ['1.2','1.3','1.4','1.5','1.6','1.7','1.8'].map((r) => '4HB1:issue2:' + r));
  assert.equal(review.points.reduce((sum, p) => sum + p.requirements.length, 0), 27);
  assert.equal(inventory.points.find((p) => p.reference === '1.1')!.teachingCoverage, 'partial');
  assert.equal(inventory.points.find((p) => p.reference === '1.15')!.teachingCoverage, 'partial');
  assert.equal(getNotes('human-biology','cells-and-tissues')!.complete, false);
  for (const [src, sha] of Object.entries(review.diagramSha256))
    assert.equal(createHash('sha256').update(readFileSync('public' + src)).digest('hex'), sha);
});

void test('defined gene trace uses distinct complementary strands and checked synonymous/replacement codons', () => {
  const pair: Record<string,string> = {A:'T',T:'A',C:'G',G:'C'};
  const rna: Record<string,string> = {A:'U',T:'A',C:'G',G:'C'};
  const coding = 'ATGGCTGAT';
  const template = coding.split('').map((b) => pair[b]).join('');
  const message = template.split('').map((b) => rna[b]).join('');
  assert.equal(template, 'TACCGACTA');
  assert.equal(message, 'AUGGCUGAU');
  const key: Record<string,string> = {AUG:'methionine',GCU:'alanine',GCC:'alanine',GAU:'aspartate'};
  const translate = (m: string) => m.match(/.../g)!.map((c) => key[c]);
  assert.deepEqual(translate(message), ['methionine','alanine','aspartate']);
  assert.deepEqual(translate('AUGGCCGAU'), translate(message));
  assert.deepEqual(translate('AUGGAUGAU'), ['methionine','aspartate','aspartate']);
  const section = getNotes('human-biology','cells-and-tissues')!.sections.find((s) => s.id === 'gene-flow-and-mutation-evidence')!;
  assert.ok(section.practice);
  assert.match(section.practice.answer, /functional evidence/);
  assert.match(section.paragraphs.join(' '), /not.*one tRNA/);
});
