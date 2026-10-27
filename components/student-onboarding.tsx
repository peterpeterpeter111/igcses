 'use client';
import { useState } from 'react';
import { parsePseudonym } from '@/lib/student-profile';
export function StudentOnboarding() {
  const [name, setName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <form onSubmit={async (event) => { event.preventDefault(); if (busy) return; setError('');
    try { const pseudonym = parsePseudonym(name); setBusy(true); const response = await fetch('/api/student/profile', { signal: AbortSignal.timeout(15000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonym }) }); const raw: unknown = await response.json(); const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}; if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Nickname could not be saved.'); window.location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); setBusy(false); }
  }}><label htmlFor="student-nickname">Your study nickname</label><input id="student-nickname" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} required aria-describedby="nickname-help" disabled={busy} /><p id="nickname-help">Use a pseudonym you remember, such as CrimsonFox. You do not need to use your real name. Nicknames are private labels, not passwords.</p>{error && <p role="alert">{error}</p>}<button className="action" disabled={busy} type="submit">{busy ? 'Saving…' : 'Enter the library'}</button></form>;
}
