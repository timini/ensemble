import type { Metadata } from "next";
import { PAGE_METADATA, pageOpenGraph } from "~/lib/siteMetadata";
import { Landing } from "./_components/Landing";

export const metadata: Metadata = {
  title: { absolute: PAGE_METADATA.home.title },
  description: PAGE_METADATA.home.description,
  openGraph: pageOpenGraph(PAGE_METADATA.home),
};

/** `/`: the landing page. The workspace is at /workspace. */
export default function Home() {
  return <Landing />;
}
