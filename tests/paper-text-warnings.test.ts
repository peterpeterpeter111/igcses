import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

void test('paper text preparation flags unresolved mathematical glyphs without needing PDF dependencies', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import importlib.util,json
spec=importlib.util.spec_from_file_location('preflight','scripts/preflight-paper-text.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
padding='ordinary readable text '*4
print(json.dumps([
 m.text_warnings(padding),
 m.text_warnings(padding+'/g32'),
 m.text_warnings(padding+chr(0xf084)),
 m.text_warnings(padding+chr(0xf0001)),
 m.text_warnings(padding+chr(0x100001)),
 m.text_warnings(padding+'x² ≤ 4'),
 m.text_warnings(chr(0xfffd)+chr(0), 'PDF extraction failed')
]))
`], { encoding: 'utf8' }));
  assert.deepEqual(result[0], []);
  assert.ok(result[1].includes('unresolved-glyph-names'));
  for (const i of [2, 3, 4]) assert.ok(result[i].includes('private-use-characters-need-visual-check'));
  assert.deepEqual(result[5], []);
  assert.deepEqual(result[6], ['text-extraction-error', 'sparse-text-may-be-blank-or-visual', 'replacement-characters', 'null-characters']);
});
