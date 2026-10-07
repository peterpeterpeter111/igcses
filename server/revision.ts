import { getSubject } from '../content/catalog.ts';
import { getNotes } from '../content/notes.ts';
import type { RevisionQuestion } from '../lib/revision-contract.ts';
// Original public lesson exercises. This is self-assessment, separate from the
// generated 80-mark exam blueprint and its private question-package bank.
export function revisionQuestions(subjectId: string, chapterId?: string): RevisionQuestion[] | null {
  const subject = getSubject(subjectId);
  if (!subject || (chapterId && !subject.chapters.some((c) => c.id === chapterId))) return null;
  return subject.chapters.filter((c) => !chapterId || c.id === chapterId).flatMap((chapter) =>
    (getNotes(subject.id, chapter.id)?.sections ?? []).filter((s) => s.practice).map((section) => ({
      id: `${chapter.id}/${section.id}`,
      chapter: chapter.title,
      heading: section.title,
      prompt: section.practice!.question,
      lessonHref: `/subjects/${subject.id}/${chapter.id}#${section.id}`,
    })),
  );
}
export async function revisionAnswerResponse(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
  if (request.headers.get('origin') !== new URL(request.url).origin) return fail('Origin not allowed.', 403);
  const reader = request.body?.getReader();
  if (!reader) return fail('A question is required.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512) { await reader.cancel(); return fail('Request too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let input: unknown;
  try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return fail('Invalid request.', 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join(',') !== 'id,subject') return fail('A subject and question ID are required.', 400);
  const { subject, id } = input as Record<string, unknown>;
  if (typeof subject !== 'string' || typeof id !== 'string' || id.length > 180) return fail('Invalid question.', 400);
  const publicQuestion = revisionQuestions(subject)?.find((q) => q.id === id);
  if (!publicQuestion) return fail('Question not found.', 404);
  const [chapter, section] = id.split('/');
  const practice = getNotes(subject, chapter)?.sections.find((s) => s.id === section)?.practice;
  if (!practice) return fail('Question not found.', 404);
  return Response.json({ answer: practice.answer, explanation: practice.explanation }, { headers });
}
