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
export function LibrarySearch({
  subjectId,
  className,
}: {
  subjectId: string;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const subject = getSubject(subjectId)!;
  const inputId = 'subject-search-' + subject.id;
  const labelId = inputId + '-label';
  const results = searchLibrary(subject, query);
  return (
    <section
      className={className ? 'library-search ' + className : 'library-search'}
      aria-labelledby={labelId}
    >
      <label id={labelId} htmlFor={inputId}>
        Search {subject.title}
      </label>
      <Input
        id={inputId}
        type="search"
        className="search-input"
        placeholder="A chapter, term or formula…"
        value={query}
        maxLength={120}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="search-results">
          <output className="search-count" htmlFor={inputId} aria-live="polite">
            {results.length} matching{' '}
            {results.length === 1 ? 'section' : 'sections'}
          </output>
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
