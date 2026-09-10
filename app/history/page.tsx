import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { getDatabase } from '@/db';
import { SessionStore } from '@/server/session-store';
import { getSubject } from '@/content/catalog';
export const dynamic = 'force-dynamic';
export default async function History() {
  const user = await getChatGPTUser();
  let attempts: Record<string, unknown>[] = [];
  let unavailable = false;
  if (user) {
    try {
      attempts = await new SessionStore(getDatabase()).history(user.userId);
    } catch {
      unavailable = true;
    }
  }
  return (
    <SiteFrame>
      <main className="page">
        <h1>History</h1>
        {user ? (
          <p>Signed in as {user.displayName}.</p>
        ) : (
          <p>
            <a href={chatGPTSignInPath('/history')} target="_top">
              Sign in with ChatGPT
            </a>{' '}
            to access your account’s saved attempts.
          </p>
        )}
        {unavailable ? (
          <div className="error" role="alert">
            Saved history could not be loaded. It has not been cleared. Please
            retry later.
          </div>
        ) : user && attempts.length ? (
          <div className="table-wrap">
            <table>
              <caption>Your saved attempts</caption>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={String(a.id)}>
                    <td>
                      {getSubject(String(a.subject_id))?.title ??
                        String(a.subject_id)}
                    </td>
                    <td>{String(a.created_at).slice(0, 10)}</td>
                    <td>{String(a.status)}</td>
                    <td>
                      {a.status === 'complete'
                        ? String(a.score) + '/80'
                        : 'Incomplete'}
                    </td>
                    <td>
                      <Link href={'/quiz/' + encodeURIComponent(String(a.id))}>
                        {a.status === 'complete' ? 'Results' : 'Resume'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="note">
            <h2>{user ? 'No saved attempts' : 'Account history'}</h2>
            <p>
              The template bank is still under review. Once quizzes are
              available, incomplete and completed account attempts will appear
              here.
            </p>
          </div>
        )}
        <button className="action" disabled>
          Generate overall improvement summary
        </button>
        <p className="status">
          Improvement summaries need saved attempts and the final AI
          integration.
        </p>
        <Link href="/">Return to the library →</Link>
      </main>
    </SiteFrame>
  );
}
