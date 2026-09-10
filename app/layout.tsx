import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'IGCSEs · The study library', template: '%s · IGCSEs' },
  description:
    'Study six Pearson Edexcel International GCSE subjects with original notes, answer guides and custom practice. Transparent curriculum and source verification.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
