import { getDatabase } from '@/db';
import { SessionStore } from '@/server/session-store';
import { handle, owner, json } from '@/server/http';
export const dynamic = 'force-dynamic';
export function GET(
  request: Request,
  { params }: { params: Promise<{ session: string }> },
) {
  return handle(async () => {
    const who = await owner(request);
    return json(
      await new SessionStore(getDatabase()).results(
        (await params).session,
        who,
      ),
    );
  });
}
