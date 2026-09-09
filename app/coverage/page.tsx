import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { coverageSummary } from '@/lib/coverage';
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
          Research cutoff: 9 September 2026. Downloaded, indexed and fully
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
                  <td>{r.obtained}</td>
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
            questions have been analysed.
          </dd>
          <dt>Indexed-only</dt>
          <dd>
            Pages and candidate labels were recorded. Five pairs have now had
            their covers checked, but full task extraction is pending.
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
            390 raw links: 188 paper-labelled, 186 scheme and 16 report links.
            Two English “Extract” links must not count as separate papers.
          </li>
          <li>
            Mathematics B paper discovery remains incomplete. Zero catalogued
            links does not mean no papers exist.
          </li>
          <li>
            The English November 2024 pilot has 11 tasks indexed and one
            detailed extraction. It is not a fully processed paper.
          </li>
          <li>
            Text extraction and cover review cannot certify diagrams, tables,
            every subpart or scheme contents.
          </li>
          <li>
            Active generative templates: 0. One provisional English family
            exists; live AI generation and marking remain deferred.
          </li>
        </ul>
      </main>
    </SiteFrame>
  );
}
