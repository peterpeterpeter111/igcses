import { env } from 'cloudflare:workers';
import { getDatabase } from '@/db';
import { handle, HttpError, json, owner, readJson, sameOrigin } from '@/server/http';
import { aiConfiguration, AiError } from '@/server/ai/config';
import { continueReview } from '@/server/ai/service';
import { activeFamilies } from '@/server/template-registry';
import { SessionStore } from '@/server/session-store';
import { ReviewStore } from '@/server/ai/review-store';
import { nextStep, summaryResult } from '@/server/ai/council';
export const dynamic = 'force-dynamic';
export function GET(request: Request, { params }: { params: Promise<{ session: string }> }) {
  return handle(async () => {
    const who = await owner(request), db = getDatabase(), { attempt } = await new SessionStore(db).load((await params).session, who);
    if (attempt.status === 'answering') throw new HttpError(409, 'Review is locked until every answer is submitted.');
    const state = await new ReviewStore(db).read(attempt);
    // Historical reports remain readable during a provider outage or disabled
    // AI setup. A GET never sends student work or starts any model call.
    const complete = attempt.status === 'complete' && state !== null && nextStep(attempt, state, true) === null;
    return json({ done: complete, completedSteps: state ? Object.keys(state.records).length : 0, ...(complete && state ? { summary: summaryResult(attempt, state) } : {}) });
  });
}
export async function POST(request: Request, { params }: { params: Promise<{ session: string }> }) {
  return handle(async () => {
    sameOrigin(request);
    const who = await owner(request), body = await readJson(request, 512);
    if (!['review', 'summary'].includes(String(body.mode)) || Object.keys(body).some((k) => !['mode', 'retryUncertain'].includes(k)) || (body.retryUncertain !== undefined && typeof body.retryUncertain !== 'boolean')) throw new HttpError(400, 'Invalid review request.');
    const setup = aiConfiguration(env as unknown as Record<string, unknown>);
    if (!setup.config) return json({ error: 'The live AI examiner is not configured and evaluated yet.', code: 'SETUP' }, 503);
    try { return json(await continueReview({ db: getDatabase(), id: (await params).session, ownerId: who, config: setup.config, families: activeFamilies, summary: body.mode === 'summary', retryUncertain: body.retryUncertain === true })); }
    catch (error) {
      if (!(error instanceof AiError)) throw error;
      const response = json({ error: error.message, code: error.code }, error.code === 'RATE_LIMIT' ? 429 : ['BUSY', 'LOCKED', 'UNCERTAIN'].includes(error.code) ? 409 : 503);
      if (error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
  });
}
