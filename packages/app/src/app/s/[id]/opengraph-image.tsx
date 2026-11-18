import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgFrame } from "~/lib/ogImage";
import { SHARED_RUN_METADATA as TEXT } from "~/lib/siteMetadata";
import { sharedLevel, truncate } from "~/lib/share/shareMetadata";
import { loadShare } from "~/server/share/loadShare";

export const alt = TEXT.imageAlt;
export const size = OG_SIZE;
export const contentType = "image/png";
// Reads Firestore through firebase-admin.
export const runtime = "nodejs";

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
  const score = run?.agreement ? Math.round(run.agreement.score * 100) : 0;
  return new ImageResponse(
    <OgFrame footer={TEXT.imageFooter}>
      <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.15 }}>
        {run ? truncate(run.prompt, 140) : TEXT.missing}
      </div>
      {run && (
        <div style={{ display: "flex", gap: 32, fontSize: 34 }}>
          <div style={{ color: OG_COLORS.muted }}>
            {TEXT.answers(run.answers.length)}
          </div>
          {level && (
            <div style={{ color: OG_COLORS[level], fontWeight: 600 }}>
              {`${TEXT.level[level]} · ${score}%`}
            </div>
          )}
        </div>
      )}
    </OgFrame>,
    size,
  );
}
