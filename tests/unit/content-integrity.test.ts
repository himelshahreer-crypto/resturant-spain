import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { categories, items, allergens } from "@/content/menu";
import { slides, popular, reviews, journey, timeline, gallery } from "@/content/home";
import { ICON_PATHS } from "@/components/icon/paths";

const itemIds = new Set(items.map((i) => i.id));
const asset = (dir: string, f: string) => `public/assets/${dir}/${f}`;

describe("content integrity", () => {
  it("ids are unique", () => {
    expect(itemIds.size).toBe(items.length);
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
  });
  it("every item belongs to a category and uses known allergens", () => {
    const cats = new Set(categories.map((c) => c.id));
    for (const it of items) {
      expect(cats.has(it.categoryId), it.id).toBe(true);
      for (const a of it.allergens) expect(allergens[a], `${it.id}:${a}`).toBeDefined();
    }
  });
  it("every reference to an item resolves", () => {
    const refs = [...slides, ...reviews, ...popular]
      .map((x) => x.itemId)
      .concat(gallery.flatMap((g) => (g.itemId ? [g.itemId] : [])));
    for (const id of refs) expect(itemIds.has(id), id).toBe(true);
    for (const j of journey) expect(timeline[j.timelineIndex], String(j.timelineIndex)).toBeDefined();
  });
  it("every image file exists", () => {
    const files = [
      ...items.map((i) => asset("food", i.image)),
      ...slides.map((s) => asset("food", s.image)),
      ...journey.map((j) => asset("food", j.image)),
      ...gallery.map((g) => asset("food", g.image)),
      ...reviews.map((r) => asset("people", r.photo)),
    ];
    for (const f of files) expect(existsSync(f), f).toBe(true);
  });
  it("every icon used by content exists", () => {
    const used = [...categories.map((c) => c.icon), ...journey.map((j) => j.icon), ...timeline.map((t) => t.icon)];
    for (const n of used) expect(ICON_PATHS[n], n).toBeDefined();
  });
  it("icon paths are byte-identical to design/kf-icons.js", () => {
    const src = readFileSync("design/kf-icons.js", "utf8");
    const P = vm.runInNewContext(`${src.slice(src.indexOf("const P="), src.indexOf("class KfI"))}; P`, {});
    expect({ ...ICON_PATHS }).toEqual({ ...P });
  });
});
