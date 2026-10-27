import { env } from 'cloudflare:workers';
import { getDatabase } from '@/db';
import { getSubject } from '@/content/catalog';
import { activeFamilies, quizReadiness } from '@/server/template-registry';
import { BLUEPRINT } from '@/server/quiz-contract';
import { assertPackageIntegrity, freezeQuestion } from '@/server/question-package';
import { SessionStore } from '@/server/session-store';
import { handle, HttpError, json, owner, readJson, sameOrigin } from '@/server/http';
import { aiConfiguration } from '@/server/ai/config';
import { assertActivePackages } from '@/server/ai/service';
import { examRequestId } from '@/server/browser-identity';
export function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const input = await readJson(request, 1024);
    if (Object.keys(input).sort().join() !== 'key,subject' || typeof input.key !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.key)) throw new HttpError(400, 'A subject and request key are required.');
    const subject = typeof input.subject === 'string' ? getSubject(input.subject) : null;
    if (!subject) throw new HttpError(400, 'Unknown subject.');
    const ready = quizReadiness(subject.code);
    if (!ready.ready) return json({ error: 'No complete validated exam bank is available for this subject yet.', code: 'BANK_NOT_READY', ...ready }, 503);
    if (!aiConfiguration(env as unknown as Record<string, unknown>).config) return json({ error: 'The AI model team still needs secure setup and live educational evaluation.', code: 'SETUP' }, 503);
    const who = await owner(request), id = await examRequestId(who, subject.id, input.key), db = getDatabase(), store = new SessionStore(db);
    const exists = async () => db.prepare('SELECT id FROM quiz_sessions WHERE id=? AND owner_id=?').bind(id, who).first();
    if (await exists()) return json(await store.current(id, who));
    const questions = [];
    for (const [position, maxMarks] of BLUEPRINT.entries()) {
      const candidates = activeFamilies.filter((family) => family.qualification === subject.code && family.validatedMaxima.includes(maxMarks));
      const family = candidates[position % candidates.length], generated = await family.generate(crypto.randomUUID(), maxMarks);
      await assertPackageIntegrity(generated);
      if (generated.public.maxMarks !== maxMarks) throw new HttpError(503, 'A question failed its approved blueprint check.');
      questions.push(await freezeQuestion({ public: { ...generated.public, id: crypto.randomUUID(), position }, templateId: generated.templateId, templateVersion: generated.templateVersion, seed: generated.seed, sourceTaskIds: generated.sourceTaskIds, solution: generated.solution, rubric: generated.rubric, validation: generated.validation }));
    }
    assertActivePackages({ id, ownerId: who, subjectId: subject.id, questions, status: 'answering', position: 0, answers: {}, grades: [] }, activeFamilies);
    try { return json(await store.create(id, who, subject.id, questions), 201); }
    catch (error) { if (await exists()) return json(await store.current(id, who)); throw error; }
  });
}
