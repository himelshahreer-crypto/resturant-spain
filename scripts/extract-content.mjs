// One-off (re-runnable) extraction of the design's content and UI strings.
// Writes src/content/menu.ts, src/content/home.ts and src/messages/{es,ca,en}.json.
// Run: pnpm extract:content
import { writeFile } from "node:fs/promises";
import { loadDesignComponent, extractData, extractMessages, LANGS } from "./lib/design-extract.mjs";
import { toContent } from "./lib/to-content.mjs";

const C = loadDesignComponent();
const c = toContent(extractData(C));
const head =
  "// Extracted from design/index.html by scripts/extract-content.mjs.\n// Source of the menu until the admin panel replaces it (Phase 7).\n";
const ts = (name, type, value) => `export const ${name}: ${type} = ${JSON.stringify(value, null, 2)};\n`;

await writeFile(
  "src/content/menu.ts",
  head +
    'import type { AllergenCode, Category, Localized, MenuItem } from "./types";\n\n' +
    ts("categories", "Category[]", c.categories) +
    "\n" +
    ts("items", "MenuItem[]", c.items) +
    "\n" +
    ts("allergens", "Record<AllergenCode, Localized>", c.allergens),
);

await writeFile(
  "src/content/home.ts",
  head +
    'import type { FaqEntry, GalleryEntry, HeroSlide, JourneyStop, PopularEntry, Review, TimelineEntry } from "./types";\n\n' +
    [
      ts("slides", "HeroSlide[]", c.slides),
      ts("popular", "PopularEntry[]", c.popular),
      ts("reviews", "Review[]", c.reviews),
      ts("journey", "JourneyStop[]", c.journey),
      ts("timeline", "TimelineEntry[]", c.timeline),
      ts("gallery", "GalleryEntry[]", c.gallery),
      ts("faq", "FaqEntry[]", c.faq),
    ].join("\n"),
);

const msgs = extractMessages(C);
for (const l of LANGS) await writeFile(`src/messages/${l}.json`, JSON.stringify(msgs[l], null, 2) + "\n");
console.log(`items ${c.items.length}, categories ${c.categories.length}, strings ${Object.keys(msgs.es).length}/lang`);
