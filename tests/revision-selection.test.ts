import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subjects } from '../content/catalog.ts';
import { revisionQuestions } from '../server/revision.ts';
import { practiceChapters, selectPractice } from '../lib/revision-selection.ts';

void test('Custom practice respects multi-chapter selection, requested length and original lesson order in every subject', () => {
  for (const subject of subjects) {
    const questions = revisionQuestions(subject.id)!;
    const chapters = practiceChapters(questions);
    assert.deepEqual(chapters.map((chapter) => chapter.id), subject.chapters.map((chapter) => chapter.id));
    assert.ok(chapters.every((chapter) => chapter.count >= 2));
    assert.equal(chapters.reduce((sum, chapter) => sum + chapter.count, 0), questions.length);
    const selected = chapters.filter((_, index) => index % 2 === 0).map((chapter) => chapter.id);
    const expected = questions.filter((question) => selected.includes(question.id.split('/')[0])).slice(0, 20);
    const actual = selectPractice(questions, { chapters: selected, count: 20, order: 'lesson' });
    assert.deepEqual(actual, expected);
    assert.ok(actual.every((question) => !('answer' in question) && !('explanation' in question)));
  }
});
void test('Mixed practice makes a bounded unique sample without modifying the catalog; sparse chapters cap the set', () => {
  const questions = revisionQuestions('chemistry')!;
  const original = JSON.stringify(questions);
  const chapters = practiceChapters(questions).map((chapter) => chapter.id);
  const mixed = selectPractice(questions, { chapters, count: 30, order: 'mixed' }, () => 0);
  assert.equal(mixed.length, Math.min(30, questions.length));
  assert.equal(new Set(mixed.map((q) => q.id)).size, mixed.length);
  assert.notDeepEqual(mixed, questions.slice(0, 30));
  assert.equal(JSON.stringify(questions), original);
  const sparse = questions.slice(0, 2);
  assert.deepEqual(selectPractice([...sparse, ...sparse], { chapters, count: 30, order: 'lesson' }), sparse);
});
void test('Empty, unknown and malformed custom practice selections cannot start an unintended set', () => {
  const questions = revisionQuestions('biology')!;
  const chapters = practiceChapters(questions).map((chapter) => chapter.id);
  for (const count of [0, -1, 1.5, 31, Infinity, NaN]) assert.deepEqual(selectPractice(questions, { chapters, count, order: 'mixed' }), []);
  for (const selected of [[], ['unknown'], ['../../research']]) assert.deepEqual(selectPractice(questions, { chapters: selected, count: 10, order: 'lesson' }), []);
  assert.equal(selectPractice(questions, { chapters, count: 1, order: 'lesson' }).length, 1);
});
