import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT,
  createAttempt,
  submitAnswer,
  finishMarking,
  publicAttempt,
  releaseResults,
  validateBlueprint,
  type PrivateQuestion,
} from '../server/quiz-contract.ts';
function fixture() {
  const questions: PrivateQuestion[] = BLUEPRINT.map((maxMarks, position) => ({
    public: {
      id: 'q' + position,
      position,
      prompt: 'Synthetic contract fixture ' + position,
      stimulus: 'Test only',
      maxMarks,
    },
    templateId: 'test-fixture',
    templateVersion: '0',
    seed: String(position),
    sourceTaskIds: ['synthetic-not-a-paper'],
    solution: 'PRIVATE_SOLUTION',
    rubric: [
      { id: 'criterion', marks: maxMarks, description: 'PRIVATE_RUBRIC' },
    ],
    validation: { passed: true, validatorVersion: 'fixture' },
    packageHash: 'fixture-hash',
  }));
  return createAttempt('a', 'owner', 'physics', questions);
}
test('blueprint is exactly 80 with the approved mark distribution', () => {
  validateBlueprint(BLUEPRINT);
  assert.throws(() => validateBlueprint(Array(20).fill(4)));
});
test('pre-completion response contains no private package fields', () => {
  const value = JSON.stringify(publicAttempt(fixture(), 'owner'));
  for (const term of [
    'PRIVATE',
    'rubric',
    'solution',
    'template',
    'seed',
    'sourceTask',
  ])
    assert.ok(!value.includes(term));
});
test('other users cannot see a question or release results', () => {
  assert.throws(() => publicAttempt(fixture(), 'other'));
  assert.throws(() => releaseResults(fixture(), 'other'));
});
test('blank answer requires confirmation; out-of-order answers are rejected', () => {
  assert.throws(() => submitAnswer(fixture(), 'owner', 'q0', '', 'k'));
  assert.throws(() => submitAnswer(fixture(), 'owner', 'q1', 'answer', 'k'));
  assert.equal(
    submitAnswer(fixture(), 'owner', 'q0', '', 'k', true).position,
    1,
  );
});
test('identical retries are idempotent; changed repeats conflict', () => {
  const a = submitAnswer(fixture(), 'owner', 'q0', 'hello', 'key');
  assert.equal(submitAnswer(a, 'owner', 'q0', 'hello', 'key').position, 1);
  assert.throws(() => submitAnswer(a, 'owner', 'q0', 'changed', 'key'));
});
test('marking begins only after all 22 answers; schemes stay locked until completed marking', () => {
  let a = fixture();
  assert.throws(() => releaseResults(a, 'owner'));
  for (let i = 0; i < 22; i++)
    a = submitAnswer(a, 'owner', 'q' + i, 'student answer', 'k' + i);
  assert.equal(a.status, 'marking');
  assert.throws(() => releaseResults(a, 'owner'));
  const grades = a.questions.map((q) => ({
    questionId: q.public.id,
    earnedMarks: 1,
    rationale: 'fixture',
    rubricHash: 'fixture-hash',
    revision: 1,
  }));
  const result = releaseResults(finishMarking(a, 'owner', grades), 'owner');
  assert.equal(result.total, 22);
  assert.equal(result.percentage, 27.5);
  assert.equal(result.questions[0].solution, 'PRIVATE_SOLUTION');
  assert.throws(() =>
    finishMarking(
      a,
      'owner',
      grades.map((g) => ({ ...g, earnedMarks: 7 })),
    ),
  );
});
test('unvalidated packages and unreconciled rubrics cannot start a session', () => {
  const a = fixture();
  a.questions[0].validation.passed = false;
  assert.throws(() => createAttempt('b', 'owner', 'physics', a.questions));
  const b = fixture();
  b.questions[0].rubric[0].marks = 6;
  assert.throws(() => createAttempt('b', 'owner', 'physics', b.questions));
});
