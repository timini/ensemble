import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgFrame } from "~/lib/ogImage";
import { OG_HEADLINE, SITE_DESCRIPTION, SITE_NAME } from "~/lib/siteMetadata";

export const alt = `${SITE_NAME}: ask several AI models at once and see where they agree`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Default preview image for the landing page and pages without their own. */
export default function Image() {
  return new ImageResponse(
    <OgFrame footer={SITE_DESCRIPTION}>
      <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.1 }}>
        {OG_HEADLINE[0]}
      </div>
      <div style={{ fontSize: 76, lineHeight: 1.1, color: OG_COLORS.primary }}>
        {OG_HEADLINE[1]}
      </div>
    </OgFrame>,
    size,
  );
}
