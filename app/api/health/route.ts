export function GET() {
  return Response.json(
    {
      status: 'ok',
      application: 'igcses',
      phase: 'architecture-in-progress',
      quizReady: false,
      activeTemplates: 0,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
