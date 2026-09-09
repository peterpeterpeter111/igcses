import { getChatGPTUser } from '../app/chatgpt-auth';
import { QuizError } from './quiz-contract';
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
export async function owner() {
  const user = await getChatGPTUser();
  if (!user) throw new HttpError(401, 'Sign in to access account history.');
  return user.userId;
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new HttpError(403, 'Origin not allowed.');
}
export async function readJson(
  request: Request,
  limit = 20000,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Request body required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new HttpError(400, 'JSON object required.');
  return data as Record<string, unknown>;
}
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof QuizError)
      return json(
        { error: e.message, code: e.code },
        e.code === 'NOT_FOUND' ? 404 : e.code === 'INPUT' ? 400 : 409,
      );
    return json(
      {
        error:
          'Storage is unavailable or a saved-data check failed. Your previous attempt has not been intentionally replaced.',
      },
      503,
    );
  }
}
