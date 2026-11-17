/**
 * Text for the pages' metadata (title, description, Open Graph). Metadata is
 * rendered on the server, before the stored language is known, so it is in
 * English. It follows the claims rule in docs/PRODUCT_VISION.md: agreement
 * and comparison, no accuracy promise.
 */
export const SITE_NAME = "Ensemble AI";

export const SITE_DESCRIPTION =
  "Ask several AI models the same question at once, see where they agree and where they don't, and get one answer you can check against the originals.";

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
  benchmarks: {
    title: "Benchmarks",
    description:
      "How we test whether an ensemble of models beats its best member, with the method, the numbers and their confidence intervals.",
  },
} as const;
