import { SiteFrame } from '@/components/site-frame';
import { QuizSession } from '@/components/quiz-session';
export default async function SessionPage({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  const { session } = await params;
  return (
    <SiteFrame quiz>
      <main className="quiz-page">
        <QuizSession key={session} sessionId={session} />
      </main>
    </SiteFrame>
  );
}
