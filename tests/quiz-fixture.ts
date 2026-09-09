import { testDatabase } from './d1-fixture.ts';
import { SessionStore } from '../server/session-store.ts';
import { freezeQuestion } from '../server/question-package.ts';
import { BLUEPRINT } from '../server/quiz-contract.ts';
export async function setup() {
  const { db, sqlite } = testDatabase(),
    store = new SessionStore(db);
  const q = await Promise.all(
    BLUEPRINT.map((maxMarks, position) =>
      freezeQuestion({
        public: {
          id: 'q' + position,
          position,
          prompt: 'Synthetic fixture ' + position,
          stimulus: '',
          maxMarks,
        },
        templateId: 'test-only',
        templateVersion: '0',
        seed: String(position),
        sourceTaskIds: ['synthetic'],
        solution: 'SECRET_SOLUTION',
        rubric: [{ id: 'a', marks: maxMarks, description: 'SECRET_RUBRIC' }],
        validation: { passed: true, validatorVersion: 'fixture' },
      }),
    ),
  );
  await store.create('attempt', 'owner', 'physics', q);
  return { db, sqlite, store, q };
}
