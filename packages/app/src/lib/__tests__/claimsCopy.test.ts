import { describe, expect, it } from "vitest";
import summary from "~/data/benchmark-summary.json";
import en from "../../../public/locales/en/common.json";
import fr from "../../../public/locales/fr/common.json";

/**
 * The claims rule in docs/PRODUCT_VISION.md: public copy states no figures
 * beyond what /benchmarks shows, and promises agreement, not correctness.
 */
describe("public claims copy", () => {
  const locales = { en, fr };

  it.each(Object.entries(locales))(
    "%s: the Features claims state no figures while no benchmark run is published",
    (_, strings) => {
      if (summary.status !== "not-run") return;
      expect(strings.pages.features.claims.body).not.toMatch(/\d\s?%/);
    },
  );

  it.each(Object.entries(locales))(
    "%s: the agreement score is not described as making an answer safe",
    (_, strings) => {
      const score = strings.pages.features.core.items.find(
        (item: { id: string }) => item.id === "score",
      );
      expect(score?.body).not.toMatch(/safe to use|réponse fiable/i);
    },
  );
});
