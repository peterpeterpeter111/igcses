'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subjects } from '@/content/catalog';
import { practicePlan, type PracticeRecord } from '@/lib/practice-history';
import { accountPractice } from '@/lib/account-practice';
export function PracticeHistory() {
  const [rows, setRows] = useState<PracticeRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<string[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    let mounted = true;
    void accountPractice('GET').then((records) => { if (mounted) setRows(records); }).catch(() => { if (mounted) setError('Account practice history could not be read. Existing data has not been changed.'); }).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  const [clearing, setClearing] = useState(false);
  async function clear() {
    if (clearing) return; setClearing(true);
    try { await accountPractice('DELETE'); setRows([]); setPlan(null); setError(''); setConfirmClear(false); }
    catch { setError('Account history could not be cleared.'); }
    finally { setClearing(false); }
  }
  return <section aria-labelledby="practice-history-title">
    <h2 id="practice-history-title">Your saved lesson practice</h2>
    <p>The latest 30 practice summaries are saved to your signed-in account across devices. Written answers are not stored in these summaries. These are self-assessments, not exam marks. Older browser-only records have not been imported or deleted.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!ready ? <output>Loading practice history…</output> : rows.length ? <>
      <div className="table-wrap"><table><caption>Saved lesson practice</caption><thead><tr><th>Subject</th><th>Date</th><th>Progress</th><th>Your review</th><th>Practice</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}>
        <td>{subjects.find((s) => s.id === r.subject)?.title}</td><td>{r.startedAt.slice(0, 10)}</td><td>{r.completed}/{r.questions} · {r.finished ? 'Finished' : 'Left before finishing'}</td><td>{r.understood} understood · {r.revisit} to revisit</td><td><Link href={`/revision/${r.subject}`}>Practise again</Link></td>
      </tr>)}</tbody></table></div>
      <button className="action" onClick={() => setPlan(practicePlan(rows))}>Build a revision plan</button>

      {plan !== null && <div className="note" aria-live="polite"><h3>Your next revision</h3>{plan.length ? <><p>Start with the subjects where you marked the most topics to revisit. This plan uses your self-assessments, without AI scoring.</p><ul>{plan.map((id) => <li key={id}><Link href={`/revision/${id}`}>{subjects.find((s) => s.id === id)?.title} practice →</Link></li>)}</ul></> : <p>No topics are marked to revisit yet. Complete a set, compare the explanations, and mark any topics you want to practise again.</p>}</div>}
    </> : ready && <p>No lesson practice saved yet. <Link href="/quiz">Start custom practice →</Link></p>}
    {(rows.length > 0 || error) && <button className="action" onClick={() => setConfirmClear(true)}>Clear saved practice history</button>}
    {confirmClear && <div className="note"><p>Clear these practice summaries from your account on all devices?</p><button className="action" disabled={clearing} onClick={() => void clear()}>Confirm clear</button><button className="action" disabled={clearing} onClick={() => setConfirmClear(false)}>Cancel</button></div>}
  </section>;
}
