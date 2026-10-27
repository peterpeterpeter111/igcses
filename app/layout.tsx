import type { Metadata } from 'next';
import './globals.css';
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import { StudentOnboarding } from '@/components/student-onboarding';
import { getDatabase } from '@/db';
import { StudentStore } from '@/server/student-store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: { default: 'IGCSEs · The study library', template: '%s · IGCSEs' },
  description:
    'Study six Pearson Edexcel International GCSE subjects with original notes, answer guides and custom practice. Transparent curriculum and source verification.',
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getChatGPTUser();
  let name: string | null = null; let unavailable = false;
  if (user) { try { name = await new StudentStore(getDatabase()).profile(user.userId); } catch { unavailable = true; } }
  const content = !user ? <main className="page"><h1>Your study library</h1><p>Sign in securely, then choose a nickname to keep your study history with your account.</p><a className="action" href={chatGPTSignInPath('/')} target="_top">Sign in to study</a></main>
    : unavailable ? <main className="page"><h1>Your library is safe</h1><p role="alert">Your profile could not be loaded. Please reload to retry. Existing history has not been cleared.</p></main>
    : !name ? <main className="page"><h1>What should we call you?</h1><StudentOnboarding /><a href={chatGPTSignOutPath()} target="_top">Sign out</a></main>
    : <><div className="student-bar"><span>Studying as {name}</span><a href={chatGPTSignOutPath()} target="_top">Sign out</a></div>{children}</>;
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="main-content">{content}</div>
      </body>
    </html>
  );
}
