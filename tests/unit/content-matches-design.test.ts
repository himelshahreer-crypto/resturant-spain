// Proves src/content and src/messages are exactly what the design computes.
// If content is changed on purpose (e.g. a new price), regenerate or update
// this test deliberately: it's the guard against accidental drift.
import { describe, expect, it } from "vitest";
import { loadDesignComponent, extractData, extractMessages, LANGS } from "../../scripts/lib/design-extract.mjs";
import { toContent } from "../../scripts/lib/to-content.mjs";
import * as menu from "@/content/menu";
import * as home from "@/content/home";
import es from "@/messages/es.json";
import ca from "@/messages/ca.json";
import en from "@/messages/en.json";

const Component = loadDesignComponent();
const expected = toContent(extractData(Component));

describe("content matches the design", () => {
  it.each(["categories", "items", "allergens"] as const)("menu.%s", (k) => {
    expect(menu[k]).toEqual(expected[k]);
  });
  it.each(["slides", "popular", "reviews", "journey", "timeline", "gallery", "faq"] as const)("home.%s", (k) => {
    expect(home[k]).toEqual(expected[k]);
  });
  it("prices are exact cents of the design's euro values", () => {
    const raw = extractData(Component).items as { id: string; price: number }[];
    for (const r of raw) {
      const it = menu.items.find((i) => i.id === r.id)!;
      expect((it.priceCents / 100).toFixed(2)).toBe(r.price.toFixed(2));
    }
  });
});

describe("UI strings match the design", () => {
  const files = { es, ca, en } as const;
  const fromDesign = extractMessages(Component) as Record<string, unknown>;
  it.each(LANGS)("%s", (lang: string) => {
    expect(files[lang as keyof typeof files]).toEqual(fromDesign[lang]);
  });
  it("every language has the same keys", () => {
    expect(Object.keys(ca).sort()).toEqual(Object.keys(es).sort());
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
});
