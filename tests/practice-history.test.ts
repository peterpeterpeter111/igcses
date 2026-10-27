import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRACTICE_HISTORY_KEY, readPracticeHistory, savePracticeRecord, practicePlan, validPracticeRecord, type PracticeRecord } from '../lib/practice-history.ts';
const record = (id = 'attempt-1'): PracticeRecord => ({ id, subject: 'physics', startedAt: '2026-10-27T00:00:00.000Z', updatedAt: '2026-10-27T01:00:00.000Z', questions: 4, completed: 4, understood: 2, revisit: 2, finished: true });
function memory() { let value: string | null = null; return { getItem: (_key: string) => value, setItem: (_key: string, v: string) => { value = v; } }; }
void test('practice summaries survive a new reader, update idempotently, and remain unscored without written answers', () => {
 const storage = memory(); assert.deepEqual(readPracticeHistory(storage), []);
 assert.ok(savePracticeRecord(storage, record())); assert.equal(readPracticeHistory(storage)[0].revisit, 2);
 assert.ok(savePracticeRecord(storage, { ...record(), understood: 1, revisit: 3 })); assert.equal(readPracticeHistory(storage).length, 1);
 assert.equal(readPracticeHistory(storage)[0].revisit, 3);
 assert.ok(!validPracticeRecord({ ...record(), answer: 'private written answer' }));
});
void test('history caps storage, validates subjects/progress, and never overwrites corrupt or inaccessible data', () => {
 const storage = memory(); for (let n = 0; n < 40; n++) assert.ok(savePracticeRecord(storage, record('a-' + n)));
 assert.equal(readPracticeHistory(storage).length, 30);
 for (const r of [{ ...record(), completed: 1 }, { ...record(), subject: '../../evil' }, { ...record(), questions: 31 }, { ...record(), revisit: -1 }, { ...record(), updatedAt: 'invalid' }]) assert.equal(savePracticeRecord(storage, r), false);
 storage.setItem(PRACTICE_HISTORY_KEY, 'broken'); assert.equal(savePracticeRecord(storage, record()), false); assert.equal(storage.getItem(PRACTICE_HISTORY_KEY), 'broken');
 assert.equal(savePracticeRecord({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }, record()), false);
});
void test('revision plan follows explicit self-assessments and does not invent examiner marks', () => {
 assert.deepEqual(practicePlan([record(), { ...record('bio'), subject: 'biology', revisit: 3, understood: 1 }]), ['biology', 'physics']);
 assert.deepEqual(practicePlan([{ ...record(), revisit: 0 }]), []);
});
