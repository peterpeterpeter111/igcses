import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuizClient, RequestError } from '../lib/quiz-client.ts';
import { QuizError } from '../server/quiz-contract.ts';
import { setup } from './quiz-fixture.ts';
type Transport = NonNullable<ConstructorParameters<typeof QuizClient>[1]>;
async function fixture() {
  const { store, sqlite } = await setup();
  const transport: Transport = async (path, body) => {
    try {
      if (body?.action === 'draft')
        return await store.draft(
          'attempt',
          'owner',
          body.questionId,
          body.answer,
          body.revision,
        );
      if (body?.action === 'submit')
        return await store.submit(
          'attempt',
          'owner',
          body.questionId,
          body.answer,
          body.key,
          body.skipConfirmed,
        );
      return path.endsWith('/results')
        ? await store.results('attempt', 'owner')
        : await store.current('attempt', 'owner');
    } catch (error) {
      if (error instanceof QuizError)
        throw new RequestError(
          error.message,
          error.code === 'NOT_FOUND' ? 404 : 409,
        );
      throw error;
    }
  };
  return { store, sqlite, transport };
}
test('a lost submission response is retried with the same frozen answer and key', async () => {
  const { transport, store, sqlite } = await fixture();
  let dropped = false;
  const keys: string[] = [];
  const client = new QuizClient('/session', async (path, body) => {
    const result = await transport(path, body);
    if (body?.action === 'submit') {
      keys.push(body.key);
      if (!dropped) {
        dropped = true;
        throw new Error('Lost response');
      }
    }
    return result;
  });
  await client.load();
  client.edit('original answer');
  await client.submit();
  assert.equal(client.snapshot().uncertain, true);
  client.edit('must not replace uncertain submission');
  assert.equal(client.snapshot().answer, 'original answer');
  await client.submit();
  assert.equal(keys[0], keys[1]);
  assert.equal(client.snapshot().view?.position, 1);
  assert.equal(
    (await store.load('attempt', 'owner')).attempt.answers.q0.text,
    'original answer',
  );
  client.dispose();
  sqlite.close();
});
test('editing during a dispatched save queues the newest text without overlapping draft writes', async () => {
  const { transport, store, sqlite } = await fixture();
  let release!: () => void;
  let count = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const client = new QuizClient('/session', async (path, body) => {
    if (body?.action === 'draft' && count++ === 0) await gate;
    return transport(path, body);
  });
  await client.load();
  client.edit('first');
  const save = client.save();
  client.edit('newest');
  release();
  await save;
  assert.equal(count, 2);
  assert.equal(client.snapshot().dirty, false);
  assert.equal((await store.current('attempt', 'owner')).draft, 'newest');
  client.dispose();
  sqlite.close();
});
test('two tabs cannot silently overwrite each other; reload preserves conflicting local text', async () => {
  const { transport, store, sqlite } = await fixture();
  const first = new QuizClient('/session', transport),
    second = new QuizClient('/session', transport);
  await Promise.all([first.load(), second.load()]);
  first.edit('tab one');
  second.edit('tab two');
  await first.save();
  await second.save();
  assert.equal(second.snapshot().conflict, true);
  await second.load();
  assert.equal(second.snapshot().answer, 'tab one');
  assert.equal(second.snapshot().recovery?.text, 'tab two');
  second.restoreRecovery();
  await second.save();
  assert.equal((await store.current('attempt', 'owner')).draft, 'tab two');
  first.dispose();
  second.dispose();
  sqlite.close();
});
test('reload after an uncertain submission keeps local text away from the next question', async () => {
  const { transport, sqlite } = await fixture();
  const client = new QuizClient('/session', async (path, body) => {
    const r = await transport(path, body);
    if (body?.action === 'submit') throw new Error('Offline after commit');
    return r;
  });
  await client.load();
  client.edit('answer to first');
  await client.submit();
  await client.load();
  assert.equal(client.snapshot().view?.question?.id, 'q1');
  assert.equal(client.snapshot().answer, '');
  assert.equal(client.snapshot().recovery?.text, 'answer to first');
  client.restoreRecovery();
  assert.equal(client.snapshot().answer, '');
  client.dispose();
  sqlite.close();
});
test('lost draft acknowledgements retry the same revision before saving subsequent edits', async () => {
  const { transport, store, sqlite } = await fixture();
  let dropped = false;
  const client = new QuizClient('/session', async (path, body) => {
    const r = await transport(path, body);
    if (body?.action === 'draft' && !dropped) {
      dropped = true;
      throw new Error('Lost draft reply');
    }
    return r;
  });
  await client.load();
  client.edit('first');
  await client.save();
  assert.equal(client.snapshot().dirty, true);
  client.edit('second');
  await client.save();
  assert.equal(client.snapshot().dirty, false);
  assert.equal((await store.current('attempt', 'owner')).draft, 'second');
  client.dispose();
  sqlite.close();
});
test(
  'remount ignores stale responses and account failures clear cached quiz data',
  { timeout: 5000 },
  async (t) => {
    const { transport, sqlite } = await fixture();
    let release!: () => void;
    let first = true;
    let forbidden = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client = new QuizClient('/session', async (path, body) => {
      if (forbidden) throw new RequestError('No account', 401);
      // Claim the first invocation before awaiting a response: responses can race.
      const hold = first;
      first = false;
      const r = await transport(path, body);
      if (hold) await gate;
      return r;
    });
    t.after(() => {
      release();
      client.dispose();
      sqlite.close();
    });
    const initial = client.load();
    client.dispose();
    client.resume();
    await client.load();
    release();
    await initial;
    assert.equal(client.snapshot().view?.question?.id, 'q0');
    assert.equal(client.snapshot().busy, false);
    client.edit('private text');
    forbidden = true;
    await client.load();
    assert.equal(client.snapshot().view, null);
    assert.equal(client.snapshot().answer, '');
    assert.equal(client.snapshot().recovery, null);
  },
);

test(
  'disposing during a draft save prevents the old submit from dispatching',
  { timeout: 5000 },
  async (t) => {
    const { transport, store, sqlite } = await fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let submits = 0;
    const client = new QuizClient('/session', async (path, body) => {
      if (body?.action === 'draft') await gate;
      if (body?.action === 'submit') submits++;
      return transport(path, body);
    });
    t.after(() => {
      release();
      client.dispose();
      sqlite.close();
    });
    await client.load();
    client.edit('keep this as a draft');
    const submission = client.submit();
    client.dispose();
    client.resume();
    const reload = client.load();
    release();
    await Promise.all([submission, reload]);
    assert.equal(submits, 0);
    assert.equal(client.snapshot().view?.position, 0);
    assert.equal(
      (await store.current('attempt', 'owner')).draft,
      'keep this as a draft',
    );
  },
);

test(
  'restoring while a reload is busy preserves the recovery copy',
  { timeout: 5000 },
  async (t) => {
    const { transport, sqlite } = await fixture();
    let release!: () => void;
    let hold = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = new QuizClient('/session', transport);
    const second = new QuizClient('/session', async (path, body) => {
      if (hold && !body) await gate;
      return transport(path, body);
    });
    t.after(() => {
      release();
      first.dispose();
      second.dispose();
      sqlite.close();
    });
    await Promise.all([first.load(), second.load()]);
    first.edit('server copy');
    await first.save();
    second.edit('local copy');
    await second.save();
    await second.load();
    assert.equal(second.snapshot().recovery?.text, 'local copy');
    hold = true;
    const reload = second.load();
    second.restoreRecovery();
    assert.equal(second.snapshot().recovery?.text, 'local copy');
    release();
    await reload;
    second.restoreRecovery();
    assert.equal(second.snapshot().answer, 'local copy');
    assert.equal(second.snapshot().dirty, true);
  },
);
