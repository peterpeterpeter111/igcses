import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchLibrarySearchResults, queueLibrarySearch, type SearchState, type SearchTransport } from '../lib/library-search-client.ts';
import type { SearchResult } from '../lib/library-search-contract.ts';

const hit: SearchResult = { title: 'Acceleration', chapter: 'Forces and motion', href: '/subjects/physics/forces-and-motion#acceleration', snippet: 'Change of velocity per second.', status: 'Source-checked note · chapter incomplete', score: 100 };
function deferred() {
  let resolve!: (value: SearchResult[]) => void;
  let reject!: (reason: Error) => void;
  const result = new Promise<SearchResult[]>((yes, no) => { resolve = yes; reject = no; });
  let start!: () => void;
  const started = new Promise<void>((yes) => { start = yes; });
  let signal: AbortSignal;
  const transport: SearchTransport = (_subject, _query, inputSignal) => { signal = inputSignal; start(); return result; };
  return { resolve, reject, started, transport, aborted: () => signal.aborted };
}

void test('late success or failure from an old query cannot overwrite a newer search', async () => {
  for (const outcome of ['success', 'failure']) {
    const old = deferred(), current = deferred();
    const oldStates: SearchState[] = [], newStates: SearchState[] = [];
    const cancelOld = queueLibrarySearch('physics', 'old', (s) => oldStates.push(s), old.transport, 0);
    await old.started;
    cancelOld();
    const cancelCurrent = queueLibrarySearch('physics', 'acceleration', (s) => newStates.push(s), current.transport, 0);
    await current.started;
    current.resolve([hit]);
    await Promise.resolve();
    if (outcome === 'success') old.resolve([]); else old.reject(new Error('old failure'));
    await Promise.resolve();
    assert.equal(old.aborted(), true);
    assert.deepEqual(oldStates, [{ status: 'loading', results: [] }]);
    assert.deepEqual(newStates.at(-1), { status: 'ready', results: [hit] });
    cancelCurrent();
  }
});

void test('clearing input or leaving the reader cancels queued and dispatched search work', async () => {
  let calls = 0;
  const queued = queueLibrarySearch('physics', 'force', () => {}, async () => { calls++; return [hit]; }, 60000);
  queued();
  assert.equal(calls, 0);
  const pending = deferred(), states: SearchState[] = [];
  const cancel = queueLibrarySearch('physics', 'force', (s) => states.push(s), pending.transport, 0);
  await pending.started;
  cancel();
  pending.resolve([hit]);
  await Promise.resolve();
  assert.equal(pending.aborted(), true);
  assert.deepEqual(states, [{ status: 'loading', results: [] }]);
});

void test('a failed search shows a failure state and a new retry can recover', async () => {
  const failure = deferred(), states: SearchState[] = [];
  const cancel = queueLibrarySearch('physics', 'force', (s) => states.push(s), failure.transport, 0);
  await failure.started;
  failure.reject(new Error('unavailable'));
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { status: 'error', results: [] });
  cancel();
  const success = deferred();
  const cancelRetry = queueLibrarySearch('physics', 'force', (s) => states.push(s), success.transport, 0);
  await success.started;
  success.resolve([hit]);
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { status: 'ready', results: [hit] });
  cancelRetry();
});

void test('a hung request times out and a late reply cannot hide the retry state', async () => {
  const pending = deferred(), states: SearchState[] = [];
  let expired!: () => void;
  const timeout = new Promise<void>((resolve) => { expired = resolve; });
  const cancel = queueLibrarySearch('physics', 'force', (state) => {
    states.push(state);
    if (state.status === 'error') expired();
  }, pending.transport, 0, 1);
  await pending.started;
  await timeout;
  assert.equal(pending.aborted(), true);
  pending.resolve([hit]);
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { status: 'error', results: [] });
  cancel();
});

void test('search transport encodes queries and refuses HTTP errors or invalid subject links', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let captured = '';
  try {
    globalThis.fetch = (input, init) => {
      assert.ok(typeof input === 'string');
      captured = input;
      assert.equal(init?.signal, controller.signal);
      return Promise.resolve(Response.json({ results: [hit] }));
    };
    assert.deepEqual(await fetchLibrarySearchResults('physics', 'force & motion', controller.signal), [hit]);
    const params = new URL(captured, 'http://localhost').searchParams;
    assert.equal(params.get('subject'), 'physics');
    assert.equal(params.get('q'), 'force & motion');
    for (const response of [Response.json({}, { status: 503 }), Response.json({ results: [{ ...hit, href: 'javascript:alert(1)' }] }), Response.json({ results: [{ ...hit, href: '/subjects/biology/ecology' }] }), Response.json({ results: null })]) {
      globalThis.fetch = () => Promise.resolve(response);
      await assert.rejects(fetchLibrarySearchResults('physics', 'force', controller.signal));
    }
  } finally { globalThis.fetch = originalFetch; }
});
