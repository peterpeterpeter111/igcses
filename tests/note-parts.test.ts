import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { composeNote } from '../content/compose-note.mjs';
import { readNote } from '../scripts/read-note.mjs';
import { getNotes } from '../content/notes.ts';
import migration from '../research/reviews/2026-10-05-source-parts-migration.json' with { type: 'json' };

const first = '../note-sections/demo/first.json';
const second = '../note-sections/demo/second.json';
const base = {
  subjectId: 'demo', chapterId: 'chapter', sourceId: 'source', sourcePages: [1],
  prerequisites: [], goals: [], status: 'source-checked' as const, complete: false,
  humanReviewed: false as const, sections: [], sectionFiles: [second, first],
};
const a = { id: 'a', title: 'First', paragraphs: ['First text'] };
const b = { id: 'b', title: 'Second', paragraphs: ['Second text'] };
const parts = {
  [first]: { subjectId: 'demo', chapterId: 'chapter', sections: [a] },
  [second]: { subjectId: 'demo', chapterId: 'chapter', sections: [b] },
};

void test('note parts follow manifest order and expose the unchanged chapter contract', () => {
  const note = composeNote(base, parts);
  assert.deepEqual(note.sections, [b, a]);
  assert.ok(!Object.hasOwn(note, 'sectionFiles'));
  assert.equal(note.sourceId, base.sourceId);
  assert.equal(note.complete, false);
  assert.deepEqual(composeNote({ ...note, sections: [a] }), { ...note, sections: [a] });
});

void test('browser note assembly refuses missing, duplicate, ambiguous and wrong-owner parts', () => {
  assert.throws(() => composeNote(base, { [first]: parts[first] }));
  assert.throws(() => composeNote({ ...base, sectionFiles: [first, first] }, parts));
  assert.throws(() => composeNote({ ...base, sections: [a] }, parts));
  assert.throws(() => composeNote(base, { ...parts, [first]: { ...parts[first], chapterId: 'wrong' } }));
  assert.throws(() => composeNote(base, { ...parts, [second]: { ...parts[second], sections: [a] } }));
  assert.throws(() => composeNote({ ...base, sectionFiles: ['../../sources/reference.json'] }, {}));
});

void test('Python, offline JS and bundled readers preserve every current Biology value', () => {
  const path = 'content/notes/biology-structures.json';
  const python = JSON.parse(execFileSync('python3', ['-c',
    "import json; from scripts.note_io import read_note; print(json.dumps(read_note('content/notes/biology-structures.json')))"],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
  assert.deepEqual(python, readNote(path));
  assert.deepEqual(python, getNotes('biology', 'structures-and-functions'));
  assert.equal(migration.canonicalSha256Before, migration.canonicalSha256After);
  assert.equal(migration.sectionsBefore, migration.sectionsAfter);
  assert.equal(migration.allValuesAndOrderPreserved, true);
});

void test('offline note reader rejects linked, escaped, missing and malformed manifests', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `
import json,tempfile
from pathlib import Path
from scripts.note_io import read_note
cases=[]
for mode in ['missing','escape','linked','owner','duplicate-id','duplicate-path','inline','null']:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d);notes=root/'content/notes';notes.mkdir(parents=True)
  folder=root/'content/note-sections/demo';folder.mkdir(parents=True)
  part=folder/'one.json';part.write_text(json.dumps({'subjectId':'demo','chapterId':'chapter','sections':[{'id':'a'}]}))
  note={'subjectId':'demo','chapterId':'chapter','sections':[],'sectionFiles':['../note-sections/demo/one.json']}
  if mode=='missing':part.unlink()
  elif mode=='escape':note['sectionFiles']=['../../sources/reference.json']
  elif mode=='linked':
   target=root/'outside.json';target.write_text(part.read_text());part.unlink();part.symlink_to(target)
  elif mode in ['owner','duplicate-id']:
   data=json.loads(part.read_text())
   if mode=='owner':data['chapterId']='wrong'
   else:data['sections']*=2
   part.write_text(json.dumps(data))
  elif mode=='duplicate-path':note['sectionFiles']*=2
  elif mode=='inline':note['sections']=[{'id':'inline'}]
  elif mode=='null':note['sectionFiles']=None
  path=notes/'demo.json';path.write_text(json.dumps(note))
  try:read_note(path)
  except (ValueError,OSError):cases.append(mode)
  else:raise AssertionError('Invalid note accepted: '+mode)
print(json.dumps(cases))
`], { encoding: 'utf8' }));
  assert.equal(result.length, 8);
});
