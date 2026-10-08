'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import type { RevisionAnswer, RevisionQuestion } from '@/lib/revision-contract';
import { MAX_PRACTICE_QUESTIONS, practiceChapters, selectPractice } from '@/lib/revision-selection';

type Confidence = 'understood' | 'revisit';
export function RevisionSession({ subjectId, questions, chapterOptions, initialChapter }: { subjectId: string; questions: RevisionQuestion[]; chapterOptions: { id: string; title: string }[]; initialChapter?: string }) {
  const availableChapters = practiceChapters(questions);
  const chapters = chapterOptions.map((chapter) => ({ ...chapter, count: availableChapters.find((c) => c.id === chapter.id)?.count ?? 0 }));
  const [selected, setSelected] = useState(() => initialChapter ? [initialChapter] : availableChapters.map((c) => c.id));
  const [count, setCount] = useState('10');
  const [order, setOrder] = useState<'mixed' | 'lesson'>('mixed');
  const [feedback, setFeedback] = useState<'end' | 'each'>('end');
  const [phase, setPhase] = useState<'setup' | 'practice' | 'review'>('setup');
  const [set, setSet] = useState<RevisionQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [guides, setGuides] = useState<Record<string, RevisionAnswer>>({});
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => { if (phase !== 'setup') heading.current?.focus(); }, [position, phase]);
  const available = questions.filter((q) => selected.includes(q.id.split('/')[0])).length;
  const validCount = Number.isInteger(Number(count)) && Number(count) >= 1 && Number(count) <= MAX_PRACTICE_QUESTIONS;
  const target = validCount ? Math.min(Number(count), available) : 0;
  async function reveal(question: RevisionQuestion) {
    if (controller.current || guides[question.id]) return;
    setError(''); setBusyId(question.id);
    const active = new AbortController(); controller.current = active;
    const timeout = setTimeout(() => active.abort(), 15000);
    try {
      const response = await fetch('/api/revision/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subjectId, id: question.id }), signal: active.signal });
      const data = await response.json();
      if (!response.ok || !data || typeof data !== 'object' || !('answer' in data) || !('explanation' in data) || typeof data.answer !== 'string' || typeof data.explanation !== 'string') throw new Error('The explanation could not be loaded. Your answers are still here; try again.');
      const guide = { answer: data.answer, explanation: data.explanation };
      setGuides((previous) => ({ ...previous, [question.id]: guide }));
    } catch (e) {
      if (controller.current === active) setError(active.signal.aborted ? 'Loading took too long. Your answers are still here; try again.' : e instanceof Error ? e.message : 'Please retry loading the explanation.');
    } finally {
      clearTimeout(timeout);
      if (controller.current === active) { controller.current = null; setBusyId(null); }
    }
  }
  function start(revisit = false) {
    const candidates = revisit ? set.filter((q) => confidence[q.id] === 'revisit') : questions;
    const nextSet = selectPractice(candidates, { chapters: selected, count: Number(count), order });
    if (!nextSet.length) return;
    controller.current?.abort(); controller.current = null;
    setSet(nextSet); setPosition(0); setAnswers({}); setGuides({}); setConfidence({}); setError(''); setBusyId(null); setPhase('practice');
  }
  function next(assessment?: Confidence) {
    if (assessment) setConfidence((previous) => ({ ...previous, [set[position].id]: assessment }));
    if (position + 1 === set.length) setPhase('review');
    else setPosition((previous) => previous + 1);
  }
  function explanation(question: RevisionQuestion) {
    const guide = guides[question.id];
    if (!guide) return <Button disabled={!!busyId} onClick={() => void reveal(question)}>{busyId === question.id ? 'Loading explanation…' : 'Compare with the lesson answer'}</Button>;
    return <div className="practice-explanation"><h3>Lesson answer</h3><p className="text-block">{guide.answer}</p><p>{guide.explanation}</p><Link href={question.lessonHref}>Revisit this lesson →</Link></div>;
  }
  if (!questions.length) return <div className="note"><p>No lesson exercises are available yet.</p><Link href={`/subjects/${subjectId}`}>Read the lessons →</Link></div>;
  if (phase === 'setup') return <section className="practice-builder" aria-labelledby="practice-setup-title">
    <h2 id="practice-setup-title">Build your practice</h2>
    <fieldset><legend>Choose chapters</legend>
      <div className="revision-actions"><Button variant="outline" onClick={() => setSelected(availableChapters.map((c) => c.id))}>Select all</Button><Button variant="outline" onClick={() => setSelected([])}>Clear selection</Button></div>
      <div className="practice-chapters">{chapters.map((chapter) => <label key={chapter.id} className="practice-chapter"><input type="checkbox" disabled={!chapter.count} checked={chapter.count > 0 && selected.includes(chapter.id)} onChange={(e) => setSelected((previous) => e.target.checked ? [...previous, chapter.id] : previous.filter((id) => id !== chapter.id))} /><span>{chapter.title}<small>{chapter.count ? `${chapter.count} exercises` : 'Exercises not available yet'}</small></span></label>)}</div>
    </fieldset>
    <div className="practice-options">
      <label>Number of questions<input type="number" min={1} max={MAX_PRACTICE_QUESTIONS} step={1} value={count} onChange={(e) => setCount(e.target.value)} /></label>
      <label>Question order<select value={order} onChange={(e) => setOrder(e.target.value as 'mixed' | 'lesson')}><option value="mixed">Mixed order</option><option value="lesson">Lesson order</option></select></label>
      <label>Show explanations<select value={feedback} onChange={(e) => setFeedback(e.target.value as 'end' | 'each')}><option value="end">After finishing the set</option><option value="each">After each question</option></select></label>
    </div>
    <output className="practice-selection-status">{available} lesson exercises available · {target} in this set. {validCount ? (target < Number(count) && available > 0 ? 'The set uses all available exercises in your selection.' : '') : `Choose a whole number from 1 to ${MAX_PRACTICE_QUESTIONS}.`}</output>
    <Button disabled={!target} onClick={() => start()}>Start custom practice</Button>
  </section>;
  if (phase === 'review') {
    const understood = set.filter((q) => confidence[q.id] === 'understood').length;
    const revisits = set.filter((q) => confidence[q.id] === 'revisit').length;
    return <section className="practice-review">
      <h2 ref={heading} tabIndex={-1}>Practice complete</h2>
      <p>{set.length} questions finished. You marked {understood} as understood and {revisits} to revisit; {set.length - understood - revisits} are awaiting your review. These are your own assessments, not awarded marks.</p>
      {error && <p role="alert" className="error">{error}</p>}
      {set.map((question, index) => <article className="note" key={question.id}>
        <small>Question {index + 1} · {question.chapter}</small><h3>{question.prompt}</h3>
        <h4>Your answer</h4><p className="text-block">{answers[question.id] || 'No answer written'}</p>
        {explanation(question)}
        {guides[question.id] && <div className="revision-actions"><Button aria-pressed={confidence[question.id] === 'understood'} onClick={() => setConfidence((previous) => ({ ...previous, [question.id]: 'understood' }))}>I understand this</Button><Button variant="outline" aria-pressed={confidence[question.id] === 'revisit'} onClick={() => setConfidence((previous) => ({ ...previous, [question.id]: 'revisit' }))}>Revisit this topic</Button></div>}
      </article>)}
      <div className="revision-actions"><Button disabled={!revisits || !!busyId} onClick={() => start(true)}>Practise topics to revisit</Button><Button variant="outline" disabled={!!busyId} onClick={() => start()}>Try another set</Button><Button variant="outline" disabled={!!busyId} onClick={() => { setPhase('setup'); setError(''); }}>Change practice settings</Button></div>
    </section>;
  }
  const current = set[position];
  const guide = guides[current.id];
  return <section className="revision-card">
    <div className="quiz-meta"><span>Question {position + 1} of {set.length}</span><span>{current.chapter}</span></div>
    <Progress value={position} max={set.length} aria-label="Practice progress" />
    <h2 className="quiz-question" ref={heading} tabIndex={-1}>{current.prompt}</h2>
    <label htmlFor="revision-answer">Your answer or working</label>
    <Textarea id="revision-answer" value={answers[current.id] ?? ''} onChange={(e) => setAnswers((previous) => ({ ...previous, [current.id]: e.target.value }))} maxLength={8000} readOnly={!!guide} placeholder="Try explaining it in your own words…" />
    {error && <p role="alert" className="error">{error}</p>}
    {feedback === 'end' ? <><p className="status">Explanations stay hidden until you finish this set.</p><Button onClick={() => next()}>{position + 1 === set.length ? 'Finish set and review' : answers[current.id]?.trim() ? 'Next question' : 'Leave blank and continue'}</Button></> : !guide ? explanation(current) : <div className="note" aria-live="polite">
      {explanation(current)}<p>How confident are you in your explanation?</p><div className="revision-actions"><Button onClick={() => next('understood')}>I understand this</Button><Button variant="outline" onClick={() => next('revisit')}>I need to revisit this</Button></div>
    </div>}
  </section>;
}
