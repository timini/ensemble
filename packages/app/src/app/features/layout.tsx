import type { Metadata } from "next";
import { PAGE_METADATA, pageOpenGraph } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.features,
  openGraph: pageOpenGraph(PAGE_METADATA.features),
};

/** Sets the metadata of /features; the page itself is a client component. */
export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
