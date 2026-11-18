/**
 * Text for the pages' metadata (title, description, Open Graph). Metadata is
 * rendered on the server, before the stored language is known, so it is in
 * English. It follows the claims rule in docs/PRODUCT_VISION.md: agreement
 * and comparison, no accuracy promise.
 */
export const SITE_NAME = "Ensemble AI";

export const SITE_DESCRIPTION =
  "Ask several AI models the same question at once, see where they agree and where they don't, and get one answer you can check against the originals.";

/** The two lines of the default Open Graph image (English, like all metadata). */
export const OG_HEADLINE = [
  "Ask several AI models at once.",
  "See where they agree.",
] as const;

/**
 * Text of a shared run's metadata and preview image. Metadata is rendered
 * before the reader's language is known, so it is in English.
 */
export const SHARED_RUN_METADATA = {
  title: "Shared run",
  imageAlt: "A shared Ensemble AI run",
  imageFooter: "Shared run. Compare every answer and read the consensus.",
  missing: "This link has expired or was deleted",
  answers: (count: number) => `${count} answers`,
  level: {
    high: "High agreement",
    medium: "Medium agreement",
    low: "Low agreement",
  },
} as const;

export const PAGE_METADATA = {
  home: {
    title:
      "Ensemble AI: ask several AI models at once and see where they agree",
    description: SITE_DESCRIPTION,
  },
  workspace: {
    title: "Workspace",
    description:
      "Ask a question, compare the answers side by side and read how much they agree.",
  },
  features: {
    title: "Features",
    description:
      "What Ensemble does: answers from several models side by side, an agreement score from semantic embeddings, four ways to merge answers, local models and keys that stay in your browser.",
  },
  about: {
    title: "About",
    description:
      "Why Ensemble measures how much AI models agree, what that score can and cannot tell you, and the research behind it.",
  },
  account: {
    title: "Account",
    description:
      "Your Pro credit balance, purchases, usage by model and recent runs.",
  },
  benchmarks: {
    title: "Benchmarks",
    description:
      "How we test whether an ensemble of models beats its best member: the method, and the results once the run is published.",
  },
} as const;

/** Title and description of one page, as in PAGE_METADATA. */
export interface PageMetadata {
  readonly title: string;
  readonly description: string;
}

/**
 * Open Graph metadata for one page. Next.js replaces the root layout's
 * `openGraph` object instead of merging it, so each page has to repeat the
 * type and site name. The title template does not apply inside `openGraph`,
 * so the site name is added here unless the title already contains it.
 */
export function pageOpenGraph(page: PageMetadata) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    title: page.title.includes(SITE_NAME)
      ? page.title
      : `${page.title} | ${SITE_NAME}`,
    description: page.description,
  };
}
