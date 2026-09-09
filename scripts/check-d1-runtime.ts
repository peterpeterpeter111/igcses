// Isolated local Miniflare D1: never points at development or production data.
import { Miniflare } from 'miniflare';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SessionStore } from '../server/session-store.ts';
import { freezeQuestion } from '../server/question-package.ts';
import { BLUEPRINT } from '../server/quiz-contract.ts';
const runtime = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("test-only")}}',
  compatibilityDate: '2026-05-22',
  d1Databases: ['DB'],
  d1Persist: false,
});
try {
  const db = await runtime.getD1Database('DB');
  for (const file of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const statements = readFileSync('drizzle/' + file, 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  await db
    .prepare('INSERT INTO subjects(id,code,title) VALUES (?,?,?)')
    .bind('physics', '4PH1', 'Physics')
    .run();
  const store = new SessionStore(db as unknown as D1Database);
  const questions = await Promise.all(
    BLUEPRINT.map((maxMarks, position) =>
      freezeQuestion({
        public: {
          id: 'runtime-q' + position,
          position,
          prompt: 'Synthetic runtime fixture ' + position,
          stimulus: '',
          maxMarks,
        },
        templateId: 'test-only',
        templateVersion: '0',
        seed: String(position),
        sourceTaskIds: ['synthetic'],
        solution: 'SECRET_SOLUTION',
        rubric: [{ id: 'test', marks: maxMarks, description: 'SECRET_RUBRIC' }],
        validation: { passed: true, validatorVersion: 'test-only' },
      }),
    ),
  );
  await store.create('runtime-test', 'owner', 'physics', questions);
  const drafts = await Promise.all(
    ['A', 'B'].map((text) =>
      store.draft('runtime-test', 'owner', 'runtime-q0', text, 1),
    ),
  );
  assert.equal(drafts.filter((r) => r.applied).length, 1);
  const submits = await Promise.all(
    Array.from({ length: 8 }, () =>
      store.submit('runtime-test', 'owner', 'runtime-q0', 'final', 'same-key'),
    ),
  );
  assert.ok(submits.every((r) => r.position === 1));
  const race = await Promise.allSettled(
    ['one', 'two'].map((answer) =>
      store.submit('runtime-test', 'owner', 'runtime-q1', answer, answer),
    ),
  );
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await store.current('runtime-test', 'owner')).position, 2);
  await assert.rejects(() => store.current('runtime-test', 'other'));
  await assert.rejects(() => store.results('runtime-test', 'owner'));
  assert.ok(
    !JSON.stringify(await store.current('runtime-test', 'owner')).includes(
      'SECRET',
    ),
  );
  for (let i = 2; i < 22; i++)
    await store.submit(
      'runtime-test',
      'owner',
      'runtime-q' + i,
      'answer',
      'k' + i,
    );
  const grades = questions.map((q) => ({
    questionId: q.public.id,
    earnedMarks: 1,
    rationale: 'fixture',
    rubricHash: q.packageHash,
    revision: 1,
  }));
  const marked = await Promise.allSettled([
    store.complete('runtime-test', 'owner', grades, 'test'),
    store.complete('runtime-test', 'owner', grades, 'test'),
  ]);
  assert.equal(marked.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await store.results('runtime-test', 'owner')).total, 22);
  await store.remove('runtime-test', 'owner');
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) n FROM question_packages')
        .first<{ n: number }>()
    )?.n,
    0,
  );
  console.log(
    'PASS: local Cloudflare D1 migrations, concurrent drafts/submissions/marking, ownership, private results and cascade deletion. Synthetic data only; no production calls.',
  );
} finally {
  await runtime.dispose();
}
