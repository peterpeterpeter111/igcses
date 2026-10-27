import { getDatabase } from '@/db';
import { StudentStore } from '@/server/student-store';
import { handle, json, owner, readJson, sameOrigin, HttpError } from '@/server/http';
import { validPracticeRecord } from '@/lib/practice-history';
export const dynamic = 'force-dynamic';
export async function GET() { return handle(async () => json({ records: await new StudentStore(getDatabase()).history(await owner()) })); }
export async function POST(request: Request) { return handle(async () => {
  sameOrigin(request); const id = await owner(); const data = await readJson(request, 4000);
  if (!validPracticeRecord(data.record)) throw new HttpError(400, 'Invalid practice summary.');
  const store = new StudentStore(getDatabase());
  if (!await store.profile(id)) throw new HttpError(403, 'Choose your nickname first.');
  await store.save(id, data.record); return json({ saved: true });
}); }
export async function DELETE(request: Request) { return handle(async () => { sameOrigin(request); const id = await owner(); await new StudentStore(getDatabase()).clear(id); return json({ cleared: true }); }); }
