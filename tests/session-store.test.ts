import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionStore } from '../server/session-store.ts';
import { setup } from './quiz-fixture.ts';
void test('D1 migration and store preserve owner isolation and private packages', async () => {
  const { store, sqlite } = await setup();
  await assert.rejects(() => store.current('attempt', 'other'));
  await assert.rejects(() => store.results('attempt', 'owner'));
  assert.equal((await store.history('other')).length, 0);
  assert.ok(
    !JSON.stringify(await store.current('attempt', 'owner')).includes('SECRET'),
  );
  sqlite.close();
});
void test('drafts survive store recreation; old draft versions cannot overwrite newer text', async () => {
  const { db, store, sqlite } = await setup();
  await store.draft('attempt', 'owner', 'q0', 'first', 1);
  assert.deepEqual(await store.draft('attempt', 'owner', 'q0', 'new', 2), {
    saved: true,
    applied: true,
    superseded: false,
    revision: 2,
  });
  assert.deepEqual(await store.draft('attempt', 'owner', 'q0', 'old', 1), {
    saved: false,
    applied: false,
    superseded: true,
    revision: 2,
  });
  assert.equal(
    (await new SessionStore(db).current('attempt', 'owner')).draft,
    'new',
  );
  await store.submit('attempt', 'owner', 'q0', 'final', 'k');
  await assert.rejects(() =>
    store.draft('attempt', 'owner', 'q0', 'too late', 3),
  );
  sqlite.close();
});
void test('simultaneous drafts use compare-and-swap and retries acknowledge only identical text', async () => {
  const { store, sqlite } = await setup();
  const responses = await Promise.all(
    ['one', 'two'].map((text) =>
      store.draft('attempt', 'owner', 'q0', text, 1),
    ),
  );
  assert.equal(responses.filter((r) => r.applied).length, 1);
  assert.equal(responses.filter((r) => r.superseded).length, 1);
  const current = await store.current('attempt', 'owner');
  assert.equal(current.draftRevision, 1);
  const retry = await store.draft('attempt', 'owner', 'q0', current.draft, 1);
  assert.equal(retry.saved, true);
  assert.equal(retry.applied, false);
  assert.equal(
    (await store.draft('attempt', 'owner', 'q0', 'jump', 9999)).saved,
    false,
  );
  sqlite.close();
});
void test('simultaneous identical submissions advance once; conflicting submissions cannot replace the winner', async () => {
  const { store, sqlite } = await setup();
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      store.submit('attempt', 'owner', 'q0', 'same', 'key'),
    ),
  );
  assert.ok(responses.every((r) => r.position === 1));
  const contested = await Promise.allSettled(
    ['A', 'B'].map((text) =>
      store.submit('attempt', 'owner', 'q1', text, text),
    ),
  );
  assert.equal(contested.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(contested.filter((r) => r.status === 'rejected').length, 1);
  assert.equal((await store.current('attempt', 'owner')).position, 2);
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM answers WHERE status='submitted'")
      .get()?.n,
    2,
  );
  sqlite.close();
});
void test('a racing draft cannot overwrite a submitted answer', async () => {
  const { store, sqlite } = await setup();
  await Promise.allSettled([
    store.draft('attempt', 'owner', 'q0', 'draft', 1),
    store.submit('attempt', 'owner', 'q0', 'final', 'k'),
  ]);
  const saved = sqlite
    .prepare('SELECT text,status FROM answers WHERE package_id=?')
    .get('q0');
  assert.equal(saved?.text, 'final');
  assert.equal(saved?.status, 'submitted');
  assert.equal((await store.current('attempt', 'owner')).position, 1);
  sqlite.close();
});
void test('a failed answer write rolls the session position back', async () => {
  const { store, sqlite } = await setup();
  sqlite.exec(
    "CREATE TRIGGER fail_answer BEFORE INSERT ON answers BEGIN SELECT RAISE(ABORT,'fixture failure'); END;",
  );
  await assert.rejects(() =>
    store.submit('attempt', 'owner', 'q0', 'answer', 'k'),
  );
  assert.equal((await store.current('attempt', 'owner')).position, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM answers').get()?.n, 0);
  sqlite.close();
});
void test('retry after reload does not advance or overwrite twice', async () => {
  const { db, store, sqlite } = await setup();
  await store.submit('attempt', 'owner', 'q0', 'answer', 'key');
  const retry = await new SessionStore(db).submit(
    'attempt',
    'owner',
    'q0',
    'answer',
    'key',
  );
  assert.equal(retry.position, 1);
  await assert.rejects(() =>
    store.submit('attempt', 'owner', 'q0', 'changed', 'key'),
  );
  sqlite.close();
});
void test('all answers and marking persist before schemes become accessible', async () => {
  const { store, q, sqlite } = await setup();
  for (let i = 0; i < 22; i++)
    await store.submit('attempt', 'owner', 'q' + i, 'answer', 'k' + i);
  await assert.rejects(() => store.results('attempt', 'owner'));
  const grades = q.map((x) => ({
    questionId: x.public.id,
    earnedMarks: 1,
    rationale: 'test',
    rubricHash: x.packageHash,
    revision: 1,
  }));
  await store.complete('attempt', 'owner', grades, 'synthetic');
  assert.equal((await store.results('attempt', 'owner')).total, 22);
  assert.equal((await store.history('owner')).length, 1);
  await assert.rejects(() => store.remove('attempt', 'other'));
  await store.remove('attempt', 'owner');
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS n FROM question_packages').get()?.n,
    0,
  );
  sqlite.close();
});
void test('tampering with a stored question is detected', async () => {
  const { store, sqlite } = await setup();
  sqlite
    .prepare(
      "UPDATE question_packages SET private_json=replace(private_json,'SECRET_SOLUTION','TAMPERED') WHERE id='q0'",
    )
    .run();
  await assert.rejects(() => store.current('attempt', 'owner'), /integrity/);
  sqlite.close();
});
