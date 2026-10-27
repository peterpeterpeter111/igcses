import Link from 'next/link';
export function SiteFrame({
  children,
  quiz = false,
}: {
  children: React.ReactNode;
  quiz?: boolean;
}) {
  return (
    <div className={quiz ? 'shell dark' : 'shell'}>
      <header>
        {/* Use a native link for immediate single-click navigation, including before client routing hydrates. */}
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- keep the primary Quiz mode action responsive on the first click. */}
        <a className="quiz-link" href="/quiz">
          😈 Quiz mode
        </a>
        <Link className="wordmark" href="/">
          igcses<span>THE STUDY LIBRARY</span>
        </Link>
        <span className="edition">
          Pearson Edexcel
          <br />
          International GCSE
        </span>
      </header>
      {children}
      <footer>
        <Link href="/history">History ↗</Link>
        <span>Independent study resource · Work in progress</span>
        <Link href="/coverage">Sources & coverage</Link>
      </footer>
    </div>
  );
}
