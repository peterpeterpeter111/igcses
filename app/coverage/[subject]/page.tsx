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
import humanSkills from '@/research/syllabus-skills/4HB1-issue2-selected.json';
import humanCubeSkills from '@/research/syllabus-skills/4HB1-issue2-q6-selected.json';
import chemistrySkills from '@/research/syllabus-skills/4CH1-issue3.json';
import englishReadingReview from '@/research/teaching-reviews/4EB1-reading-foundations.json';
import englishWritingReview from '@/research/teaching-reviews/4EB1-writing-foundations.json';
import englishPaperSummary from '@/research/pilot-summaries/4EB1-2024-November-01.json';
import { assessmentObjectiveCoverage, assessmentObjectiveReviewDate } from '@/lib/assessment-objectives';
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
  const objectives = assessmentObjectiveCoverage(s.code);
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
              {r.fullyProcessed ? 'Processed source · generated exam practice still unavailable' : r.extraction
                ? 'Detailed records available · processing checks incomplete'
                : 'Indexed-only · covers checked by AI · full task/scheme matching pending'}
            </p>
            {r.extraction && (
              <div>
                <p>
                  {r.extraction.detailedTasks} question parts (
                  {r.extraction.originalMarks} {r.extraction.printedChoices ? 'marks across the printed choices' : 'original marks'}) reviewed across{' '}
                  {r.extraction.reviewedQuestions.length === 1 ? 'Question' : 'Questions'}{' '}
                  {new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' }).format(r.extraction.reviewedQuestions)}.
                  {r.extraction.expectedTasks === null
                    ? 'The whole-paper part count is not yet confirmed.'
                    : ` Detailed records: ${r.extraction.detailedTasks} of ${r.extraction.expectedTasks} parts.`}
                  {' '}{r.fullyProcessed ? 'This paper passed the source-processing audit.' : 'This paper is not fully processed.'}
                </p>
                {r.extraction.printedChoices && <p>
                  Candidates answer {r.extraction.candidateAnsweredTasks} tasks for {r.extraction.assessedMarks} marks.
                  {' '}The three Section C choices are separate source records, not three compulsory questions.
                </p>}
                {r.extraction.wholePageAudit && <p className="status">
                  The visual page review covers all {r.extraction.questionPaperPages} question-paper
                  pages and {r.extraction.markSchemePages} scheme pages, including covers and
                  non-task pages. {r.fullyProcessed
                    ? 'Current task applicability and versioned source-family links are reviewed. Generators and examiner calibration remain separate.'
                    : 'Detailed extraction is available; the remaining processing checks below prevent this paper from being counted as fully processed.'}
                </p>}
                {!r.extraction.wholePageAudit && <p className="status">
                  Detailed review covers {r.extraction.questionPaperPages} question-paper {r.extraction.questionPaperPages === 1 ? 'page' : 'pages'}
                  {' '}and {r.extraction.markSchemePages} scheme {r.extraction.markSchemePages === 1 ? 'page' : 'pages'}. The original text index
                  is preserved. {r.index ? 'The separate whole-paper visual inventory is complete; detailed review remains incomplete.' : r.extraction.printedChoices ? 'Candidate-path marks reconcile, but the whole-paper visual inventory remains incomplete.' : 'The whole-paper visual inventory and mark reconciliation remain incomplete.'}
                </p>}
                <details>
                  <summary>{r.fullyProcessed ? 'Remaining exam-practice limitations' : 'Remaining processing gaps'}</summary>
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
                {r.index.textTasks !== null && <>Text index: {r.index.textTasks} numbered parts. </>}Visual
                inventory: {r.index.visualTasks} parts and{' '}
                {r.index.reconciledMarks} marks reconciled across all{' '}
                {r.index.questionPaperPages} paper pages{r.index.hasEquationBooklet ? ' (including the equation booklet)' : ''} and {r.index.markSchemePages} scheme pages.{' '}
                {r.index.sourceDiscrepancies} source {r.index.sourceDiscrepancies === 1 ? 'discrepancy' : 'discrepancies'} recorded for
                review. The inventory alone does not certify detailed rubric, syllabus
                or template validation. AI review; no human review.
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
          <section>
          <p>
            Also obtained: November 2024 paper 01, its scheme and examiner
            report. Eleven printed tasks indexed; Questions{' '}
            {englishPaperSummary.reviewedTaskNumbers.join(', ')} have detailed source records
            ({englishPaperSummary.detailedOriginalMarks} original marks across the printed choices).
            {' '}{englishPaperSummary.remainingIndexedTasks} tasks remain indexed only.{' '}
            {englishPaperSummary.fullyProcessedPapers === 1 ? 'Source processing passed: all 36 question-paper and 20 mark-scheme pages accounted for, with current task/AO review and report observations.' : 'Whole-paper processing is incomplete.'} A candidate answers nine tasks
            for 100 marks; all printed alternatives total 160 marks.
          </p>
          <p>Real-paper analysis, comparison and writing use their original
            level grids. Directed writing keeps its separate 10/12/8 objective
            allocations; they have not been scaled into custom quiz marks.</p>
          <p className="status">Latest paper-record review: {englishPaperSummary.reviewedAt};
            {' '}AI review, no human certification or active examiner marker.</p>
          <h2>Selected reading and writing teaching</h2>
          <p>
            {englishReadingReview.sections.length + englishWritingReview.sections.length}
            {' '}original sections have partial source checks across reading,
            directed writing and discursive, narrative and descriptive writing.
            Their AO references are assessment objectives, separate from numbered
            syllabus statements. No objective or chapter is certified complete.
          </p>
          <ul className="plain-list">
            {['reading', ...englishWritingReview.chapterIds].map((chapterId) => {
              const chapter = s.chapters.find((chapter) => chapter.id === chapterId)!;
              const note = getNotes(s.id, chapterId)!;
              return <li key={chapterId}>
                <Link href={`/subjects/${s.id}/${chapterId}`}>{chapter.title}</Link>
                {' · '}{note.sections.length} partial sections
                {' · '}{[...new Set(note.sections.flatMap((section) => section.points ?? []))].join(', ')}
              </li>;
            })}
          </ul>
          <p className="status">
            Writing source review: {englishWritingReview.reviewDate} against
            Issue 4, PDF pages {englishWritingReview.source.pdfPages.join(', ')}.
            Full source-text practice, independent whole-response level decisions,
            complete objective coverage and spoken-language delivery review remain
            incomplete. Partial spoken-language preparation notes are available.
            No human certification or active marking template.
          </p>
          <h2 id="english-objectives">Assessment objectives and teaching</h2>
          <p>
            {objectives.filter((objective) => objective.scope === 'exam').length} exam
            objectives have partial teaching links. The optional spoken-language
            objective is separate and has {getNotes('english', 'spoken-language')?.sections.length ?? 0}
            {' '}partial preparation sections; formal objective links remain unrecorded.
            These objectives are not
            counted as numbered syllabus statements or complete coverage.
          </p>
          <div className="table-wrap">
            <table>
              <caption>Official qualification weights; lesson links remain partial.</caption>
              <thead><tr><th scope="col">Objective</th><th scope="col">Weight</th><th scope="col">Linked lessons</th></tr></thead>
              <tbody>
                {objectives.map((objective) => <tr key={objective.id}>
                  <th scope="row">{objective.reference}{objective.scope === 'optional-endorsement' ? ' · optional' : ''}</th>
                  <td>{objective.qualificationWeightPercent === null ? 'Separate endorsement' : `${objective.qualificationWeightPercent}%`}</td>
                  <td>{objective.links.length ? `${objective.links.length} partial` : objective.scope === 'optional-endorsement'
                    ? 'Preparation notes; links pending' : 'Not started'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {objectives.map((objective) => <details key={objective.id}>
            <summary>{objective.reference}: {objective.summary}</summary>
            {objective.links.length ? <ul className="plain-list">
              {objective.links.map((link) => <li key={link.id}>
                <a href={`/subjects/english/${link.chapterId}#${link.sectionId}`}>
                  {getNotes('english', link.chapterId)?.sections.find((section) => section.id === link.sectionId)?.title ?? link.sectionId}
                </a>{' · partial teaching'}
              </li>)}
            </ul> : objective.scope === 'optional-endorsement' && getNotes('english', 'spoken-language')
              ? <p><Link href="/subjects/english/spoken-language">Optional spoken-language preparation</Link>
                {' · '}{getNotes('english', 'spoken-language')!.sections.length} partial sections.
                Formal objective links and independent delivery review remain incomplete.</p>
              : <p>Formal teaching links have not been recorded.</p>}
          </details>)}
          <p className="status">
            Objective definitions and {objectives.reduce((n, objective) => n + objective.links.length, 0)} partial
            {' '}relationships reconciled on {assessmentObjectiveReviewDate} against
            Issue 4, PDF pages 10 and 18. A lesson can support several objectives.
            Full text-range practice and independent whole-response calibration
            remain incomplete; no objective is certified complete.
            {' '}<a href={`${source.url}#page=10`} target="_blank" rel="noreferrer">Inspect the official objectives ↗</a>
          </p>
          </section>
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
        {s.code === chemistrySkills.qualification && (
          <section>
            <h2>Practical and mathematical skills</h2>
            <p>{chemistrySkills.skills.filter((skill) => skill.kind === 'experimental').length} experimental skills and {chemistrySkills.skills.filter((skill) => skill.kind === 'mathematical').length} mathematical skills inventoried from the saved official specification. Rows without a Chemistry applicability tick are excluded.</p>
            <p>All {chemistrySkills.reviewedLeafCount} parts of the obtained paper have an AI review of listed skill demand: {chemistrySkills.counts.mappedLeaves} have relevant links and {chemistrySkills.counts.noSeparateListedDemandLeaves} have no separate listed demand. {chemistrySkills.counts.mathematicalDemandLeaves} parts have mathematical links and {chemistrySkills.counts.experimentalDemandLeaves} have experimental links; these groups overlap and do not add up to paper marks.</p>
            <p>Historical applicability and official per-part assessment-objective or skill marks remain unverified. This review does not establish complete teaching coverage, human certification or a processed paper.</p>
            <p><a href={source.url + '#page=49'} target="_blank" rel="noreferrer">Own specification · PDF pages 34–35 and 49–50 ↗</a>{' · Checked '}{chemistrySkills.reviewDate}; AI review, no human certification.</p>
          </section>
        )}
        {s.code === humanSkills.qualification && (
          <section>
            <h2>Selected mathematical skills</h2>
            <p>
              {new Set([...humanSkills.skills, ...humanCubeSkills.skills].map((skill) => skill.id)).size} Appendix 4
              skills support the reviewed Q2 chart and Q6 cube tasks: bar charts,
              graphical and numerical information, ratios and powers, and substitution
              with units. This is a selected review, not a complete practical, mathematical or
              assessment-objective audit. No official per-part AO marks are claimed.
            </p>
            <p>
              <a href={source.url + '#page=43'} target="_blank" rel="noreferrer">
                Own specification · PDF page 43 ↗
              </a>
              {' · Checked '}{humanSkills.reviewDate}; AI review, no human certification.
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
                references and paper applicability. Authored teaching progress
                is recorded below; whole-chapter and examiner readiness remain
                incomplete. No human review has been performed.
              </p>
              <p>
                {
                  inventory.points.filter(
                    (point) => point.noteSectionIds.length > 0,
                  ).length
                }{' '}
                {inventory.points.filter((point) => point.noteSectionIds.length > 0).length === 1 ? 'statement has' : 'statements have'} linked explanations.{' '}
                {inventory.points.filter((point) => point.teachingCoverage === 'complete').length} passed the agent review of authored teaching. This does not certify the whole chapter, learner mastery or examiner marking.
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
                          {point.teachingCoverage === 'complete' ? 'Reviewed teaching' : 'Partial notes'}:{' '}
                          {point.noteSectionIds.map((heading, i) => (
                            <span key={heading}>
                              {i > 0 ? ' · ' : ''}
                              <a
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
                              </a>
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
              {' '}local teaching requirements.{' '}
              {auditedParents.filter((parent) => parent.teachingAuditStatus === 'complete').length} statements passed the agent review of authored teaching. Whole chapters and exam-template calibration remain incomplete.
            </p>
            {s.id === 'physics' && <p>
              Examples of linked teaching include a{' '}
              {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- Native fragment navigation updates :target before the reader scroll. */}
              <a href="/subjects/physics/forces-and-motion#plotting-motion-data">
                worked motion-graph exercise
              </a>{' '}and{' '}
              {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- Native fragment navigation updates :target before the reader scroll. */}
              <a href="/subjects/physics/forces-and-motion#choosing-force-equations">
                force-equation practice
              </a>, plus{' '}
              {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- Native fragment navigation updates :target before the reader scroll. */}
              <a href="/subjects/physics/waves#reading-wave-records">
                distance and time readings for waves
              </a>.
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
                      {parent.teachingAuditStatus === 'complete' ? 'Authored teaching reviewed; chapter and exam readiness remain separate.' : [...new Set(parent.requirements.map((requirement) => requirement.remainingChecks[0]))].join(' ')}
                      <p>
                        {parent.teachingAuditStatus === 'complete' ? 'Reviewed teaching' : 'Partial teaching'}:{' '}
                        {sections.map((sectionId, index) => (
                          <span key={sectionId}>
                            {index > 0 ? ' · ' : ''}
                            <a href={`/subjects/${s.id}/${parent.chapterId}#${sectionId}`}>
                              {chapterNotes?.sections.find((section) => section.id === sectionId)?.title ?? sectionId}
                            </a>
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
          records. The raw candidates do not establish teaching completion; reviewed status appears above.
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
