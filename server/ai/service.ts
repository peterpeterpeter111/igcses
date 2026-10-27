import { AiError, type AiConfig } from './config.ts';
import { composioCouncil, type CouncilTransport } from './composio.ts';
import { assertReviewable, nextStep, reviewGrades, runStep, summaryResult } from './council.ts';
import { ReviewStore } from './review-store.ts';
import { SessionStore } from '../session-store.ts';
import { canonicalJson } from '../question-package.ts';
import type { Attempt } from '../quiz-contract.ts';
import type { RuntimeFamily } from '../template-registry.ts';
import { getSubject } from '../../content/catalog.ts';
export function assertActivePackages(attempt: Attempt, families: readonly RuntimeFamily[]) {
  for (const q of attempt.questions) {
    const family = families.find((f) => f.id === q.templateId && f.version === q.templateVersion);
    if (!family || family.qualification !== getSubject(attempt.subjectId)?.code || !family.validationEvidenceId || !family.validatedMaxima.includes(q.public.maxMarks) || !q.sourceTaskIds.length || q.sourceTaskIds.some((id) => !family.sourceTaskIds.includes(id))) throw new AiError('LOCKED', 'This exam contains a question family that is not approved for live marking.');
  }
}
export async function continueReview(input: { db: D1Database; id: string; ownerId: string; config: AiConfig; families: readonly RuntimeFamily[]; summary: boolean; retryUncertain: boolean; transport?: CouncilTransport }) {
  const sessions = new SessionStore(input.db), saved = await sessions.load(input.id, input.ownerId), attempt = saved.attempt;
  await assertReviewable(attempt, input.ownerId);
  assertActivePackages(attempt, input.families);
  if (input.summary && attempt.status !== 'complete') throw new AiError('LOCKED', 'Finish examiner review before requesting your summary.');
  const versioned = { accountId: input.config.accountId, toolVersion: input.config.toolVersion, models: input.config.models, calibrationId: input.config.calibrationId };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(versioned)));
  const configHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const jobs = new ReviewStore(input.db), lease = await jobs.claim(attempt, configHash, input.retryUncertain);
  try {
    const step = nextStep(attempt, lease.state, input.summary);
    const state = step ? await runStep(lease.state, step, input.transport ?? await composioCouncil(input.config)) : lease.state;
    await jobs.save(attempt.id, input.ownerId, lease.token, state);
    const next = nextStep(attempt, state, input.summary);
    if (!next && !input.summary && attempt.status === 'marking') await sessions.complete(attempt.id, input.ownerId, reviewGrades(attempt, state), `council:${input.config.calibrationId}`);
    return { done: next === null, completedSteps: Object.keys(state.records).length, lastRole: step?.role ?? null,
      ...(next === null && input.summary ? { summary: summaryResult(attempt, state) } : {}) };
  } catch (error) {
    // A late result cannot replace a newer lease. Uncertain calls need a new
    // explicit student action; GETs, page loads and background retries do none.
    await jobs.fail(attempt.id, input.ownerId, lease.token, error instanceof AiError ? error.code : 'UNCERTAIN', error instanceof AiError ? error.retryAfter : 0);
    throw error;
  }
}
