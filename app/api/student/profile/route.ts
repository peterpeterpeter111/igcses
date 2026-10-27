import { getDatabase } from '@/db';
import { StudentStore } from '@/server/student-store';
import { handle, json, owner, readJson, sameOrigin, HttpError } from '@/server/http';
import { parsePseudonym } from '@/lib/student-profile';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return handle(async () => {
  sameOrigin(request); const id = await owner(); const data = await readJson(request, 1000);
  let name: string; try { name = parsePseudonym(data.pseudonym); } catch (e) { throw new HttpError(400, e instanceof Error ? e.message : 'Invalid nickname'); }
  return json({ pseudonym: await new StudentStore(getDatabase()).setProfile(id, name) });
}); }
