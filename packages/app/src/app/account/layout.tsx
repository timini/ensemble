import type { Metadata } from "next";
import { PAGE_METADATA, pageOpenGraph } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.account,
  openGraph: pageOpenGraph(PAGE_METADATA.account),
  // A personal page: nothing for search engines.
  robots: { index: false, follow: false },
};

/** Sets the metadata of /account; the page itself is a client component. */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
