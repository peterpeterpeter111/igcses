import Link from 'next/link';
import { PracticeHistory } from '@/components/practice-history';
import { SiteFrame } from '@/components/site-frame';
export default function History() {
  return <SiteFrame><main className="page"><h1>History</h1><PracticeHistory /><div className="note"><h2>Exam history</h2><p>Generated exam attempts are not available yet.</p></div><Link href="/">Return to the library →</Link></main></SiteFrame>;
}
