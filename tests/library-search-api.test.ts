import assert from 'node:assert/strict';
import { test } from 'node:test';
import { librarySearchResponse } from '../server/library-search.ts';
import type { SearchResult } from '../lib/library-search-contract.ts';

function request(subject: string, query: string) {
  return new Request('http://localhost/api/library/search?' + new URLSearchParams({ subject, q: query }).toString());
}

void test('public search returns bounded partial-note links for all six subjects without full documents', async () => {
  const queries = { physics: 'acceleration', biology: 'nitrification', 'human-biology': 'artery', chemistry: 'electrolysis', mathematics: 'probability', english: 'perspectives' };
  for (const [subject, query] of Object.entries(queries)) {
    const response = librarySearchResponse(request(subject, query));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { results } = await response.json() as { results: SearchResult[] };
    assert.ok(results.length > 0 && results.length <= 30, subject);
    for (const result of results) {
      assert.deepEqual(Object.keys(result).sort(), ['chapter', 'href', 'score', 'snippet', 'status', 'title']);
      assert.ok(result.href.startsWith('/subjects/' + subject + '/'));
      assert.ok(result.snippet.length <= 192);
      assert.match(result.status, /incomplete|planned/);
    }
  }
  const { results } = await librarySearchResponse(request('physics', 'acceleration')).json() as { results: SearchResult[] };
  assert.equal(results[0].href, '/subjects/physics/forces-and-motion#acceleration');
});

void test('public search rejects ambiguous, invalid and oversized requests and keeps empty searches empty', async () => {
  for (const params of ['q=cell', 'subject=unknown&q=cell', 'subject=biology&subject=physics&q=cell', 'subject=physics&q=cell&q=force']) {
    assert.equal(librarySearchResponse(new Request('http://localhost/api/library/search?' + params)).status, 400);
  }
  assert.equal(librarySearchResponse(request('physics', 'x'.repeat(121))).status, 400);
  assert.equal(librarySearchResponse(request('physics', 'x'.repeat(120))).status, 200);
  for (const query of ['', '   ', '!!!']) {
    const body = await librarySearchResponse(request('physics', query)).json();
    assert.deepEqual(body, { results: [] });
  }
});
