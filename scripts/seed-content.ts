import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { subjects } from '../content/catalog.ts';
import { getNotes } from '../content/notes.ts';
const args = process.argv.slice(2);
if (args.length && (args.length !== 1 || args[0] !== '--stdout'))
  throw new Error('Usage: seed-content.ts [--stdout]');
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const quote = (v: unknown) =>
  v === null || v === undefined
    ? 'NULL'
    : typeof v === 'number'
      ? String(v)
      : "'" +
        (typeof v === 'string' ? v : JSON.stringify(v)).replaceAll("'", "''") +
        "'";
const lines: string[] = [];
// D1 limits SQL text to100,000bytes per statement. Split escaped UTF-8
// content at48KB, leaving ample space for identifiers and the UPDATE wrapper.
// Re-seeding resets the first chunk before appending, so it is repeatable.
function contentChunks(text: string): string[] {
  const chunks: string[] = [];
  let chunk = '', bytes = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character === "'" ? "''" : character, 'utf8');
    if (bytes + size > 48000) { chunks.push(chunk); chunk = ''; bytes = 0; }
    chunk += character; bytes += size;
  }
  chunks.push(chunk);
  return chunks;
}
function upsert(table: string, row: Record<string, unknown>, key = 'id') {
  const payload = table === 'chapters' && typeof row.content_json === 'string' ? row.content_json : null;
  if (payload !== null && Buffer.byteLength(payload, 'utf8') > 1900000)
    throw new Error('Chapter content approaches the D1 two-megabyte row limit; split the stored content before seeding.');
  const chunks = payload === null ? [] : contentChunks(payload);
  const seedRow = chunks.length ? { ...row, content_json: chunks[0] } : row;
  const names = Object.keys(seedRow);
  lines.push(
    'INSERT INTO ' +
      table +
      ' (' +
      names.join(',') +
      ') VALUES (' +
      names.map((k) => quote(seedRow[k])).join(',') +
      ') ON CONFLICT(' +
      key +
      ') DO UPDATE SET ' +
      names
        .filter((k) => k !== key)
        .map((k) => k + '=excluded.' + k)
        .join(',') +
      ';',
  );
  for (const chunk of chunks.slice(1))
    lines.push('UPDATE chapters SET content_json=content_json || ' + quote(chunk) + ' WHERE ' + key + '=' + quote(row[key]) + ';');
}
for (const s of subjects)
  upsert('subjects', { id: s.id, code: s.code, title: s.title });
for (const s of read('research/sources.json'))
  upsert('sources', {
    id: s.id,
    qualification: s.qualification,
    url: s.url,
    title: s.title,
    kind: s.documentType,
    issue: s.specificationIssue,
    sha256: s.sha256,
    access_status: s.status,
    access_date: s.accessDate,
    review_json: JSON.stringify(s.reviewedSections),
  });
for (const s of subjects)
  for (const [i, c] of s.chapters.entries()) {
    const note = getNotes(s.id, c.id);
    upsert('chapters', {
      id: s.code + ':' + c.id,
      subject_id: s.id,
      slug: c.id,
      title: c.title,
      sort_order: i,
      content_json: note ? JSON.stringify(note) : null,
      status: note ? 'partial-source-checked' : 'planned',
      human_reviewed: 0,
    });
  }
for (const p of read('research/coverage.json')) {
  const s = subjects.find((s) => s.code === p.qualification);
  if (!s) throw new Error('Unknown subject');
  upsert('specification_points', {
    id: p.id,
    subject_id: s.id,
    source_id: p.sourceId,
    reference: p.reference,
    source_page: p.pdfPage,
    scope_status: 'candidate',
  });
}
for (const line of lines)
  if (Buffer.byteLength(line, 'utf8') > 100000) throw new Error('Seed statement exceeds the D1 SQL-text limit.');
const sql = lines.join('\n') + '\n';
if (args[0] === '--stdout') {
  // Let isolated checks consume the seed without changing a prepared file.
  process.stdout.write(sql);
} else {
  mkdirSync('work', { recursive: true });
  writeFileSync('work/seed-content.sql', sql);
  console.log(
    'Prepared ' + lines.length + ' content rows; no quiz, user or private question data.',
  );
}
