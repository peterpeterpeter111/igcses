import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subjects } from '../content/catalog.ts';
import { notes } from '../content/notes.ts';
import { searchAll } from '../lib/library.ts';

test('catalog contains six uniquely addressable subjects and chapters', () => {
  assert.equal(subjects.length, 6);
  assert.equal(new Set(subjects.map((subject) => subject.id)).size, 6);
  assert.equal(new Set(subjects.map((subject) => subject.code)).size, 6);

  for (const subject of subjects) {
    assert.ok(subject.id && subject.code && subject.title);
    const chapterIds = subject.chapters.map((chapter) => chapter.id);
    assert.equal(new Set(chapterIds).size, chapterIds.length);
    assert.ok(chapterIds.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)));
    assert.ok(subject.chapters.every((chapter) => chapter.complete === false));
  }
});

test('partial notes point to catalog chapters and retain incomplete status', () => {
  assert.equal(notes.length, 6);
  for (const note of notes) {
    const subject = subjects.find((candidate) => candidate.id === note.subjectId);
    assert.ok(subject);
    assert.ok(subject.chapters.some((chapter) => chapter.id === note.chapterId));
    assert.equal(note.complete, false);
    assert.equal(note.humanReviewed, false);
    assert.ok(note.sections.length > 0);
    assert.equal(
      new Set(note.sections.map((section) => section.id)).size,
      note.sections.length,
    );
  }
});

test('cross-subject search returns each matching subject without mutating content', () => {
  const results = searchAll('mitochondria');
  const subjectsFound = new Set(results.map((result) => result.href.split('/')[2]));
  assert.ok(subjectsFound.has('human-biology'));
  assert.ok(subjectsFound.has('biology'));
  assert.ok(
    results.every((result) =>
      /chapter incomplete|notes not written/.test(result.status),
    ),
  );
});
