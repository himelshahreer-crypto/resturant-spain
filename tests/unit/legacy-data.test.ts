import { describe, expect, it } from "vitest";
import { loadDesignComponent, extractData } from "../../scripts/lib/design-extract.mjs";
import * as D from "@/legacy/design-data";

const raw = extractData(loadDesignComponent()) as Record<string, unknown>;

describe("legacy design-shaped data equals the design's own data", () => {
  const pairs = [
    ["CATS", "categories"],
    ["ITEMS", "items"],
    ["ALLERGENS", "allergens"],
    ["SLIDES", "slides"],
    ["POPULAR", "popular"],
    ["REVIEWS", "reviews"],
    ["JOURNEY", "journey"],
    ["TIMELINE", "timeline"],
    ["GALLERY", "gallery"],
    ["FAQ", "faq"],
  ] as const;
  it.each(pairs)("%s", (ours, theirs) => {
    expect(JSON.parse(JSON.stringify(D[ours]))).toEqual(raw[theirs]);
  });
});
