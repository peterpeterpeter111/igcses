'use client';
import { useEffect, useRef, useState } from 'react';
import type { summaryResult } from '@/server/ai/council';
type Summary = ReturnType<typeof summaryResult>;
export function ExaminerReview({ sessionId, summary = false, onComplete }: { sessionId: string; summary?: boolean; onComplete?: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false), [progress, setProgress] = useState(0), [report, setReport] = useState<Summary | null>(null);
  const running = useRef(false), controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!summary) return;
    const abort = new AbortController();
    void fetch(`/api/quiz/sessions/${encodeURIComponent(sessionId)}/review`, { cache: 'no-store', signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) })
      .then(async (response) => { if (!response.ok) return; const data = await response.json() as { done?: boolean; summary?: Summary }; if (!abort.signal.aborted && data.done && data.summary) setReport(data.summary); })
      .catch(() => {});
    return () => abort.abort();
  }, [sessionId, summary]);
  async function run(retryUncertain = false) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setUncertain(false);
    const abort = new AbortController(); controller.current = abort;
    try {
      for (let step = 0; step < 100; step++) {
        if (abort.signal.aborted) return;
        const response = await fetch(`/api/quiz/sessions/${encodeURIComponent(sessionId)}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: summary ? 'summary' : 'review', retryUncertain: step === 0 && retryUncertain }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(160000)]) });
        const data = await response.json() as { done: boolean; completedSteps: number; summary?: Summary; error?: string; code?: string };
        if (!response.ok) { setUncertain(data.code === 'UNCERTAIN'); const wait = response.headers.get('Retry-After'); throw new Error(`${data.error ?? 'This review step could not finish.'}${wait ? ` Try again after ${wait} seconds.` : ''}`); }
        setProgress(data.completedSteps);
        if (data.done) { if (data.summary) setReport(data.summary); onComplete?.(); return; }
      }
      throw new Error('This review reached its step limit. Completed work is saved; reopen to continue.');
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Review unavailable. Completed steps are saved.');
    } finally { running.current = false; setBusy(false); }
  }
  return <section className="note" aria-label={summary ? 'Exam summary' : 'Examiner review'}>
    <h2>{summary ? 'Your learning summary' : 'Review your completed exam'}</h2>
    <p>{summary ? 'Request the model team’s explanation of evidenced mistakes. Reviewers check the tutor’s explanation in up to two rounds; remaining concerns stay visible.' : 'Your answers are now frozen. Independent examiners review the exact question-linked schemes, then compare evidence and recurring mistakes. Disputed credit stays provisional.'}</p>
    {!report && <button className="action" disabled={busy} type="button" onClick={() => void run()}>{busy ? 'Reviewing saved answers…' : summary ? 'Generate summary' : 'Review all answers'}</button>}
    {progress > 0 && <output>{progress} model review steps saved.</output>}
    {error && <p role="alert">{error}</p>}
    {uncertain && <><p>A previous request may have reached the provider. This button explicitly sends that unfinished step again.</p><button className="action" disabled={busy} onClick={() => void run(true)}>Retry uncertain step</button></>}
    {report && <>
      <h3>Exam summary</h3><p>{report.teaching.overview}</p><p>{report.comparison}</p>
      {report.findings.map((f) => <div key={f.id}><h3>{f.recurring ? 'Recurring pattern' : 'Observed mistake'} · {f.category}</h3><p>{f.description}</p><p>{f.uncertainty}</p><ul>{f.evidence.map((e, i) => <li key={i}>{e.questionId} · {e.criterionId}: “{e.quote}”</li>)}</ul></div>)}
      {report.teaching.modules.map((m) => <section key={m.findingId}><h3>{m.concept}</h3><p>{m.definition}</p><p className="text-block">{m.explanation}</p><h4>Worked example</h4><p className="text-block">{m.workedExample}</p><h4>Check your understanding</h4><p>{m.checkQuestion}</p><details><summary>Show the check answer</summary><p>{m.checkAnswer}</p></details></section>)}
      {report.unresolved.length > 0 && <div role="note"><h3>Explanation still needs review</h3><p>The reviewers did not agree that every evidenced gap was adequately addressed. These concerns remain provisional.</p><ul>{report.unresolved.map((c, i) => <li key={i}>{c.role}: {c.rationale} {c.missing.join(' ')}</li>)}</ul></div>}
      <details><summary>Model response record</summary><ul>{report.trace.map((r) => <li key={r.step}>{r.step} · {r.model} · {r.generationId} · {r.completedAt}</li>)}</ul></details>
    </>}
  </section>;
}
