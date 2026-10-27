import { validPracticeRecord, type PracticeRecord } from './practice-history.ts';
export async function accountPractice(method: 'GET' | 'POST' | 'DELETE', record?: PracticeRecord): Promise<PracticeRecord[]> {
  const response = await fetch('/api/student/history', { signal: AbortSignal.timeout(15000), method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(record ? { body: JSON.stringify({ record }) } : {}) });
  const raw: unknown = await response.json(); const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Account history could not be saved.');
  if (method !== 'GET') return [];
  if (!Array.isArray(data.records) || data.records.length > 30 || !data.records.every(validPracticeRecord)) throw new Error('Account history could not be read.');
  return data.records;
}
