import { subjects, type Subject } from '../content/catalog.ts';
import { getNotes } from '../content/notes.ts';
export type SearchResult = {
  title: string;
  chapter: string;
  href: string;
  snippet: string;
  status: string;
  score: number;
};
export function normalise(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function near(a: string, b: string): boolean {
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let edits = 0,
    i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function searchLibrary(subject: Subject, query: string): SearchResult[] {
  const q = normalise(query).slice(0, 120);
  if (!q) return [];
  const terms = q.split(' '),
    results: SearchResult[] = [];
  for (const chapter of subject.chapters) {
    const note = getNotes(subject.id, chapter.id);
    const entries = [
      {
        id: '',
        title: chapter.title,
        text: chapter.terms.join(', '),
        terms: chapter.terms,
      },
      ...(note?.sections ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        text: [
          ...s.paragraphs,
          s.example?.question ?? '',
          ...(s.example?.steps ?? []),
        ].join(' '),
        terms: s.terms ?? [],
      })),
    ];
    for (const e of entries) {
      const title = normalise(e.title),
        text = normalise(e.text),
        tags = normalise(e.terms.join(' '));
      const words = (title + ' ' + text + ' ' + tags).split(' ');
      if (!terms.every((t) => words.some((w) => w.includes(t) || near(t, w))))
        continue;
      const score =
        (title === q ? 100 : 0) +
        (title.includes(q) ? 40 : 0) +
        (tags.includes(q) ? 20 : 0) +
        (text.includes(q) ? 10 : 0) +
        (e.id ? 5 : 0);
      const hit = e.text.toLowerCase().indexOf(query.toLowerCase()),
        start = Math.max(0, hit - 55);
      results.push({
        title: e.title,
        chapter: chapter.title,
        href:
          '/subjects/' +
          subject.id +
          '/' +
          chapter.id +
          (e.id ? '#' + e.id : ''),
        snippet:
          (start ? '…' : '') +
          e.text.slice(start, start + 190) +
          (e.text.length > start + 190 ? '…' : ''),
        status: note
          ? note.status === 'source-checked'
            ? 'Source-checked note · chapter incomplete'
            : 'Draft note'
          : 'Chapter planned · notes not written',
        score,
      });
    }
  }
  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 30);
}
export function searchAll(query: string) {
  return subjects.flatMap((s) => searchLibrary(s, query));
}
