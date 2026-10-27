import { subjects } from '../content/catalog.ts';
export const PRACTICE_HISTORY_KEY = 'igcses.practice-history.v1';
export type PracticeRecord = { id: string; subject: string; startedAt: string; updatedAt: string; questions: number; completed: number; understood: number; revisit: number; finished: boolean };
type Reader = Pick<Storage, 'getItem'>;
type Writer = Reader & Pick<Storage, 'setItem'>;
export function validPracticeRecord(value: unknown): value is PracticeRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as PracticeRecord;
  return Object.keys(r).sort().join(',') === 'completed,finished,id,questions,revisit,startedAt,subject,understood,updatedAt' &&
    typeof r.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(r.id) && subjects.some((s) => s.id === r.subject) &&
    [r.startedAt, r.updatedAt].every((d) => typeof d === 'string' && d.length <= 30 && Number.isFinite(Date.parse(d))) && Date.parse(r.updatedAt) >= Date.parse(r.startedAt) &&
    [r.questions, r.completed, r.understood, r.revisit].every(Number.isInteger) && r.questions >= 1 && r.questions <= 30 &&
    r.completed >= 0 && r.completed <= r.questions && r.understood >= 0 && r.revisit >= 0 && r.understood + r.revisit <= r.completed &&
    typeof r.finished === 'boolean' && (!r.finished || r.completed === r.questions);
}
export function readPracticeHistory(storage: Reader): PracticeRecord[] {
  const raw = storage.getItem(PRACTICE_HISTORY_KEY);
  if (!raw) return [];
  if (raw.length > 100000) throw new Error('Saved practice data is too large.');
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(validPracticeRecord) || new Set(data.map((r) => r.id)).size !== data.length) throw new Error('Saved practice data could not be read.');
  return data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
}
export function savePracticeRecord(storage: Writer, record: PracticeRecord): boolean {
  if (!validPracticeRecord(record)) return false;
  try {
    const rows = readPracticeHistory(storage).filter((r) => r.id !== record.id);
    rows.push(record);
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(rows.slice(0, 30)));
    return true;
  } catch { return false; }
}
export function practicePlan(rows: PracticeRecord[]): string[] {
  const totals = new Map<string, number>();
  for (const r of rows.filter(validPracticeRecord)) totals.set(r.subject, (totals.get(r.subject) ?? 0) + r.revisit);
  return [...totals].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([id]) => id);
}
