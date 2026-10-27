import Link from '@/components/navigation-link';
import { SiteFrame } from '@/components/site-frame';
import { subjects } from '@/content/catalog';
import { env } from 'cloudflare:workers';
import { aiConfiguration } from '@/server/ai/config';
import { quizReadiness } from '@/server/template-registry';
import { ExamLauncher } from '@/components/exam-launcher';
export const dynamic = 'force-dynamic';
export default function QuizPage() {
  const setup = aiConfiguration(env as unknown as Record<string, unknown>);
  return (
    <SiteFrame quiz>
      <main className="quiz-page">
        <div className="eyebrow">PRACTICE ROOM</div>
        <h1>Practise what you’ve learned</h1>
        <p>Choose a subject, select chapters and set your practice length. Write your answers, compare with the explanations, and revisit the topics that need work.</p>
        <nav aria-label="Quiz subjects">
          {subjects.map((s) => (
            <div key={s.id}>
            <Link className="chapter-row" href={'/revision/' + s.id} key={s.id}>
              <strong>{s.title}</strong>
              <small>Build custom practice →</small>
            </Link>
            <ExamLauncher subject={s.id} ready={setup.config !== null && quizReadiness(s.code).ready} />
            </div>
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
            Live AI marking and exam summaries remain unavailable until provider setup, educational evaluation and the subject’s validated bank are ready. The review workflow keeps all marking and explanations until after submission.
          </p>
          {setup.missing.length > 0 && <details><summary>AI setup still required</summary><ul>{setup.missing.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        </div>
        <Link className="action" href="/">
          Return to the library
        </Link>
      </main>
    </SiteFrame>
  );
}
