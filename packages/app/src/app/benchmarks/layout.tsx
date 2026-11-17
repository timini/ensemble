import type { Metadata } from "next";
import { PAGE_METADATA } from "~/lib/siteMetadata";

export const metadata: Metadata = {
  ...PAGE_METADATA.benchmarks,
  openGraph: PAGE_METADATA.benchmarks,
};

/** Sets the metadata of /benchmarks; the page itself is a client component. */
export default function BenchmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
