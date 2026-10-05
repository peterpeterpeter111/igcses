import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { coverageSummary, evidenceHighlights } from '@/lib/coverage';
export default function CoveragePage() {
  const rows = coverageSummary();
  return (
    <SiteFrame>
      <main className="page">
        <nav className="breadcrumb">
          <Link href="/">Subjects</Link>
          <span>/ Sources & coverage</span>
        </nav>
        <h1>Sources & coverage</h1>
        <p className="intro">
          Summary updated: {evidenceHighlights.updatedAt}. Downloaded, indexed and fully
          processed are separate stages.
        </p>
        <div className="note">
          <strong>The library is incomplete.</strong>
          <p>
            No paper has yet passed the whole-paper processing audit. The 710
            numbered science references are extraction candidates, not a
            complete verified syllabus inventory. English and Mathematics skill
            inventories are unfinished.
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <caption>Current subject progress</caption>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Raw paper links</th>
                <th>Pairs obtained</th>
                <th>Fully processed</th>
                <th>Candidate points</th>
                <th>Chapters complete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject.code}>
                  <th>
                    <Link href={'/coverage/' + r.subject.id}>
                      {r.subject.title}
                    </Link>
                  </th>
                  <td>{r.rawQuestionLinks}</td>
                  <td>
                    {r.obtained}
                    {r.candidatePairs > 0 && (
                      <span> (includes {r.candidatePairs} candidate pending review)</span>
                    )}
                  </td>
                  <td>{r.fullyProcessed}</td>
                  <td>{r.candidatePoints || 'Inventory pending'}</td>
                  <td>
                    {r.completeChapters} / {r.subject.chapters.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>What these counts mean</h2>
        <dl className="definitions">
          <dt>Discovered</dt>
          <dd>
            A link was found in an index. Mirrors, extracts and uncertain
            identities still need reconciliation.
          </dd>
          <dt>Obtained</dt>
          <dd>
            A readable PDF was downloaded and hashed. This does not mean its
            questions have been analysed. Candidate pairs still need identity
            and pairing review.
          </dd>
          <dt>Indexed-only</dt>
          <dd>
            Pages and candidate labels were recorded. Later detailed analysis
            is recorded separately; it does not rewrite the original index.
          </dd>
          <dt>Fully processed</dt>
          <dd>
            Every task and subpart, matching scheme, marks and optional-question
            totals have been reconciled, with current-syllabus mappings and
            traceable templates.
          </dd>
        </dl>
        <h2>Known gaps</h2>
        <ul className="plain-list">
          <li>
            Human Biology: {evidenceHighlights.humanBiologyDetailedParts} Q1 parts
            ({evidenceHighlights.humanBiologyDetailedMarks} original marks) have detailed
            records. The whole-paper leaf count, remaining questions and visual audit
            are incomplete; no fully processed paper or active template.
          </li>
          <li>
            390 raw links: 188 paper-labelled, 186 scheme and 16 report links.
            Two English “Extract” links must not count as separate papers.
          </li>
          <li>
            Mathematics B has one downloaded paper/scheme pair, separate from
            the original raw-link inventory. Its cover identity and paper log
            match; {evidenceHighlights.mathematicsDetailedParts} question parts
            ({evidenceHighlights.mathematicsDetailedMarks} original marks) have
            detailed records. Whole-paper processing remains incomplete.
            Wider archive discovery is incomplete.
          </li>
          <li>
            The English November 2024 pilot has 11 tasks indexed and one
            detailed extraction. It is not a fully processed paper. Physics
            Summer 2024 Paper 1P has {evidenceHighlights.physicsDetailedParts}{' '}
            detailed question parts ({evidenceHighlights.physicsDetailedMarks}{' '}
            original marks); whole-paper processing remains incomplete.
          </li>
          <li>
            Text extraction and cover review cannot certify diagrams, tables,
            every subpart or scheme contents.
          </li>
          <li>
            Active generative templates: {evidenceHighlights.activeFamilies}.{' '}
            Provisional families: {evidenceHighlights.provisionalFamilies} (English
            retrieval, Physics resultant force and weight, Maths factorisation,
            matrix addition and grouped means).{' '}
            Experimental generators: {evidenceHighlights.experimentalGenerators}.
            Mechanical checks do not establish assessment or marking readiness.
            The English prototype uses a finite original word bank and defers unfamiliar paraphrases for review.
            The one-mark matrix prototype has no validated 2/4/6-mark quiz adaptation. Live AI remains deferred.
          </li>
        </ul>
      </main>
    </SiteFrame>
  );
}
