import type { Metadata } from 'next';
import './globals.css';
import { StudentGate } from '@/components/student-onboarding';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: { default: 'IGCSEs · The study library', template: '%s · IGCSEs' },
  description:
    'Study six Pearson Edexcel International GCSE subjects with original notes, answer guides and custom practice. Transparent curriculum and source verification.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div id="main-content"><StudentGate>{children}</StudentGate></div>
      </body>
    </html>
  );
}
