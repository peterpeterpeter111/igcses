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
        <Link className="quiz-link" href="/quiz">
          😈 Quiz mode
        </Link>
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
