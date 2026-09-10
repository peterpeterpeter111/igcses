import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subjects } from '../content/catalog.ts';
import { searchLibrary } from '../lib/library.ts';

const physics = subjects.find((subject) => subject.id === 'physics');
assert.ok(physics);

void test('library search returns chapter terms and stable deep links', () => {
  const results = searchLibrary(physics, 'acceleration');
  assert.ok(results.length > 0);
  assert.equal(results[0]?.chapter, 'Forces and motion');
  assert.equal(
    results[0]?.href,
    '/subjects/physics/forces-and-motion#acceleration',
  );
  assert.match(results[0]?.status ?? '', /chapter incomplete/);
});

void test('library search tolerates a single typo in a long term', () => {
  const results = searchLibrary(physics, 'refracton');
  assert.ok(results.some((result) => result.chapter === 'Waves'));
  assert.ok(
    results.every((result) => result.href.startsWith('/subjects/physics/')),
  );
});

void test('empty and punctuation-only queries are deterministic no-ops', () => {
  assert.deepEqual(searchLibrary(physics, ''), []);
  assert.deepEqual(searchLibrary(physics, '!!!'), []);
});
