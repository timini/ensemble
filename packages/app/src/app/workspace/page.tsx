"use client";

import { Suspense } from "react";
import { Workspace } from "./_components/Workspace";

/**
 * /workspace: the app's main screen. Composer, agreement, consensus and
 * answers on one page; /config, /ensemble, /prompt and /review redirect
 * here (see lib/workspaceRoutes.ts).
 */
export default function WorkspacePage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}
