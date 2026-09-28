import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { notes } from '../content/notes.ts';
import { subjects } from '../content/catalog.ts';
import sources from '../research/sources.json' with { type: 'json' };
import candidates from '../research/coverage.json' with { type: 'json' };
import { setup } from './quiz-fixture.ts';

void test('content seed preserves notes exactly, is repeatable and leaves an existing quiz untouched', async () => {
  const { sqlite, store } = await setup();
  try {
    await store.draft('attempt', 'owner', 'q0', "Learner's saved draft", 1);
    const quizTables = ['users', 'quiz_sessions', 'question_packages', 'answers', 'grading_revisions', 'audit_events'];
    const snapshot = () => Object.fromEntries(quizTables.map((table) =>
      [table, sqlite.prepare('SELECT * FROM ' + table + ' ORDER BY rowid').all()]));
    const before = snapshot();
    const sql = execFileSync(process.execPath,
      ['--experimental-strip-types', 'scripts/seed-content.ts', '--stdout'], { encoding: 'utf8' });
    sqlite.exec(sql);
    sqlite.exec(sql);
    assert.deepEqual(snapshot(), before);
    const rows = sqlite.prepare('SELECT * FROM chapters ORDER BY subject_id, sort_order').all();
    assert.equal(rows.length, subjects.reduce((sum, subject) => sum + subject.chapters.length, 0));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM subjects').get()!.count, subjects.length);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM sources').get()!.count, sources.length);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM specification_points').get()!.count, candidates.length);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM specification_points WHERE scope_status <> 'candidate'").get()!.count, 0);
    assert.equal(rows.filter((row) => row.content_json !== null).length, notes.length);
    for (const note of notes) {
      const row = rows.find((chapter) => chapter.subject_id === note.subjectId && chapter.slug === note.chapterId);
      assert.ok(row);
      assert.deepEqual(JSON.parse(String(row.content_json)), note);
      assert.equal(row.status, 'partial-source-checked');
      assert.equal(row.human_reviewed, 0);
    }
    for (const row of rows.filter((chapter) => chapter.content_json === null)) {
      assert.equal(row.status, 'planned');
      assert.equal(row.human_reviewed, 0);
    }
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    sqlite.close();
  }
});
