import type { SearchResult } from './library-search-contract.ts';

export type SearchState =
  | { status: 'loading'; results: SearchResult[] }
  | { status: 'ready'; results: SearchResult[] }
  | { status: 'error'; results: SearchResult[] };
export type SearchTransport = (subjectId: string, query: string, signal: AbortSignal) => Promise<SearchResult[]>;

export async function fetchLibrarySearchResults(subjectId: string, query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({ subject: subjectId, q: query });
  const response = await fetch('/api/library/search?' + params.toString(), { signal });
  if (!response.ok) throw new Error('Search unavailable');
  const payload: unknown = await response.json();
  const results = (payload as { results?: unknown } | null)?.results;
  if (!Array.isArray(results) || results.length > 30 || !results.every((r: unknown) => {
    if (!r || typeof r !== 'object') return false;
    const item = r as Record<string, unknown>;
    return ['title', 'chapter', 'snippet', 'status'].every((key) => typeof item[key] === 'string')
      && typeof item.href === 'string' && item.href.startsWith('/subjects/' + subjectId + '/')
      && typeof item.score === 'number' && Number.isFinite(item.score);
  })) throw new Error('Invalid search response');
  return results as SearchResult[];
}

// Effect cleanup cancels pending timers and guards even a transport which ignores
// abort. An old query, failed request or unmounted reader cannot replace new hits.
export function queueLibrarySearch(
  subjectId: string,
  query: string,
  update: (state: SearchState) => void,
  transport: SearchTransport = fetchLibrarySearchResults,
  delay = 180,
  timeout = 10000,
) {
  let active = true;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  update({ status: 'loading', results: [] });
  const timer = setTimeout(() => {
    deadline = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      update({ status: 'error', results: [] });
    }, timeout);
    void transport(subjectId, query, controller.signal).then(
      (results) => { clearTimeout(deadline); if (active) update({ status: 'ready', results }); },
      () => { clearTimeout(deadline); if (active) update({ status: 'error', results: [] }); },
    );
  }, delay);
  return () => { active = false; clearTimeout(timer); clearTimeout(deadline); controller.abort(); };
}
