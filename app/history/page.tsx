import Link from 'next/link';
import { PracticeHistory } from '@/components/practice-history';
import { SiteFrame } from '@/components/site-frame';
import { ExamHistory } from '@/components/exam-history';
export default function History() {
  return <SiteFrame><main className="page"><h1>History</h1><PracticeHistory /><ExamHistory /><Link href="/">Return to the library →</Link></main></SiteFrame>;
}
