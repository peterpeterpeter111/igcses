'use client';
import { useState, useSyncExternalStore, type SyntheticEvent } from 'react';
import { parsePseudonym } from '@/lib/student-profile';

const KEY = 'igcses.active-student.v1';
function readActiveStudent(): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try { const value = window.localStorage.getItem(KEY); return value ? parsePseudonym(value) : null; } catch { return null; }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('igcses-student-change', callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('igcses-student-change', callback); };
}
export function StudentGate({ children }: { children: React.ReactNode }) {
  const name = useSyncExternalStore(subscribe, readActiveStudent, () => undefined);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function enter(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError('');
    try { const value = parsePseudonym(input); setBusy(true); window.localStorage.setItem(KEY, value); window.dispatchEvent(new Event('igcses-student-change')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Choose a nickname and try again.'); }
    finally { setBusy(false); }
  }
  function signOut() { window.localStorage.removeItem(KEY); window.dispatchEvent(new Event('igcses-student-change')); setInput(''); }
  if (name === undefined) return <main className="page" aria-busy="true"><p>Opening your study library…</p></main>;
  if (!name) return <main className="page"><h1>Open the study library</h1><p>Choose a nickname you’ll remember to save your practice progress on this browser.</p><form onSubmit={enter}><label htmlFor="student-nickname">Your study name</label><input id="student-nickname" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} maxLength={64} required aria-describedby="nickname-help" disabled={busy}/><p id="nickname-help">This name is a label, not a password. Progress stays in this browser. Anyone using this browser can switch to a name and view its saved history.</p>{error && <p role="alert">{error}</p>}<button className="action" disabled={busy} type="submit">{busy ? 'Opening…' : 'Open study library'}</button></form></main>;
  return <><div className="student-bar"><span>Studying as {name} · Saved on this browser</span><button type="button" className="student-signout" onClick={signOut}>Switch name</button></div>{children}</>;
}
