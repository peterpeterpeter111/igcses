import { AiError } from './config.ts';
import { assertReviewState, newReview, type ReviewState } from './council.ts';
import type { Attempt } from '../quiz-contract.ts';
import { canonicalJson } from '../question-package.ts';
type Row = { owner_id: string; config_hash: string; state_json: string; revision: number; lease_token: string | null; lease_until: number | null; error_code: string | null };
export class ReviewStore {
  private db: D1Database;
  constructor(db: D1Database) { this.db = db; }
  async read(attempt: Attempt): Promise<ReviewState | null> {
    const row = await this.db.prepare('SELECT state_json FROM ai_review_jobs WHERE session_id=? AND owner_id=?').bind(attempt.id, attempt.ownerId).first<{ state_json: string }>();
    if (!row) return null;
    const state = JSON.parse(row.state_json) as ReviewState; assertReviewState(state, attempt);
    const records = await this.db.prepare('SELECT step_key,record_json FROM ai_review_records WHERE session_id=?').bind(attempt.id).all<{ step_key: string; record_json: string }>();
    state.records = Object.fromEntries(records.results.map((r) => [r.step_key, JSON.parse(r.record_json)]));
    return state;
  }
  async claim(attempt: Attempt, configHash: string, retryUncertain = false) {
    const now = Date.now(), token = crypto.randomUUID();
    await this.db.prepare('INSERT INTO ai_review_jobs(session_id,owner_id,config_hash,state_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(session_id) DO NOTHING').bind(attempt.id, attempt.ownerId, configHash, JSON.stringify(newReview(attempt)), new Date(now).toISOString()).run();
    const row = await this.db.prepare('SELECT * FROM ai_review_jobs WHERE session_id=? AND owner_id=?').bind(attempt.id, attempt.ownerId).first<Row>();
    if (!row || row.config_hash !== configHash) throw new AiError('LOCKED', 'The saved review uses a different provider configuration. It has been preserved for review.');
    if (row.error_code === 'RATE_LIMIT' && Number(row.lease_until) > now) throw new AiError('RATE_LIMIT', 'The free service requested a pause before another review request.', Math.ceil((Number(row.lease_until) - now) / 1000));
    if (row.lease_token && Number(row.lease_until) > now) throw new AiError('BUSY', 'A review step is already running. Wait before continuing.');
    if ((row.lease_token || row.error_code === 'UNCERTAIN') && !retryUncertain) throw new AiError('UNCERTAIN', 'The previous step has an uncertain outcome. Use the explicit retry button to send it again.');
    const state = JSON.parse(row.state_json) as ReviewState; assertReviewState(state, attempt);
    const result = await this.db.prepare('UPDATE ai_review_jobs SET lease_token=?,lease_until=?,error_code=NULL WHERE session_id=? AND owner_id=? AND revision=? AND (lease_token IS NULL OR lease_until<=?)').bind(token, now + 300_000, attempt.id, attempt.ownerId, row.revision, now).run();
    if (!result.meta.changes) throw new AiError('BUSY', 'Another request is already continuing this review.');
    const records = await this.db.prepare('SELECT step_key,record_json FROM ai_review_records WHERE session_id=?').bind(attempt.id).all<{ step_key: string; record_json: string }>();
    state.records = Object.fromEntries(records.results.map((r) => [r.step_key, JSON.parse(r.record_json)]));
    return { token, state };
  }
  async save(id: string, who: string, token: string, state: ReviewState) {
    const saved = await this.db.prepare('SELECT step_key,record_json FROM ai_review_records WHERE session_id=?').bind(id).all<{ step_key: string; record_json: string }>();
    const existing = new Set(saved.results.map((r) => r.step_key));
    for (const row of saved.results) if (!state.records[row.step_key] || canonicalJson(state.records[row.step_key]) !== canonicalJson(JSON.parse(row.record_json))) throw new AiError('LOCKED', 'Previously saved examiner findings cannot be overwritten.');
    const added = Object.entries(state.records).filter(([key]) => !existing.has(key));
    if (added.some(([key, value]) => key.length > 240 || new TextEncoder().encode(JSON.stringify(value)).byteLength > 150_000)) throw new AiError('OUTPUT', 'The review step exceeds the safe storage limit.');
    // Store each bounded response in its own row; a long whole-exam discussion
    // must never exceed D1's per-row limit or rewrite earlier model responses.
    const result = await this.db.batch([
      ...added.map(([key, value]) => this.db.prepare('INSERT INTO ai_review_records(session_id,step_key,record_json) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM ai_review_jobs WHERE session_id=? AND owner_id=? AND lease_token=?) ON CONFLICT(session_id,step_key) DO NOTHING').bind(id, key, JSON.stringify(value), id, who, token)),
      this.db.prepare('UPDATE ai_review_jobs SET state_json=?,revision=revision+1,lease_token=NULL,lease_until=NULL,error_code=NULL,updated_at=? WHERE session_id=? AND owner_id=? AND lease_token=?').bind(JSON.stringify({ ...state, records: {} }), new Date().toISOString(), id, who, token),
    ]);
    if (!result.at(-1)?.meta.changes) throw new AiError('UNCERTAIN', 'A stale review result was refused. Reload the saved step before retrying.');
  }
  async fail(id: string, who: string, token: string, code: string, retryAfter = 0) {
    await this.db.prepare('UPDATE ai_review_jobs SET lease_token=NULL,lease_until=?,error_code=?,updated_at=? WHERE session_id=? AND owner_id=? AND lease_token=?').bind(code === 'RATE_LIMIT' ? Date.now() + Math.min(3600, Math.max(1, retryAfter)) * 1000 : null, code, new Date().toISOString(), id, who, token).run();
  }
}
