export function GET() {
  return new Response(null, { status: 307, headers: { Location: '/favicon.svg', 'Cache-Control': 'public, max-age=86400' } });
}
