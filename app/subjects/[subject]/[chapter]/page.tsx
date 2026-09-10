import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getChapter } from '@/content/catalog';
import { getNotes } from '@/content/notes';
import sources from '@/research/sources.json';
import { SiteFrame } from '@/components/site-frame';
export default async function ChapterPage({
  params,
}: {
  params: Promise<{ subject: string; chapter: string }>;
}) {
  const p = await params,
    s = getSubject(p.subject);
  if (!s) notFound();
  const c = getChapter(s, p.chapter);
  if (!c) notFound();
  const n = getNotes(s.id, c.id);
  const source = sources.find((x) => x.qualification === s.code)!;
  return (
    <SiteFrame>
      <main className="page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Subjects</Link>
          <span>/</span>
          <Link href={'/subjects/' + s.id}>{s.title}</Link>
          <span>/</span>
          <span>{c.title}</span>
        </nav>
        <div className="reading-layout">
          <aside>
            <p className="aside-label">In this chapter</p>
            {n?.sections.map((section) => (
              <a href={'#' + section.id} key={section.id}>
                {section.title}
              </a>
            ))}
            <a href="#sources">Sources & status</a>
            <Link href={'/subjects/' + s.id}>← All chapters</Link>
          </aside>
          <article className="chapter-reader">
            <div className="eyebrow">
              {s.code} · {c.section}
            </div>
            <h1>{c.title}</h1>
            {!n ? (
              <div className="note">
                <h2>Notes not yet written</h2>
                <p>
                  This chapter is part of the course structure. Explanations,
                  worked examples and answering guides still need to be written
                  and checked.
                </p>
                <p>
                  Use the official specification below to see the current source
                  material. This page does not count as completed syllabus
                  coverage.
                </p>
              </div>
            ) : (
              <>
                <p className="status">
                  {n.status === 'source-checked'
                    ? 'Source-checked sections'
                    : 'Draft sections'}{' '}
                  · chapter incomplete · no human review
                </p>
                <h2>Before you begin</h2>
                <ul>
                  {n.prerequisites.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <h2>Learning goals</h2>
                <ul>
                  {n.goals.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {n.sections.map((section) => (
                  <section
                    id={section.id}
                    key={section.id}
                    className="note-section"
                  >
                    <h2>{section.title}</h2>
                    {section.paragraphs.map((x, i) => (
                      <p key={i}>{x}</p>
                    ))}
                    {section.diagram && (
                      <figure className="note-diagram">
                        {/* Original local SVGs: no raster optimisation is needed. */}
                        {/* eslint-disable-next-line next/no-img-element */}
                        <img
                          src={section.diagram.src}
                          alt={section.diagram.alt}
                          width={600}
                          height={350}
                        />
                        <figcaption>{section.diagram.caption}</figcaption>
                      </figure>
                    )}
                    {section.practical && (
                      <div className="practical-guide">
                        {(
                          [
                            ['apparatus', 'Apparatus'],
                            ['method', 'Method'],
                            ['variables', 'Variables'],
                            ['safety', 'Safety'],
                            ['quality', 'Quality of measurements'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <h3>{label}</h3>
                            {key === 'method' ? (
                              <ol>
                                {section.practical![key].map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ol>
                            ) : (
                              <ul>
                                {section.practical![key].map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {section.example && (
                      <div className="worked-example">
                        <h3>Worked example</h3>
                        <p>{section.example.question}</p>
                        <ol>
                          {section.example.steps.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ol>
                        <details>
                          <summary>Why this answer works</summary>
                          <p>{section.example.explanation}</p>
                        </details>
                      </div>
                    )}
                    {section.practice && (
                      <div className="worked-example">
                        <h3>Try it yourself</h3>
                        <p>{section.practice.question}</p>
                        <details>
                          <summary>Show practice answer</summary>
                          <p>{section.practice.answer}</p>
                          <p>{section.practice.explanation}</p>
                        </details>
                      </div>
                    )}
                    {section.answerGuide && (
                      <div className="worked-example">
                        <h3>Answer guide: {section.answerGuide.command}</h3>
                        <ol>
                          {section.answerGuide.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <p>{section.answerGuide.caution}</p>
                      </div>
                    )}
                    {section.commonMistakes?.length ? (
                      <div className="note">
                        <h3>Common mistakes to avoid</h3>
                        <ul>
                          {section.commonMistakes.map((mistake) => (
                            <li key={mistake}>{mistake}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {section.points?.length ? (
                      <p className="status">
                        Specification references: {section.points.join(', ')}
                      </p>
                    ) : null}
                  </section>
                ))}
              </>
            )}
            <section id="sources">
              <h2>Sources & status</h2>
              <a
                href={
                  source.url + '#page=' + (n?.sourcePages[0] ?? c.sourcePage)
                }
                target="_blank"
                rel="noreferrer"
              >
                Pearson {s.code} specification ↗
              </a>
              <p className="status">
                {n
                  ? 'Reviewed source PDF pages: ' + n.sourcePages.join(', ')
                  : 'Contents source: PDF page ' + c.sourcePage}
                . The complete statement inventory and all teaching coverage
                remain under review.
              </p>
              <Link href={'/coverage/' + s.id}>
                See the subject coverage ledger →
              </Link>
            </section>
          </article>
        </div>
      </main>
    </SiteFrame>
  );
}
