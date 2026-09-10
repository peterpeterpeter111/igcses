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
  assert.equal(notes.length, 7);
  assert.equal(
    new Set(notes.map((note) => note.subjectId + ':' + note.chapterId)).size,
    notes.length,
  );
  for (const note of notes) {
    const subject = subjects.find(
      (candidate) => candidate.id === note.subjectId,
    );
    assert.ok(subject);
    assert.ok(
      subject.chapters.some((chapter) => chapter.id === note.chapterId),
    );
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
  const subjectsFound = new Set(
    results.map((result) => result.href.split('/')[2]),
  );
  assert.ok(subjectsFound.has('human-biology'));
  assert.ok(subjectsFound.has('biology'));
  assert.ok(
    results.every((result) =>
      /chapter incomplete|notes not written/.test(result.status),
    ),
  );
});

test('teaching diagrams and nested material have valid searchable chapter targets', async () => {
  const { existsSync } = await import('node:fs');
  for (const note of notes) {
    for (const section of note.sections) {
      assert.match(section.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      if (section.diagram) {
        assert.match(section.diagram.src, /^\/diagrams\/[a-z0-9-]+\.svg$/);
        assert.ok(existsSync('public' + section.diagram.src));
        assert.ok(section.diagram.alt && section.diagram.caption);
      }
    }
  }
  for (const [query, heading] of [
    ['light gates', 'investigating-motion'],
    ['systematic calibration', 'investigating-motion'],
    ['crumple', 'momentum-and-safety'],
    ['parallax', 'force-extension'],
    ['time-base', 'oscilloscope-frequency'],
    ['critical angle', 'critical-angle'],
  ]) {
    assert.ok(
      searchAll(query).some((result) => result.href.endsWith('#' + heading)),
      query,
    );
  }
});
