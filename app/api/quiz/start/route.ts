import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getSubject } from '@/content/catalog';
import { quizReadiness } from '@/server/template-registry';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
  const user = await getChatGPTUser();
  if (!user)
    return Response.json(
      { error: 'Sign in is required for account quizzes.' },
      { status: 401 },
    );
  if (Number(request.headers.get('content-length') ?? 0) > 1024)
    return Response.json({ error: 'Request too large.' }, { status: 413 });
  const text = await request.text();
  if (text.length > 1024)
    return Response.json({ error: 'Request too large.' }, { status: 413 });
  let id: unknown;
  try {
    id = JSON.parse(text).subject;
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const subject = typeof id === 'string' ? getSubject(id) : null;
  if (!subject)
    return Response.json({ error: 'Unknown subject.' }, { status: 400 });
  return Response.json(
    { error: 'QUIZ_NOT_READY', ...quizReadiness(subject.code) },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
