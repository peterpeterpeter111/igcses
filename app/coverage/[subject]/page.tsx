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
import physicsSkills from '@/research/syllabus-skills/4PH1-issue4.json';
import { curriculumAudits } from '@/lib/curriculum';
import { obtainedPaperCandidates, paperCoverReview, paperTaskIndex, paperDetailedSummary } from '@/lib/paper-discovery';
export default async function SubjectCoverage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: id } = await params,
    s = getSubject(id);
  if (!s) notFound();
  const auditedParents = curriculumAudits
    .filter((audit) => audit.qualification === s.code)
    .flatMap((audit) => audit.parents.map((parent) => ({ ...parent, chapterId: audit.chapterId })));
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
                ? 'Detailed records available · processing checks incomplete'
                : 'Indexed-only · covers checked by AI · full task/scheme matching pending'}
            </p>
            {r.extraction && (
              <div>
                <p>
                  {r.extraction.detailedTasks} question parts (
                  {r.extraction.originalMarks} original marks) reviewed across
                  Questions {r.extraction.reviewedQuestions.join(' and ')}.
                  Detailed records: {r.extraction.detailedTasks} of{' '}
                  {r.extraction.expectedTasks ?? 'an unconfirmed number of'}{' '}
                  parts. Zero fully processed papers.
                </p>
                {!r.extraction.wholePageAudit && <p className="status">
                  Detailed review covers {r.extraction.questionPaperPages} question-paper pages
                  and {r.extraction.markSchemePages} scheme pages. The original text index
                  is preserved; the whole-paper visual inventory and mark reconciliation remain incomplete.
                </p>}
                <details>
                  <summary>Remaining processing gaps</summary>
                  <ul className="plain-list">
                    {r.extraction.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Processing status notes</summary>
                  <ul className="plain-list">
                    {r.extraction.notes.map((note) => (
                      <li key={note}>{note}</li>
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
        {obtainedPaperCandidates(s.code).map((record) => {
          const review = paperCoverReview(record);
          const index = paperTaskIndex(record);
          const detail = paperDetailedSummary(record);
          return (
          <section className="evidence-row" key={record.id}>
            <h3>{review ? `${s.code}/${review.observedComponent} · ${review.printedDate}` : record.label}</h3>
            <p>{index
              ? detail ? (detail.pageAuditComplete ? 'All pages and question parts reviewed · validation pending' : detail.remainingTasks === 0 ? 'All question parts have detailed records · paper audit pending' : 'Text index available · detailed review started') : 'Text index available · full visual and detailed review pending'
              : review
              ? 'Obtained · cover identity and paper log matched · task indexing pending'
              : 'Obtained only · identity and pairing review pending'}</p>
            {index ? <p>
              {index.indexedLeafCount} question parts across {index.questionCount} questions;
              {' '}{index.indexedOriginalMarks} original marks reconciled. The original
              text index is preserved. {detail
                ? `${detail.detailedTasks} of ${detail.indexedTasks} parts (${detail.originalMarks} original marks) have detailed source-checked records; ${detail.remainingTasks} parts still need detailed review.`
                : 'No detailed Maths extraction.'} No fully processed paper.
            </p> : <p>
              Both official Pearson PDFs were downloaded and hashed. No tasks
              indexed, no detailed extraction and no fully processed paper.
            </p>}
            {detail?.pageAuditComplete && <p>
              The separate detailed audit covers all {detail.questionPaperPagesReviewed} question-paper
              pages and {detail.schemePagesReviewed} mark-scheme pages. Source discrepancies,
              syllabus scope and template validation still need resolution.
            </p>}
            <p>
              <a href={record.questionPaper.url} target="_blank" rel="noreferrer">
                Question paper ({record.questionPaper.pageCount} pages) ↗
              </a>
              {' · '}
              <a href={record.markScheme.url} target="_blank" rel="noreferrer">
                Mark scheme ({record.markScheme.pageCount} pages) ↗
              </a>
            </p>
            {review && <p className="status">{review.dateDiscrepancy} Agent review on {review.reviewedAt}; no human review.</p>}
            {detail && <p className="status">{detail.remainingTasks === 0 ? 'Latest detailed review' : 'Detailed subset reviewed'} on {detail.reviewedAt}; no human review or active Maths templates.</p>}
            <ul className="plain-list">
              {(detail?.blockers ?? index?.blockers ?? review?.limitations ?? record.limitations).map((limitation) => <li key={limitation}>{limitation}</li>)}
            </ul>
          </section>
          );
        })}
        {s.code === '4EB1' && (
          <p>
            Also obtained: November 2024 paper 01, its scheme and examiner
            report. Eleven tasks indexed; Q5 detailed; whole-paper processing
            incomplete.
          </p>
        )}
        {s.code === physicsSkills.qualification && (
          <section>
            <h2>Practical and mathematical skills</h2>
            <p>
              {physicsSkills.skills.filter((skill) => skill.kind === 'experimental').length}
              {' '}experimental skills and{' '}
              {physicsSkills.skills.filter((skill) => skill.kind === 'mathematical').length}
              {' '}mathematical skills checked against the specification.
              These are separate from the numbered content statements below.
            </p>
            <p>
              All {physicsSkills.taskMappings.length} parts of the obtained Physics paper
              have a skill-demand review: {physicsSkills.taskMappings.filter((row) => row.mappings.length > 0).length}
              {' '}have relevant skill links, while{' '}
              {physicsSkills.taskMappings.filter((row) => row.mappings.length === 0).length}
              {' '}have no separate listed skill demand. These decisions do not establish
              official assessment-objective marks or complete teaching coverage.
            </p>
          </section>
        )}
        {reviewedInventories
          .filter((inventory) => inventory.qualification === s.code)
          .map((inventory) => (
            <section key={inventory.title}>
              <h2>Reviewed statements: {inventory.title}</h2>
              <p>
                {inventory.points.length} {inventory.points.length === 1 ? 'statement' : 'statements'} checked against the
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
                {inventory.points.filter((point) => point.noteSectionIds.length > 0).length === 1 ? 'statement has' : 'statements have'} linked partial explanations. No statement is
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
        {auditedParents.length > 0 && (
          <section>
            <h2>Curriculum requirements audit</h2>
            <p>
              {auditedParents.length} specification statements have been separated into{' '}
              {auditedParents.reduce((n, parent) => n + parent.requirements.length, 0)}
              {' '}local teaching requirements. Their explanations are linked, but teaching
              and assessment checks remain partial. No point or chapter is complete.
            </p>
            {s.id === 'physics' && <p>
              Examples of linked teaching include a{' '}
              <Link href="/subjects/physics/forces-and-motion#plotting-motion-data">
                worked motion-graph exercise
              </Link>{' '}and{' '}
              <Link href="/subjects/physics/forces-and-motion#choosing-force-equations">
                force-equation practice
              </Link>, plus{' '}
              <Link href="/subjects/physics/waves#reading-wave-records">
                distance and time readings for waves
              </Link>.
            </p>}
            <details>
              <summary>Inspect remaining teaching checks</summary>
              <ul className="plain-list">
                {auditedParents.map((parent) => {
                  const chapterNotes = getNotes(s.id, parent.chapterId);
                  const sections = [...new Set(parent.requirements.flatMap((requirement) =>
                    requirement.teachingEvidence.map((evidence) => evidence.sectionId),
                  ))];
                  return (
                    <li key={parent.parentId}>
                      <strong>{parent.officialReference}</strong>: {' '}
                      {parent.requirements.map((requirement) => requirement.remainingChecks[0]).join(' ')}
                      <p>
                        Partial teaching:{' '}
                        {sections.map((sectionId, index) => (
                          <span key={sectionId}>
                            {index > 0 ? ' · ' : ''}
                            <Link href={`/subjects/${s.id}/${parent.chapterId}#${sectionId}`}>
                              {chapterNotes?.sections.find((section) => section.id === sectionId)?.title ?? sectionId}
                            </Link>
                          </span>
                        ))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        )}
        <h2>Raw specification candidates</h2>
        <p>
          The original extraction below is retained for comparison with reviewed
          records. No reference is represented as complete teaching coverage.
          Numbered references may contain several substatements that still need
          separate auditing.
        </p>
        {!points.length ? (
          <p>
            The original automatic extraction contains no candidate rows for this
            subject. Reviewed rows, where available, are listed above; the wider
            skill and statement inventory remains incomplete.
          </p>
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
