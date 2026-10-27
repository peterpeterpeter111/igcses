import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { StudentStore } from '../server/student-store.ts';
import { parsePseudonym } from '../lib/student-profile.ts';
import type { PracticeRecord } from '../lib/practice-history.ts';
function fixture() {
 const sqlite = new DatabaseSync(':memory:'); sqlite.exec(readFileSync('drizzle/0003_peaceful_lila_cheney.sql', 'utf8'));
 const wrap = (sql: string, args: unknown[] = []) => ({
   bind(...values: unknown[]) { return wrap(sql, values); },
   async first() { return sqlite.prepare(sql).get(...args as never[]) ?? null; },
   async all() { return { results: sqlite.prepare(sql).all(...args as never[]) }; },
   async run() { return sqlite.prepare(sql).run(...args as never[]); },
 });
 const db = { prepare: wrap, async batch(statements: { run(): Promise<unknown> }[]) { sqlite.exec('BEGIN'); try { const rows = []; for (const s of statements) rows.push(await s.run()); sqlite.exec('COMMIT'); return rows; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } } as unknown as D1Database;
 return { store: new StudentStore(db), sqlite };
}
const record = (id: string, day = 1): PracticeRecord => ({ id, subject: 'physics', startedAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date(Date.UTC(2026, 9, day)).toISOString(), questions: 1, completed: 1, understood: 0, revisit: 1, finished: true });
void test('pseudonyms are private labels with unicode support and bounded validation', () => {
 assert.equal(parsePseudonym('  Crimson Fox  '), 'Crimson Fox'); assert.equal(parsePseudonym('桜の狐'), '桜の狐');
 for (const name of ['', 'a', '<script>', 'x\ny', 'x\u202ey', 'x'.repeat(33), null]) assert.throws(() => parsePseudonym(name));
});
void test('same pseudonym does not share accounts; history and deletion remain owner-scoped', async () => {
 const { store, sqlite } = fixture();
 await store.setProfile('a', 'Fox'); await store.setProfile('b', 'Fox');
 await store.save('a', record('same')); await store.save('b', { ...record('same'), understood: 1, revisit: 0 });
 assert.equal((await store.history('a'))[0].revisit, 1); assert.equal((await store.history('b'))[0].revisit, 0);
 await store.clear('a'); assert.deepEqual(await store.history('a'), []); assert.equal((await store.history('b')).length, 1);
 assert.equal(await store.profile('missing'), null); sqlite.close();
});
void test('late saves cannot overwrite newer progress, duplicate saves are idempotent and latest 30 retained', async () => {
 const { store, sqlite } = fixture();
 await store.save('a', record('one', 2)); await store.save('a', record('one', 1)); await store.save('a', record('one', 2));
 assert.equal((await store.history('a')).length, 1); assert.equal((await store.history('a'))[0].updatedAt, record('one', 2).updatedAt);
 for (let n = 1; n <= 35; n++) await store.save('a', record('r' + n, n));
 assert.equal((await store.history('a')).length, 30); assert.equal((await store.history('a'))[0].id, 'r35');
 await assert.rejects(store.save('a', { ...record('bad'), questions: 100 })); sqlite.close();
});
