import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationTransition } from '../lib/navigation-transition.ts';

function animation() {
  let finish!: () => void;
  let reject!: (error: Error) => void;
  let cancellations = 0;
  const finished = new Promise<void>((resolve, fail) => {
    finish = resolve;
    reject = fail;
  });
  return {
    finished,
    finish,
    cancel() {
      cancellations++;
      reject(new Error('cancelled'));
    },
    get cancellations() {
      return cancellations;
    },
  };
}

void test('completed exit retains cleanup and restores a stalled navigation', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const transition = createNavigationTransition();
  const a = animation();
  let routes = 0,
    restores = 0;
  const done = transition.start(
    (track) => track(a),
    () => {
      routes++;
    },
    () => {
      restores++;
    },
  );
  assert.equal(routes, 0);
  a.finish();
  await done;
  assert.equal(routes, 1);
  assert.equal(transition.running, true);
  t.mock.timers.tick(1500);
  assert.equal(transition.running, false);
  assert.equal(a.cancellations, 1);
  assert.equal(restores, 1);
});

void test('unmount or Back cancels every effect and prevents stale navigation', async () => {
  const transition = createNavigationTransition();
  const a = animation(),
    b = animation();
  let routes = 0,
    restores = 0;
  const done = transition.start(
    (track) => {
      track(a);
      track(b);
    },
    () => {
      routes++;
    },
    () => {
      restores++;
    },
  );
  transition.cancel();
  a.finish();
  b.finish();
  await done;
  assert.equal(routes, 0);
  assert.equal(restores, 1);
  assert.equal(a.cancellations + b.cancellations, 2);
  assert.equal(transition.running, false);
});

void test('duplicate clicks and an animation that never finishes cannot lock navigation', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const transition = createNavigationTransition();
  const a = animation();
  let routes = 0,
    starts = 0;
  const done = transition.start(
    (track) => {
      starts++;
      track(a);
    },
    () => {
      routes++;
    },
    () => {},
  );
  await transition.start(
    () => {
      starts++;
    },
    () => {
      routes++;
    },
    () => {},
  );
  assert.equal(starts, 1);
  t.mock.timers.tick(2200);
  await done;
  assert.equal(transition.running, false);
  assert.equal(routes, 0);
});

void test('construction failure restores earlier effects and falls back to navigation', async () => {
  const transition = createNavigationTransition();
  const a = animation();
  let routes = 0,
    restores = 0;
  await transition.start(
    (track) => {
      track(a);
      throw new Error('unsupported effect');
    },
    () => {
      routes++;
    },
    () => {
      restores++;
    },
  );
  assert.equal(routes, 1);
  assert.equal(restores, 1);
  assert.equal(a.cancellations, 1);
  assert.equal(transition.running, false);
});

void test('failed push restores immediately and a stale completion cannot cancel a new exit', async () => {
  const transition = createNavigationTransition();
  const a = animation();
  const first = transition.start(
    (track) => track(a),
    () => {
      throw new Error('route failed');
    },
    () => {},
  );
  a.finish();
  await first;
  assert.equal(a.cancellations, 1);
  const b = animation();
  const second = transition.start(
    (track) => track(b),
    () => {},
    () => {},
  );
  transition.cancel();
  const c = animation();
  const third = transition.start(
    (track) => track(c),
    () => {},
    () => {},
  );
  await second;
  assert.equal(transition.running, true);
  assert.equal(c.cancellations, 0);
  transition.cancel();
  await third;
});
