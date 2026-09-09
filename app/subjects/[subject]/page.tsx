import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject } from '@/content/catalog';
import { getNotes } from '@/content/notes';
import { SiteFrame } from '@/components/site-frame';
import { LibrarySearch } from '@/components/library-search';
export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: id } = await params,
    s = getSubject(id);
  if (!s) notFound();
  return (
    <SiteFrame>
      <main className="page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Subjects</Link>
          <span>/</span>
          <span>{s.title}</span>
        </nav>
        <div className="eyebrow">{s.code} · LINEAR QUALIFICATION</div>
        <h1>{s.title}</h1>
        <p className="intro">{s.overview}</p>
        <div className="reading-layout">
          <aside>
            <p className="aside-label">Course information</p>
            <p className="status">Papers {s.papers}</p>
            <p className="status">Specification issue {s.issue}</p>
            <Link href={'/coverage/' + s.id}>Syllabus & source audit →</Link>
            <Link href={'/quiz?subject=' + s.id}>Custom practice →</Link>
          </aside>
          <article>
            <LibrarySearch subjectId={s.id} />
            <h2>Contents</h2>
            <p className="status">
              This chapter structure is in place. Each chapter shows which notes
              are written and which coverage checks remain.
            </p>
            <nav aria-label={s.title + ' chapters'}>
              {s.chapters.map((c, i) => (
                <Link
                  className="chapter-row"
                  href={'/subjects/' + s.id + '/' + c.id}
                  key={c.id}
                >
                  <span>
                    <strong>
                      {String(i + 1).padStart(2, '0')} · {c.title}
                    </strong>
                    <p>{c.terms.join(' · ')}</p>
                  </span>
                  <small>
                    {getNotes(s.id, c.id)
                      ? 'Notes in progress'
                      : 'Not yet written'}{' '}
                    ↗
                  </small>
                </Link>
              ))}
            </nav>
          </article>
        </div>
      </main>
    </SiteFrame>
  );
}
