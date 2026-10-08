import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/site-frame';
import { RevisionSession } from '@/components/revision-session';
import { getSubject } from '@/content/catalog';
import { revisionQuestions } from '@/server/revision';
export default async function RevisionPage({ params, searchParams }: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { subject: id } = await params;
  const { chapter } = await searchParams;
  const subject = getSubject(id);
  const questions = revisionQuestions(id);
  if (!subject || !questions || (chapter !== undefined && (typeof chapter !== 'string' || !subject.chapters.some((c) => c.id === chapter)))) notFound();
  return <SiteFrame quiz><main className="quiz-page">
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/quiz">Practice</Link><span>/</span><Link href={`/subjects/${subject.id}`}>{subject.title}</Link></nav>
    <div className="eyebrow">RECALL · EXPLAIN · CHECK</div>
    <h1>{subject.title} practice</h1>
    <p>Choose chapters and build a set of original lesson exercises. Write your answers, then compare them with the explanations.</p>
    <p className="status">Self-assessment · no exam score · this temporary session resets when you leave or reload. Your written answers stay on this page.</p>
    <RevisionSession key={`${id}/${chapter ?? ''}`} subjectId={id} questions={questions} chapterOptions={subject.chapters.map(({ id: chapterId, title }) => ({ id: chapterId, title }))} initialChapter={chapter} />
  </main></SiteFrame>;
}
