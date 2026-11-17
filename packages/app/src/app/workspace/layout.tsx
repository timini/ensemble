import type { Metadata } from "next";
import { PAGE_METADATA, pageOpenGraph } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.workspace,
  openGraph: pageOpenGraph(PAGE_METADATA.workspace),
};

/** Sets the metadata of /workspace; the page itself is a client component. */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
