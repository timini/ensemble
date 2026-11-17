import { redirect } from "next/navigation";
import { legacyRouteTarget, workspaceHref } from "~/lib/workspaceRoutes";

/**
 * /prompt from the old four-step wizard. Redirects into the workspace with the
 * matching panel open (see lib/workspaceRoutes.ts), keeping the query.
 */
export default async function LegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(workspaceHref(legacyRouteTarget("prompt"), await searchParams));
}
