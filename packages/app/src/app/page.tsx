import { redirect } from "next/navigation";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";

/**
 * `/` opens the workspace until the landing page (roadmap M4) replaces this
 * redirect.
 */
export default function Home() {
  redirect(WORKSPACE_PATH);
}
