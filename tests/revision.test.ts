import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subjects } from '../content/catalog.ts';
import { getNotes } from '../content/notes.ts';
import { revisionQuestions, revisionAnswerResponse } from '../server/revision.ts';
const request = (data: unknown, origin = 'https://study.example') => new Request('https://study.example/api/revision/answer', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify(data) });
void test('Every subject has original revision exercises with stable, subject-owned lesson links and no answer payload', () => {
  for (const subject of subjects) {
    const questions = revisionQuestions(subject.id)!;
    assert.ok(questions.length >= 10);
    assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
    for (const q of questions) {
      assert.deepEqual(Object.keys(q).sort(), ['chapter', 'heading', 'id', 'lessonHref', 'prompt']);
      assert.ok(q.lessonHref.startsWith(`/subjects/${subject.id}/`));
      const [chapter, section] = q.id.split('/');
      assert.equal(getNotes(subject.id, chapter)?.sections.find((s) => s.id === section)?.practice?.question, q.prompt);
    }
  }
  assert.equal(revisionQuestions('unknown'), null);
  assert.equal(revisionQuestions('biology', 'unknown'), null);
  const selected = revisionQuestions('biology', 'ecology')!;
  assert.ok(selected.length);
  assert.ok(selected.every((q) => q.id.startsWith('ecology/')));
});
void test('Revision reveal returns only the original public lesson explanation and keeps exam rubrics outside the route', async () => {
  const q = revisionQuestions('english', 'spoken-language')![0];
  const response = await revisionAnswerResponse(request({ subject: 'english', id: q.id }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(Object.keys(data as object).sort(), ['answer', 'explanation']);
  const [chapter, section] = q.id.split('/');
  const practice = getNotes('english', chapter)?.sections.find((s) => s.id === section)?.practice;
  assert.deepEqual(data, { answer: practice?.answer, explanation: practice?.explanation });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
void test('Revision reveal rejects cross-origin requests, unknown subjects/IDs, surplus fields and oversized UTF-8 input', async () => {
  const q = revisionQuestions('physics')![0];
  const input = { subject: 'physics', id: q.id };
  assert.equal((await revisionAnswerResponse(request(input, 'https://elsewhere.example'))).status, 403);
  assert.equal((await revisionAnswerResponse(request({ ...input, subject: 'english' }))).status, 404);
  assert.equal((await revisionAnswerResponse(request({ ...input, id: '../../research/templates/private' }))).status, 404);
  for (const data of [null, [], { subject: 'physics' }, { ...input, answer: 'Do not send learner text' }, { ...input, id: 3 }]) assert.equal((await revisionAnswerResponse(request(data))).status, 400);
  assert.equal((await revisionAnswerResponse(request({ ...input, id: '界'.repeat(200) }))).status, 413);
  const bad = new Request('https://study.example/api/revision/answer', { method: 'POST', headers: { Origin: 'https://study.example' }, body: '{' });
  assert.equal((await revisionAnswerResponse(bad)).status, 400);
});
