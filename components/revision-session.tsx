'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import type { RevisionAnswer, RevisionQuestion } from '@/lib/revision-contract';
function sample(questions: RevisionQuestion[]) {
  const items = [...questions];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, 10);
}
type Review = { question: RevisionQuestion; answer: string; understood: boolean };
export function RevisionSession({ subjectId, questions }: { subjectId: string; questions: RevisionQuestion[] }) {
  const [set, setSet] = useState<RevisionQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState('');
  const [guide, setGuide] = useState<RevisionAnswer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (position > 0) heading.current?.focus(); }, [position]);
  async function reveal() {
    if (busy || guide) return;
    setError(''); setBusy(true);
    const active = new AbortController(); controller.current = active;
    try {
      const response = await fetch('/api/revision/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subjectId, id: set[position].id }), signal: active.signal });
      const data = await response.json();
      if (!response.ok || !data || typeof data !== 'object' || !('answer' in data) || !('explanation' in data) || typeof data.answer !== 'string' || typeof data.explanation !== 'string') throw new Error('The explanation could not be loaded. Your answer is still here; try again.');
      setGuide({ answer: data.answer, explanation: data.explanation });
    } catch (e) { if (!active.signal.aborted) setError(e instanceof Error ? e.message : 'Please retry loading the explanation.'); }
    finally { if (!active.signal.aborted) setBusy(false); }
  }
  function next(understood: boolean) {
    setReviews([...reviews, { question: set[position], answer, understood }]);
    setPosition(position + 1); setAnswer(''); setGuide(null); setError('');
  }
  function restart(revisit = false) {
    const candidates = revisit ? reviews.filter((r) => !r.understood).map((r) => r.question) : questions;
    setSet(sample(candidates)); setPosition(0); setReviews([]); setAnswer(''); setGuide(null); setError('');
  }
  if (!questions.length) return <div className="note"><p>No lesson exercises are available in this chapter yet.</p><Link href={`/subjects/${subjectId}`}>Read the lessons →</Link></div>;
  if (!set.length) return <section className="note"><h2>Ready to practise?</h2><p>Try up to 10 lesson exercises, compare your answers, and choose which topics to revisit.</p><Button onClick={() => restart()}>Start practice</Button></section>;
  if (position === set.length) return <section className="note">
    <h2 ref={heading} tabIndex={-1}>Practice complete</h2>
    <p>You marked {reviews.filter((r) => r.understood).length} of {reviews.length} topics as understood. This is your own assessment, not an awarded mark.</p>
    <ul>{reviews.map((r) => <li key={r.question.id}><Link href={r.question.lessonHref}>{r.question.heading}</Link> — {r.understood ? 'Understood' : 'Revisit'}<details><summary>Your answer</summary><p className="text-block">{r.answer || 'No answer written'}</p></details></li>)}</ul>
    <div className="revision-actions">{reviews.some((r) => !r.understood) && <Button onClick={() => restart(true)}>Practise the topics to revisit</Button>}<Button variant="outline" onClick={() => restart()}>Try another set</Button></div>
  </section>;
  const current = set[position];
  return <section className="revision-card">
    <div className="quiz-meta"><span>Question {position + 1} of {set.length}</span><span>{current.chapter}</span></div>
    <Progress value={position} max={set.length} aria-label="Practice progress" />
    <h2 className="quiz-question" ref={heading} tabIndex={-1}>{current.prompt}</h2>
    <label htmlFor="revision-answer">Your answer or working</label>
    <Textarea id="revision-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={8000} readOnly={!!guide} placeholder="Try explaining it in your own words…" />
    {error && <p role="alert" className="error">{error}</p>}
    {!guide ? <Button className="action primary" disabled={busy} onClick={() => void reveal()}>{busy ? 'Loading explanation…' : answer.trim() ? 'Check my answer' : 'Show the explanation'}</Button> : <div className="note" aria-live="polite">
      <h3>Compare with the lesson answer</h3><p className="text-block">{guide.answer}</p><p>{guide.explanation}</p>
      <Link href={current.lessonHref}>Revisit this lesson →</Link>
      <p>How confident are you in your explanation?</p><div className="revision-actions"><Button onClick={() => next(true)}>I understand this</Button><Button variant="outline" onClick={() => next(false)}>I need to revisit this</Button></div>
    </div>}
  </section>;
}
