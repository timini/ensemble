import { describe, expect, it } from "vitest";
import { PAGE_METADATA, SITE_NAME, pageOpenGraph } from "../siteMetadata";

describe("pageOpenGraph", () => {
  it("keeps the site name and type that the root layout sets", () => {
    const og = pageOpenGraph(PAGE_METADATA.features);
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.type).toBe("website");
    expect(og.description).toBe(PAGE_METADATA.features.description);
  });

  it("adds the site name to a bare page title", () => {
    expect(pageOpenGraph(PAGE_METADATA.about).title).toBe(
      `About | ${SITE_NAME}`,
    );
  });

  it("leaves a title that already names the site unchanged", () => {
    expect(pageOpenGraph(PAGE_METADATA.home).title).toBe(
      PAGE_METADATA.home.title,
    );
  });

  it("does not promise benchmark numbers that are not published", () => {
    expect(PAGE_METADATA.benchmarks.description).not.toMatch(
      /numbers|confidence interval/i,
    );
  });
});
