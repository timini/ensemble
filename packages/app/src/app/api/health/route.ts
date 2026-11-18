export const dynamic = "force-dynamic";

/**
 * GET /api/health: answers 200 while the server runs, for the uptime
 * check. It touches no database or provider, so checks cost nothing and
 * do not keep anything else awake.
 */
export function GET() {
  return Response.json(
    { ok: true },
    { headers: { "cache-control": "no-store" } },
  );
}
