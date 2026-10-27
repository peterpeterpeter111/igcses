import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { subjects } from '@/content/catalog';
export default function QuizPage() {
  return (
    <SiteFrame quiz>
      <main className="quiz-page">
        <div className="eyebrow">PRACTICE ROOM</div>
        <h1>Practise what you’ve learned</h1>
        <p>Choose a subject, select chapters and set your practice length. Write your answers, compare with the explanations, and revisit the topics that need work.</p>
        <nav aria-label="Quiz subjects">
          {subjects.map((s) => (
            <Link className="chapter-row" href={'/revision/' + s.id} key={s.id}>
              <strong>{s.title}</strong>
              <small>Build custom practice →</small>
            </Link>
          ))}
        </nav>
        <div className="note">
          <h2>80-mark exam quizzes</h2>
          <p>
            No validated family is active yet. Quizzes will become available
            after the source-linked templates, generated solutions and marking
            checks pass.
          </p>
          <p>
            The exam blueprint is 8 three-mark questions, 8 four-mark questions
            and 4 six-mark questions: 20 questions and 80 marks. Mark schemes
            stay private until the quiz is complete.
          </p>
          <p>
            AI marking, model review and the post-exam summary are not available yet. No live AI call is made here.
          </p>
        </div>
        <Link className="action" href="/">
          Return to the library
        </Link>
      </main>
    </SiteFrame>
  );
}
