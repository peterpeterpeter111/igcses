'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { subjects } from '@/content/catalog';
type Row = { id: string; subject_id: string; status: string; created_at: string; score: number | null };
export function ExamHistory() {
  const [rows, setRows] = useState<Row[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''); const running = useRef(false);
  async function load() {
    if (running.current) return; running.current = true; setBusy(true); setError('');
    try {
      const session = await fetch('/api/student/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonym: window.localStorage.getItem('igcses.active-student.v1') }), signal: AbortSignal.timeout(15000) });
      if (!session.ok) throw new Error('Reopen the library with your study name.');
      const response = await fetch('/api/history', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await response.json() as { attempts?: Row[]; error?: string };
      if (!response.ok || !Array.isArray(data.attempts) || data.attempts.length > 100 || data.attempts.some((r) => !r || typeof r.id !== 'string' || typeof r.subject_id !== 'string' || typeof r.created_at !== 'string' || !['answering', 'marking', 'complete'].includes(r.status) || (r.score !== null && (typeof r.score !== 'number' || !Number.isFinite(r.score))))) throw new Error(data.error ?? 'Saved exams could not be read.');
      setRows(data.attempts);
    } catch (e) { setError(e instanceof Error ? e.message : 'Saved exams could not be read.'); } finally { running.current = false; setBusy(false); }
  }
  return <section className="note"><h2>Exam history</h2><p>Exam attempts are stored for this browser profile. A study name alone cannot recover them on another device. No new exam is available until its bank and model team are approved.</p><button className="action" disabled={busy} onClick={() => void load()}>{busy ? 'Loading saved exams…' : 'Load saved exams on this browser'}</button>{error && <p role="alert">{error}</p>}{rows && (rows.length ? <ul>{rows.map((row) => <li key={row.id}><Link href={`/quiz/${encodeURIComponent(row.id)}`}>{subjects.find((s) => s.id === row.subject_id)?.title ?? row.subject_id} · {row.created_at.slice(0, 10)} · {row.status === 'complete' ? `AI proposal ${row.score ?? '—'}/80` : row.status === 'marking' ? 'Continue examiner review' : 'Resume exam'}</Link></li>)}</ul> : <p>No exams saved for this browser profile.</p>)}</section>;
}
