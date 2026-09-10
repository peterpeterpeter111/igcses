import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
export default function NotFound() {
  return (
    <SiteFrame>
      <main className="page">
        <h1>Page not found</h1>
        <p>That chapter or subject is not in this library.</p>
        <Link href="/">Return to the six subjects →</Link>
      </main>
    </SiteFrame>
  );
}
