import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const f of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sqlite.exec(readFileSync('drizzle/' + f, 'utf8'));
  sqlite
    .prepare('INSERT INTO subjects(id,code,title) VALUES (?,?,?)')
    .run('physics', '4PH1', 'Physics');
  class Statement {
    args: unknown[] = [];
    query: string;
    constructor(query: string) {
      this.query = query;
    }
    bind(...args: unknown[]) {
      this.args = args;
      return this;
    }
    firstSync() {
      return sqlite.prepare(this.query).get(...(this.args as never[])) ?? null;
    }
    async first() {
      return this.firstSync();
    }
    allSync() {
      return {
        success: true,
        results: sqlite.prepare(this.query).all(...(this.args as never[])),
        meta: { changes: 0 },
      };
    }
    async all() {
      return this.allSync();
    }
    runSync() {
      const r = sqlite.prepare(this.query).run(...(this.args as never[]));
      return {
        success: true,
        results: [],
        meta: { changes: Number(r.changes) },
      };
    }
    async run() {
      return this.runSync();
    }
  }
  const db = {
    prepare: (q: string) => new Statement(q),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements)
          results.push(/^\s*SELECT/i.test(s.query) ? s.allSync() : s.runSync());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db: db as unknown as D1Database, sqlite };
}
