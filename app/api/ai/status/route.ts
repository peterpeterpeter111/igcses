import { env } from 'cloudflare:workers';
import { aiConfiguration, REQUESTED_MODELS } from '@/server/ai/config';
import { activeFamilies } from '@/server/template-registry';
export const dynamic = 'force-dynamic';
export function GET() {
  const setup = aiConfiguration(env as unknown as Record<string, unknown>);
  return Response.json({ configured: setup.config !== null, liveVerified: false, missing: setup.missing, requestedModels: Object.values(REQUESTED_MODELS), activeTemplates: activeFamilies.length }, { headers: { 'Cache-Control': 'no-store' } });
}
