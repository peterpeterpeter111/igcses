'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { QuizClient } from '@/lib/quiz-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
export function QuizSession({ sessionId }: { sessionId: string }) {
  const [client] = useState(
    () => new QuizClient('/api/quiz/sessions/' + encodeURIComponent(sessionId)),
  );
  const state = useSyncExternalStore(
    client.subscribe,
    client.snapshot,
    client.snapshot,
  );
  const {
    view,
    answer,
    error,
    saving,
    busy,
    results,
    dirty,
    uncertain,
    conflict,
    recovery,
  } = state;
  const [confirmSkip, setConfirmSkip] = useState(false);
  useEffect(() => {
    client.resume();
    void client.load();
    return () => client.dispose();
  }, [client]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || uncertain || recovery) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uncertain, recovery]);
  function next(skip = false) {
    if (!answer.trim() && !skip && !uncertain) {
      setConfirmSkip(true);
      return;
    }
    setConfirmSkip(false);
    void client.submit(skip);
  }
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
          <div>
            <Button
              variant="outline"
              onClick={() => void client.load()}
              disabled={busy}
            >
              Retry loading saved state
            </Button>
          </div>
        </div>
      )}
      {!view && !error && (
        <output className="block">Loading saved attempt…</output>
      )}
      {recovery && (
        <section className="note" aria-label="Preserved answer">
          <h2>Your text before reloading</h2>
          <p>
            This copy is kept on this page so you can compare it with the saved
            state. It has not been applied to a different question.
          </p>
          <Textarea
            aria-label="Preserved answer text"
            value={recovery.text}
            readOnly
          />
          {view?.question?.id === recovery.questionId && (
            <Button onClick={() => client.restoreRecovery()}>
              Use this text for the same question
            </Button>
          )}
          <Button variant="outline" onClick={() => client.dismissRecovery()}>
            Dismiss this copy
          </Button>
        </section>
      )}
      {view?.status === 'answering' && view.question && (
        <>
          <div className="quiz-meta">
            <span>Question {view.position + 1} of 22</span>
            <strong>{view.question.maxMarks} marks</strong>
          </div>
          {view.question.stimulus && (
            <p className="text-block">{view.question.stimulus}</p>
          )}
          <h1 className="quiz-question">{view.question.prompt}</h1>
          <label htmlFor="answer">Your answer and working</label>
          <Textarea
            id="answer"
            value={answer}
            onChange={(e) => client.edit(e.target.value)}
            disabled={busy || uncertain || conflict}
            maxLength={16000}
          />
          <output className="status block" aria-live="polite">
            {saving}
          </output>
          <Button
            className="action primary"
            disabled={busy || conflict || Boolean(recovery)}
            onClick={() => next()}
          >
            {busy
              ? 'Saving answer…'
              : uncertain
                ? 'Retry the same submission'
                : view.position === 21
                  ? 'Finish quiz'
                  : 'Next'}
          </Button>
          {dirty && !uncertain && !conflict && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void client.save()}
            >
              Retry saving draft
            </Button>
          )}
          {(conflict || uncertain) && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void client.load()}
            >
              Reload saved state and keep my text
            </Button>
          )}
          <p className="status">
            Answers are saved before advancing. Mark schemes are released after
            the full quiz is complete.
          </p>
        </>
      )}
      {view?.status === 'marking' && (
        <>
          <h1>Answers saved</h1>
          <p>
            Your complete attempt is awaiting marking. Question packages and
            answers remain frozen.
          </p>
          <Button className="action" onClick={() => client.load()}>
            Check marking status
          </Button>
        </>
      )}
      {results && (
        <>
          <h1>Quiz results</h1>
          <p className="score">{results.total}/80</p>
          <p>
            {results.percentage}% · AI marking is formative and may need review.
          </p>
          {results.questions.map((q, i) => (
            <section className="result-question" key={q.id}>
              <h2>
                Question {i + 1} · {q.grade.earnedMarks}/{q.maxMarks}
              </h2>
              <p className="text-block">{q.prompt}</p>
              {q.stimulus && <p className="text-block">{q.stimulus}</p>}
              <h3>Your answer</h3>
              <p className="text-block">{q.answer || 'Skipped'}</p>
              <h3>Released mark scheme</h3>
              <ul className="plain-list">
                {q.rubric.map((r) => (
                  <li key={r.id}>
                    {r.description} ({r.marks})
                  </li>
                ))}
              </ul>
              <h3>Model answer</h3>
              <p className="text-block">{q.solution}</p>
              <p>{q.grade.rationale}</p>
            </section>
          ))}
        </>
      )}
      <p>
        <Link
          className="action"
          href={results ? '/' : '/history'}
          onClick={(e) => {
            if (dirty || uncertain || recovery) {
              e.preventDefault();
              window.alert(
                'Save or recover your work, then dismiss any preserved copy before leaving.',
              );
            }
          }}
        >
          {results ? 'Quit — return home' : 'Exit to History'}
        </Link>
      </p>
      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent className="dark rounded-[3px]">
          <AlertDialogTitle>Skip this question?</AlertDialogTitle>
          <AlertDialogDescription>
            Your answer is blank. Skipping submits it without an answer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep answering</AlertDialogCancel>
            <AlertDialogAction onClick={() => next(true)}>
              Skip question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
