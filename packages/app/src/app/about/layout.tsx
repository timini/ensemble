import type { Metadata } from "next";
import { PAGE_METADATA } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.about,
  openGraph: PAGE_METADATA.about,
};

/** Sets the metadata of /about; the page itself is a client component. */
export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
