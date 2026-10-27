import { practiceHistoryKey, readPracticeHistory, savePracticeRecord, type PracticeRecord } from './practice-history.ts';
import { parsePseudonym } from './student-profile.ts';
const ACTIVE_KEY = 'igcses.active-student.v1';
function activeName(): string { const value = window.localStorage.getItem(ACTIVE_KEY); if (!value) throw new Error('Choose a study name before saving progress.'); return parsePseudonym(value); }
export async function accountPractice(method: 'GET' | 'POST' | 'DELETE', record?: PracticeRecord): Promise<PracticeRecord[]> {
  const name = activeName(); const storage = window.localStorage; const key = practiceHistoryKey(name);
  if (method === 'GET') return readPracticeHistory(storage, name);
  if (method === 'POST') { if (!record || !savePracticeRecord(storage, record, name)) throw new Error('Practice progress could not be saved in this browser.'); return []; }
  storage.removeItem(key); return [];
}
