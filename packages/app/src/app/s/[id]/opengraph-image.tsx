import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgFrame } from "~/lib/ogImage";
import { sharedLevel, truncate } from "~/lib/share/shareMetadata";
import { loadShare } from "~/server/share/loadShare";

export const alt = "A shared Ensemble AI run";
export const size = OG_SIZE;
export const contentType = "image/png";
// Reads Firestore through firebase-admin.
export const runtime = "nodejs";

const LEVEL = {
  high: "High agreement",
  medium: "Medium agreement",
  low: "Low agreement",
} as const;

/** Preview of a shared run: the question, the number of answers and the agreement. */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await loadShare(id);
  const run = share?.run;
  const level = run ? sharedLevel(run) : null;
  return new ImageResponse(
    <OgFrame footer="Shared run. Compare every answer and read the consensus.">
      <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.15 }}>
        {run
          ? truncate(run.prompt, 140)
          : "This link has expired or was deleted"}
      </div>
      {run && (
        <div style={{ display: "flex", gap: 32, fontSize: 34 }}>
          <div
            style={{ color: OG_COLORS.muted }}
          >{`${run.answers.length} answers`}</div>
          {level && (
            <div style={{ color: OG_COLORS[level], fontWeight: 600 }}>
              {`${LEVEL[level]} · ${Math.round(run.agreement!.score * 100)}%`}
            </div>
          )}
        </div>
      )}
    </OgFrame>,
    size,
  );
}
