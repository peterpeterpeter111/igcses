import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/site-frame';
import { getSubject } from '@/content/catalog';
import { getNotes } from '@/content/notes';
import {
  subjectEvidence,
  pointCandidates,
  discoveryLinks,
} from '@/lib/coverage';
import sources from '@/research/sources.json';
import { reviewedInventories } from '@/lib/syllabus';
export default async function SubjectCoverage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: id } = await params,
    s = getSubject(id);
  if (!s) notFound();
  const points = pointCandidates.filter((x) => x.qualification === s.code),
    source = sources.find((x) => x.qualification === s.code)!;
  return (
    <SiteFrame>
      <main className="page">
        <nav className="breadcrumb">
          <Link href="/coverage">Coverage</Link>
          <span>/ {s.title}</span>
        </nav>
        <h1>{s.title}: coverage ledger</h1>
        <p>
          <a href={source.url} target="_blank" rel="noreferrer">
            Official specification · {source.specificationIssue} ↗
          </a>
        </p>
        <p className="status">
          Pearson’s current qualification page links to this exact
          specification; its hash was rechecked on 9 September 2026. Full
          amendment and substatement audits remain incomplete.
        </p>
        <h2>Downloaded paper pairs</h2>
        {subjectEvidence(s.code).map((r) => (
          <section className="evidence-row" key={r.paperId}>
            <h3>
              {s.code}/{r.review?.observedComponent} · {r.review?.printedDate}
            </h3>
            <p>
              {r.extraction
                ? 'Partial detailed extraction · whole paper incomplete'
                : 'Indexed-only · covers checked by AI · full task/scheme matching pending'}
            </p>
            {r.extraction && (
              <div>
                <p>
                  {r.extraction.detailedTasks} question parts (
                  {r.extraction.originalMarks} original marks) reviewed across
                  Questions {r.extraction.reviewedQuestions.join(' and ')}.
                  Detailed extraction: {r.extraction.detailedTasks} of{' '}
                  {r.extraction.expectedTasks ?? 'an unconfirmed number of'}{' '}
                  parts. Zero fully processed papers.
                </p>
                <details>
                  <summary>Remaining processing gaps</summary>
                  <ul className="plain-list">
                    {r.extraction.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            {r.index && (
              <p className="status">
                Text index: {r.index.textTasks} numbered parts. Visual
                inventory: {r.index.visualTasks} parts and{' '}
                {r.index.reconciledMarks} marks reconciled across all{' '}
                {r.index.questionPaperPages} paper pages (including the equation
                booklet) and {r.index.markSchemePages} scheme pages.{' '}
                {r.index.sourceDiscrepancies} source discrepancies recorded for
                review. This page audit does not mean all parts have detailed
                solutions or validated templates. AI review; no human review.
              </p>
            )}
            <p>
              <a href={r.questionPaper.url} target="_blank" rel="noreferrer">
                Question paper ({r.questionPaper.pageCount} pages) ↗
              </a>
              {' · '}
              <a href={r.markScheme.url} target="_blank" rel="noreferrer">
                Mark scheme ({r.markScheme.pageCount} pages) ↗
              </a>
            </p>
            <p className="status">
              Original ID: {r.paperId}. The printed date differs from the
              filename; both are retained.
            </p>
          </section>
        ))}
        {s.code === '4EB1' && (
          <p>
            Also obtained: November 2024 paper 01, its scheme and examiner
            report. Eleven tasks indexed; Q5 detailed; whole-paper processing
            incomplete.
          </p>
        )}
        {s.code === '4MB1' && (
          <p>
            No Mathematics B paper pair has been catalogued. Source discovery
            remains open.
          </p>
        )}
        {reviewedInventories
          .filter((inventory) => inventory.qualification === s.code)
          .map((inventory) => (
            <section key={inventory.title}>
              <h2>Reviewed statements: {inventory.title}</h2>
              <p>
                {inventory.points.length} statements checked against the
                official PDF on {inventory.reviewDate}. This verifies their
                references and paper applicability. Substatement auditing and
                teaching coverage remain incomplete; no human review has been
                performed.
              </p>
              <p>
                {
                  inventory.points.filter(
                    (point) => point.noteSectionIds.length > 0,
                  ).length
                }{' '}
                statements have linked partial explanations. No statement is
                counted as complete teaching coverage.
              </p>
              <details>
                <summary>Inspect the reviewed statements</summary>
                <ul className="plain-list">
                  {inventory.points.map((point) => (
                    <li key={point.id}>
                      <a
                        href={source.url + '#page=' + point.pdfPage}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {point.reference}
                      </a>
                      {' · '}
                      {point.summary}
                      {' · Papers: '}
                      {point.components.join(', ')}
                      {' · '}
                      {point.noteSectionIds.length ? (
                        <>
                          Partial notes:{' '}
                          {point.noteSectionIds.map((heading, i) => (
                            <span key={heading}>
                              {i > 0 ? ' · ' : ''}
                              <Link
                                href={
                                  '/subjects/' +
                                  s.id +
                                  '/' +
                                  point.chapterId +
                                  '#' +
                                  heading
                                }
                              >
                                {getNotes(s.id, point.chapterId)?.sections.find(
                                  (section) => section.id === heading,
                                )?.title ?? heading}
                              </Link>
                            </span>
                          ))}
                        </>
                      ) : (
                        'Notes not written'
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ))}
        <h2>Raw specification candidates</h2>
        <p>
          The original extraction below is retained for comparison with reviewed
          records. No reference is represented as complete teaching coverage.
          Numbered references may contain several substatements that still need
          separate auditing.
        </p>
        {!points.length ? (
          <p>The full skill/statement inventory is pending.</p>
        ) : (
          <details>
            <summary>Inspect {points.length} candidate references</summary>
            <div className="point-grid">
              {points.map((p) => (
                <a
                  href={source.url + '#page=' + p.pdfPage}
                  key={p.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.reference} · p.{p.pdfPage} · raw candidate
                </a>
              ))}
            </div>
          </details>
        )}
        <details>
          <summary>
            Inspect raw discovery links (
            {discoveryLinks.filter((x) => x.qualification === s.code).length})
          </summary>
          <p className="status">
            Original labels are retained; years and variants inferred by the old
            discovery script are unreliable and are not displayed as verified
            metadata.
          </p>
          <ul className="plain-list">
            {discoveryLinks
              .filter((x) => x.qualification === s.code)
              .map((x) => (
                <li key={x.id}>
                  <a href={x.url} target="_blank" rel="noreferrer">
                    {x.title}
                  </a>{' '}
                  · {x.documentType}
                </li>
              ))}
          </ul>
        </details>
        <Link className="action" href={'/subjects/' + s.id}>
          Return to {s.title}
        </Link>
      </main>
    </SiteFrame>
  );
}
