'use client';
import { useEffect, useRef, useState } from 'react';
export function ExamLauncher({ subject, ready }: { subject: string; ready: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const running = useRef(false), controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!ready) return null;
  async function start() {
    if (running.current) return; running.current = true; setBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const name = window.localStorage.getItem('igcses.active-student.v1');
      const session = await fetch('/api/student/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonym: name }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
      if (!session.ok) throw new Error('Reopen the library with your study name.');
      const pending = `igcses.pending-exam-start.${subject}`;
      let key = window.localStorage.getItem(pending);
      if (!key || !/^[a-f0-9-]{36}$/.test(key)) { key = crypto.randomUUID(); window.localStorage.setItem(pending, key); }
      const response = await fetch('/api/quiz/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, key }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]) });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok || typeof data.id !== 'string') throw new Error(data.error ?? 'The exam could not be opened.');
      if (abort.signal.aborted) return;
      window.localStorage.removeItem(pending);
      window.location.assign(`/quiz/${encodeURIComponent(data.id)}`);
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'The exam could not be opened.'); running.current = false; setBusy(false); }
  }
  return <><button className="action" type="button" disabled={busy} onClick={() => void start()}>{busy ? 'Preparing your exam…' : 'Start 80-mark exam'}</button>{error && <p role="alert">{error}</p>}</>;
}
