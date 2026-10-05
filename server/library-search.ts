import { getSubject } from '../content/catalog.ts';
import { searchLibrary } from '../lib/library.ts';

export function librarySearchResponse(request: Request) {
  const params = new URL(request.url).searchParams;
  const subjects = params.getAll('subject');
  const queries = params.getAll('q');
  const headers = { 'Cache-Control': 'no-store' };
  if (subjects.length !== 1 || queries.length !== 1 || queries[0].length > 120) {
    return Response.json({ error: 'One subject and a query of at most 120 characters are required.' }, { status: 400, headers });
  }
  const subject = getSubject(subjects[0]);
  if (!subject) return Response.json({ error: 'Unknown subject.' }, { status: 400, headers });
  // Searches original public teaching only, never the private paper/template bank.
  return Response.json({ results: searchLibrary(subject, queries[0]) }, { headers });
}
