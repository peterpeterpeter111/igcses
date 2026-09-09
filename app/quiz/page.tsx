import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { subjects } from '@/content/catalog';
export default function QuizPage() {
  return (
    <SiteFrame quiz>
      <main className="quiz-page">
        <div className="eyebrow">CUSTOM PRACTICE · 80 MARKS</div>
        <h1>Quiz mode</h1>
        <p>Choose a subject to see its practice readiness.</p>
        <nav aria-label="Quiz subjects">
          {subjects.map((s) => (
            <Link className="chapter-row" href={'/coverage/' + s.id} key={s.id}>
              <strong>{s.title}</strong>
              <small>Awaiting validated templates →</small>
            </Link>
          ))}
        </nav>
        <div className="note">
          <h2>Question bank under review</h2>
          <p>
            No validated family is active yet. Quizzes will become available
            after the source-linked templates, generated solutions and marking
            checks pass.
          </p>
          <p>
            The fixed blueprint is 8 two-mark questions, 10 four-mark questions
            and 4 six-mark questions: 22 questions and 80 marks. Mark schemes
            stay private until the quiz is complete.
          </p>
          <p>
            AI generation and examiner-style marking will be connected in the
            final phase. No live AI call is made here.
          </p>
        </div>
        <Link className="action" href="/">
          Return to the library
        </Link>
      </main>
    </SiteFrame>
  );
}
