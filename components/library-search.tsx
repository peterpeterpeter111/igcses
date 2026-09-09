'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { getSubject } from '@/content/catalog';
import { searchLibrary } from '@/lib/library';
function Highlight({ text, term }: { text: string; term: string }) {
  const at = text.toLowerCase().indexOf(term.trim().toLowerCase());
  return at < 0 || !term.trim() ? (
    text
  ) : (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + term.trim().length)}</mark>
      {text.slice(at + term.trim().length)}
    </>
  );
}
export function LibrarySearch({ subjectId }: { subjectId: string }) {
  const [query, setQuery] = useState('');
  const subject = getSubject(subjectId)!;
  const results = searchLibrary(subject, query);
  return (
    <section aria-label="Search this subject">
      <label htmlFor="chapter-search">Search {subject.title}</label>
      <Input
        id="chapter-search"
        type="search"
        className="search-input"
        placeholder="A chapter, term or formula…"
        value={query}
        maxLength={120}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="search-results">
          <p role="status">
            {results.length} matching{' '}
            {results.length === 1 ? 'section' : 'sections'}
          </p>
          {results.map((r) => (
            <Link className="search-result" href={r.href} key={r.href}>
              <strong>
                <Highlight text={r.title} term={query} />
              </strong>
              <span>
                {r.chapter} · {r.status}
              </span>
              <p>
                <Highlight text={r.snippet} term={query} />
              </p>
            </Link>
          ))}
          {!results.length && (
            <p>
              Try a shorter term or a chapter title. Unwritten notes cannot
              appear in full-text search.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
