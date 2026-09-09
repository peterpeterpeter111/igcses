import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject } from '@/content/catalog';
import { SiteFrame } from '@/components/site-frame';
import { LibrarySearch } from '@/components/library-search';
import { ChapterPath } from '@/components/chapter-path';
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
        <div className="book-ornament" aria-hidden="true">
          <span>✿</span>
          <i />
          {s.code}
          <i />
          <span>❀</span>
        </div>
        <div className="eyebrow">{s.code} · LINEAR QUALIFICATION</div>
        <h1>{s.title}</h1>
        <p className="intro">{s.overview}</p>
        <div className="book-shell">
          <div className="book-spine" aria-hidden="true" />
          <div className="reading-layout">
            <aside className="left-book">
              <div className="left-book-petals" aria-hidden="true">
                ✿ ❀ ✿
              </div>
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
                This chapter structure is in place. Each chapter shows which
                notes are written and which coverage checks remain.
              </p>
              <ChapterPath subjectId={s.id} chapters={s.chapters} />
            </article>
          </div>
        </div>
      </main>
    </SiteFrame>
  );
}
