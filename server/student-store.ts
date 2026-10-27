import { parsePseudonym } from '../lib/student-profile.ts';
import { validPracticeRecord, type PracticeRecord } from '../lib/practice-history.ts';
export class StudentStore {
  private db: D1Database;
  constructor(db: D1Database) { this.db = db; }
  async profile(owner: string): Promise<string | null> {
    const row = await this.db.prepare('SELECT pseudonym FROM student_profiles WHERE owner_id=?').bind(owner).first<{ pseudonym: string }>();
    return row?.pseudonym ?? null;
  }
  async setProfile(owner: string, value: unknown) {
    const name = parsePseudonym(value);
    await this.db.prepare('INSERT INTO student_profiles(owner_id,pseudonym,updated_at) VALUES(?,?,?) ON CONFLICT(owner_id) DO UPDATE SET pseudonym=excluded.pseudonym,updated_at=excluded.updated_at').bind(owner, name, new Date().toISOString()).run();
    return name;
  }
  async history(owner: string): Promise<PracticeRecord[]> {
    const rows = await this.db.prepare('SELECT record_json FROM practice_summaries WHERE owner_id=? ORDER BY updated_at DESC,id DESC LIMIT 30').bind(owner).all<{ record_json: string }>();
    return rows.results.map((row) => { const value: unknown = JSON.parse(row.record_json); if (!validPracticeRecord(value)) throw new Error('Invalid saved summary'); return value; });
  }
  async save(owner: string, record: PracticeRecord) {
    if (!validPracticeRecord(record)) throw new Error('Invalid practice summary');
    const normalized = { ...record, startedAt: new Date(record.startedAt).toISOString(), updatedAt: new Date(record.updatedAt).toISOString() };
    await this.db.batch([
      this.db.prepare('INSERT INTO practice_summaries(owner_id,id,record_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET record_json=excluded.record_json,updated_at=excluded.updated_at WHERE excluded.updated_at >= practice_summaries.updated_at').bind(owner, record.id, JSON.stringify(normalized), normalized.updatedAt),
      this.db.prepare('DELETE FROM practice_summaries WHERE owner_id=? AND id NOT IN (SELECT id FROM practice_summaries WHERE owner_id=? ORDER BY updated_at DESC,id DESC LIMIT 30)').bind(owner, owner),
    ]);
  }
  async clear(owner: string) { await this.db.prepare('DELETE FROM practice_summaries WHERE owner_id=?').bind(owner).run(); }
}
