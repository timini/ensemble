import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_NAME } from "~/lib/siteMetadata";
import { sharePath } from "~/lib/share/shareLinks";
import { sharedRunSummary } from "~/lib/share/shareMetadata";
import { loadShare } from "~/server/share/loadShare";
import { SharedRunView } from "./_components/SharedRunView";

// Read from Firestore on every request: shares change and expire.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Title, description and preview of a shared run. Shared runs are not
 * indexed by search engines (they are user content that expires), but
 * link previews still read the Open Graph tags and image.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) return { title: "Shared run", robots: { index: false } };
  const { title, description } = sharedRunSummary(share.run);
  return {
    title,
    description,
    alternates: { canonical: sharePath(id) },
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: sharePath(id),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * `/s/[id]`: a shared run, read only, rendered on the server so it opens
 * for signed-out visitors and link preview crawlers alike. An unknown or
 * expired id answers 404 with the not-found page of this route (drawn in
 * the browser: Next.js streams the 404 after the page shell).
 */
export default async function SharedRunPage({ params }: PageProps) {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) notFound();
  return (
    <SharedRunView
      run={share.run}
      createdAt={share.createdAt}
      expiresAt={share.expiresAt}
    />
  );
}
