import { getDatabase } from '@/db';
import { SessionStore } from '@/server/session-store';
import { handle, owner, json } from '@/server/http';
export const dynamic = 'force-dynamic';
export function GET() {
  return handle(async () =>
    json({
      attempts: await new SessionStore(getDatabase()).history(await owner()),
    }),
  );
}
