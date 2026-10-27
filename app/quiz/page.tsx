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
            Written-answer exams and AI feedback are still under review. Use
            custom practice above to study now, write answers and compare them
            with the lesson explanations.
          </p>
          <p>
            The planned exam contains 8 three-mark questions, 8 four-mark questions
            and 4 six-mark questions: 20 questions and 80 marks. Mark schemes
            stay private until the quiz is complete.
          </p>
          <p>
            AI marking and exam summaries are not available yet. When exams
            launch, marking and explanations will begin after every answer has
            been submitted.
          </p>
        </div>
        <Link className="action" href="/">
          Return to the library
        </Link>
      </main>
    </SiteFrame>
  );
}
