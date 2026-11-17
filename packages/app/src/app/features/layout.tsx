import type { Metadata } from "next";
import { PAGE_METADATA } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.features,
  openGraph: PAGE_METADATA.features,
};

/** Sets the metadata of /features; the page itself is a client component. */
export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
