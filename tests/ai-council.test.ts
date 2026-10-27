import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './quiz-fixture.ts';
import { aiConfiguration, ROLES, REQUESTED_MODELS, type AiConfig } from '../server/ai/config.ts';
import { composioCouncil, type CouncilTransport } from '../server/ai/composio.ts';
import { assertReviewable, nextStep, newReview, reviewGrades, runStep, summaryResult } from '../server/ai/council.ts';
import { ReviewStore } from '../server/ai/review-store.ts';
import { assertActivePackages, continueReview } from '../server/ai/service.ts';
import type { Attempt } from '../server/quiz-contract.ts';
import type { RuntimeFamily } from '../server/template-registry.ts';
const models = Object.fromEntries(ROLES.map((r) => [r, `test/${r}:free`])) as AiConfig['models'];
const config: AiConfig = { apiKey: 'SYNTHETIC_NOT_A_KEY', accountId: 'ca_fixture', toolVersion: '20261028_00', models, calibrationId: 'test-only' };
async function completedFixture() {
  const data = await setup();
  for (const q of data.q) await data.store.submit('attempt', 'owner', q.public.id, 'A learner explanation.', `submit-${q.public.id}`, false);
  return { ...data, attempt: (await data.store.load('attempt', 'owner')).attempt };
}
function fakeTransport(calls: string[] = [], options: { wrongQuote?: boolean; excessive?: boolean; disputed?: boolean; recurring?: boolean; insufficient?: boolean } = {}): CouncilTransport {
  return async (role, instruction, raw) => {
    type FixtureQuestion = { question: { id: string }; packageHash: string; rubric: { id: string; marks: number }[]; answer: string; primary?: unknown; second?: unknown };
    calls.push(role); const data = raw as FixtureQuestion & { reviews: FixtureQuestion[] }; let value: unknown;
    if (instruction.includes('Independently assess')) {
      assert.equal(data.primary, undefined); assert.equal(data.second, undefined);
      value = { questionId: data.question.id, packageHash: data.packageHash, awards: data.rubric.map((r) => ({ criterionId: r.id, marks: options.excessive ? r.marks + 1 : options.disputed && role === 'second' ? 0 : r.marks, quote: options.wrongQuote ? 'Invented learner words' : data.answer, rationale: 'Synthetic test policy only.' })) };
    } else if (role === 'evidence' && data.question) value = { questionId: data.question.id, packageHash: data.packageHash, checks: data.rubric.map((r) => ({ criterionId: r.id, disputed: !!options.disputed, quote: '', rationale: 'Synthetic evidence check.' })) };
    else if (instruction.includes('Analyse completed responses')) value = { findings: [{ id: 'gap', category: 'concept', description: 'Synthetic test gap.', recurring: !!options.recurring, uncertainty: 'Fixture only, not learner evidence.', evidence: data.reviews.slice(0, options.recurring ? 2 : 1).map((r) => ({ questionId: r.question.id, criterionId: r.rubric[0].id, quote: r.answer })) }] };
    else if (role === 'tutor') value = { overview: 'Synthetic summary.', modules: [{ findingId: 'gap', concept: 'Fixture concept', definition: 'Fixture definition', explanation: 'Fixture explanation', workedExample: 'Fixture worked example', checkQuestion: 'Fixture check?', checkAnswer: 'Fixture answer' }] };
    else value = { checks: [{ findingId: 'gap', sufficient: !options.insufficient, rationale: 'Synthetic critique.', missing: options.insufficient ? ['A clearer fixture example.'] : [] }] };
    return { model: models[role], generationId: `fixture-${calls.length}`, value };
  };
}
async function exhaust(attempt: Attempt, summary = false, transport = fakeTransport(), initial = newReview(attempt)) {
  let state = initial;
  for (let n = 0; n < 100; n++) { const step = nextStep(attempt, state, summary); if (!step) return state; state = await runStep(state, step, transport); }
  throw new Error('Unbounded review detected.');
}
void test('AI cannot be activated by env alone; exact approved model/version evidence and all free IDs are required', () => {
  const values = { COMPOSIO_API_KEY: config.apiKey, COMPOSIO_OPENROUTER_ACCOUNT_ID: config.accountId, COMPOSIO_OPENROUTER_TOOL_VERSION: config.toolVersion, AI_CALIBRATION_ID: config.calibrationId, AI_COUNCIL_MODELS: JSON.stringify(models), AI_ENABLED: 'true' };
  assert.equal(aiConfiguration(values).config, null);
  const approvals = [{ id: config.calibrationId, toolVersion: config.toolVersion, models, evidencePath: 'test-fixture-only' }];
  assert.ok(aiConfiguration(values, approvals).config);
  assert.equal(aiConfiguration({ ...values, AI_COUNCIL_MODELS: JSON.stringify({ ...models, tutor: 'paid/model' }) }, approvals).config, null);
  assert.equal(aiConfiguration({ ...values, COMPOSIO_OPENROUTER_TOOL_VERSION: 'latest' }, approvals).config, null);
  assert.equal(aiConfiguration({ ...values, AI_ENABLED: 'false' }, approvals).config, null);
});
void test('No AI review before every answer, for another owner, or after question integrity changes', async () => {
  const { store, sqlite } = await setup();
  const open = (await store.load('attempt', 'owner')).attempt;
  await assert.rejects(assertReviewable(open, 'owner'), /All exam answers/);
  sqlite.close();
  const data = await completedFixture();
  await assert.rejects(assertReviewable(data.attempt, 'another-owner'), /All exam answers/);
  await assertReviewable(data.attempt, 'owner');
  const changed = structuredClone(data.attempt); changed.questions[0].solution = 'Tampered solution';
  await assert.rejects(assertReviewable(changed, 'owner'), /integrity/);
  assert.throws(() => assertActivePackages(data.attempt, []), /not approved/);
  data.sqlite.close();
});
void test('Independent markers see no other proposal; unsupported awards, quotes and source hashes fail closed', async () => {
  const { attempt, sqlite } = await completedFixture(), original = structuredClone(attempt), state = newReview(attempt);
  const step = nextStep(attempt, state, false)!;
  await assert.rejects(runStep(state, step, fakeTransport([], { wrongQuote: true })), /absent/);
  await assert.rejects(runStep(state, step, fakeTransport([], { excessive: true })), /invalid/);
  await assert.rejects(runStep(state, step, async () => ({ model: models.primary, generationId: 'fixture', value: { questionId: 'q0', packageHash: 'wrong', awards: [] } })), /frozen/);
  assert.deepEqual(state.records, {});
  const marked = await runStep(state, step, fakeTransport());
  assert.equal(nextStep(attempt, marked, false)!.role, 'second');
  assert.deepEqual(attempt, original);
  sqlite.close();
});
void test('Whole-exam marking preserves disputed primary and independent grades; no summary is released early', async () => {
  const { attempt, sqlite } = await completedFixture(), calls: string[] = [];
  const state = await exhaust(attempt, false, fakeTransport(calls, { disputed: true, recurring: true }));
  assert.equal(calls.length, 61); assert.equal(calls.at(-1), 'patterns');
  const grades = reviewGrades(attempt, state);
  assert.equal(grades[0].earnedMarks, 3); assert.match(grades[0].rationale, /PROVISIONAL/); assert.match(grades[0].rationale, /Independent marker: 0/);
  assert.throws(() => summaryResult(attempt, state), /not complete/);
  const short = structuredClone(attempt); for (const q of short.questions.slice(4)) short.answers[q.public.id].text = '';
  const patternStep = nextStep(attempt, { ...state, records: Object.fromEntries(Object.entries(state.records).filter(([key]) => key !== 'patterns')) }, false)!;
  const invalid = { ...patternStep, validate: nextStep(short, { ...state, records: Object.fromEntries(Object.entries(state.records).filter(([key]) => key !== 'patterns')) }, false)!.validate };
  await assert.rejects(runStep(state, invalid, fakeTransport([], { recurring: true })), /insufficient independent evidence/);
  sqlite.close();
});
void test('Tutor and all four critics complete two bounded rounds and retain unresolved concerns', async () => {
  const { attempt, sqlite } = await completedFixture();
  let state = await exhaust(attempt); const complete = { ...attempt, status: 'complete' as const };
  const calls: string[] = []; state = await exhaust(complete, true, fakeTransport(calls, { insufficient: true }), state);
  assert.equal(calls.length, 10); assert.equal(calls.filter((r) => r === 'tutor').length, 2);
  const summary = summaryResult(complete, state);
  assert.equal(summary.unresolved.length, 4); assert.equal(summary.teaching.modules.length, 1);
  assert.match(summary.comparison, /not been established/);
  assert.ok(ROLES.every((r) => summary.trace.some((entry) => entry.model === models[r])));
  sqlite.close();
});
void test('D1 review leases reject duplicate calls, require explicit uncertain retry and preserve prior state', async () => {
  const { db, attempt, sqlite } = await completedFixture(), jobs = new ReviewStore(db);
  const first = await jobs.claim(attempt, 'config-1');
  await assert.rejects(jobs.claim(attempt, 'config-1'), /already running/);
  await jobs.fail(attempt.id, attempt.ownerId, first.token, 'UNCERTAIN');
  await assert.rejects(jobs.claim(attempt, 'config-1'), /uncertain outcome/);
  const second = await jobs.claim(attempt, 'config-1', true);
  await assert.rejects(jobs.save(attempt.id, attempt.ownerId, first.token, first.state), /stale/);
  await jobs.save(attempt.id, attempt.ownerId, second.token, second.state);
  await assert.rejects(jobs.claim(attempt, 'changed-config'), /different provider/);
  const third = await jobs.claim(attempt, 'config-1');
  await jobs.fail(attempt.id, attempt.ownerId, third.token, 'RATE_LIMIT', 120);
  await assert.rejects(jobs.claim(attempt, 'config-1'), /requested a pause/);
  sqlite.close();
});
void test('Persisted review service resumes one model step at a time and finalises once without replaying provider calls', async () => {
  const { db, store, attempt, q, sqlite } = await completedFixture(); const calls: string[] = [];
  const families: RuntimeFamily[] = [{ id: 'test-only', version: '0', qualification: '4PH1', status: 'active', validatedMaxima: [3, 4, 6], sourceTaskIds: ['synthetic'], validationEvidenceId: 'TEST_ONLY_NOT_LIVE', generate: async () => q[0] }];
  let last: Awaited<ReturnType<typeof continueReview>> | null = null;
  for (let n = 0; n < 70; n++) { last = await continueReview({ db, id: attempt.id, ownerId: 'owner', config, families, summary: false, retryUncertain: false, transport: fakeTransport(calls) }); if (last.done) break; }
  assert.equal(last?.done, true); assert.equal(calls.length, 61);
  assert.equal((await store.load(attempt.id, 'owner')).attempt.status, 'complete');
  await continueReview({ db, id: attempt.id, ownerId: 'owner', config, families, summary: false, retryUncertain: false, transport: fakeTransport(calls) });
  assert.equal(calls.length, 61);
  for (let n = 0; n < 12; n++) { last = await continueReview({ db, id: attempt.id, ownerId: 'owner', config, families, summary: true, retryUncertain: false, transport: fakeTransport(calls) }); if (last.done) break; }
  assert.ok(last?.summary); assert.equal(calls.length, 66);
  assert.equal((await store.results(attempt.id, 'owner')).total, 80);
  const cached = await new ReviewStore(db).read((await store.load(attempt.id, 'owner')).attempt);
  assert.ok(cached); assert.equal(summaryResult({ ...attempt, status: 'complete' }, cached).teaching.overview, 'Synthetic summary.');
  assert.equal((sqlite.prepare('SELECT COUNT(*) n FROM ai_review_records').get() as { n: number }).n, 66);
  assert.ok((sqlite.prepare('SELECT LENGTH(state_json) n FROM ai_review_jobs').get() as { n: number }).n < 2000);
  assert.equal(await new ReviewStore(db).read({ ...attempt, ownerId: 'another-browser' }), null);
  const changed = structuredClone(cached); changed.records['q0:primary'].value = { tampered: true };
  const lease = await new ReviewStore(db).claim(attempt, (sqlite.prepare('SELECT config_hash FROM ai_review_jobs').get() as { config_hash: string }).config_hash);
  await assert.rejects(new ReviewStore(db).save(attempt.id, 'owner', lease.token, changed), /cannot be overwritten/);
  sqlite.close();
});
void test('Composio transport requires Active OpenRouter, explicit free pricing, exact identities and completed final JSON', async () => {
  const catalog = ROLES.map((role) => ({ id: models[role], name: REQUESTED_MODELS[role] + ' (free)', context_length: 100_000, pricing: { prompt: '0', completion: '0' } }));
  type FixtureBody = { version: string; arguments: { model: string; models?: string[] } };
  const requests: { url: string; body: FixtureBody | null }[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    const endpoint = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as FixtureBody : null; requests.push({ url: endpoint, body });
    if (endpoint.includes('connected_accounts')) return Response.json({ status: 'ACTIVE', toolkit: { slug: 'openrouter' } });
    if (endpoint.endsWith('LIST_AVAILABLE_MODELS')) return Response.json({ successful: true, data: { data: catalog } });
    assert.ok(body);
    return Response.json({ successful: true, data: { model: body.arguments.model, id: 'synthetic-provider-fixture', choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] } });
  }) as typeof fetch;
  const transport = await composioCouncil(config, send);
  assert.deepEqual((await transport('tutor', 'JSON only', { fixture: true })).value, { ok: true });
  assert.equal(requests.at(-1)!.body!.version, config.toolVersion); assert.equal(requests.at(-1)!.body!.arguments.model, models.tutor);
  assert.equal(requests.at(-1)!.body!.arguments.models, undefined);
  catalog[0].pricing.prompt = '0.01';
  await assert.rejects(composioCouncil(config, send), /free pricing/);
  const inactive = (async () => Response.json({ status: 'INITIATED', toolkit: { slug: 'openrouter' } })) as typeof fetch;
  await assert.rejects(composioCouncil(config, inactive), /not active/);
});
