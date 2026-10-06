// Reads design/index.html and runs the design's own Component class in a
// sandbox to get its data (menu, slides, reviews, FAQ, …) and every UI string
// in all three languages, exactly as the prototype computes them.
// Used by scripts/extract-content.mjs (writes src/content) and by the unit
// tests (prove src/content still matches the design).
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const LANGS = ["es", "ca", "en"];
/** Placeholder substituted for the ETA in strings that interpolate it. */
export const ETA_TOKEN = "{eta}";

export function loadDesignComponent(htmlPath = "design/index.html") {
  const html = readFileSync(htmlPath, "utf8");
  const m = html.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("design script block not found");
  const sandbox = {
    DCLogic: class {
      constructor(props) {
        this.props = props || {};
      }
      setState() {}
    },
    React: { createElement: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    Date,
    Math,
    JSON,
    String,
    Number,
    Object,
    Array,
  };
  vm.createContext(sandbox);
  return vm.runInContext(`${m[1]}\n;Component`, sandbox);
}

/** UI strings (`t` in renderVals) plus the marquee words, per language. */
export function extractMessages(Component) {
  const out = {};
  for (const lang of LANGS) {
    const c = new Component({});
    c.state = { ...c.state, lang, eta: ETA_TOKEN, now: Date.UTC(2026, 0, 5, 12) };
    const vals = c.renderVals();
    out[lang] = { ...vals.t, marquee: vals.marquee.slice(0, vals.marquee.length / 2) };
  }
  return out;
}

/** Static data blocks, as defined on the design's Component class. */
export function extractData(Component) {
  const pick = (k) => JSON.parse(JSON.stringify(Component[k]));
  return {
    categories: pick("CATS"),
    items: pick("ITEMS"),
    allergens: pick("ALLERGENS"),
    slides: pick("SLIDES"),
    popular: pick("POPULAR"),
    reviews: pick("REVIEWS"),
    journey: pick("JOURNEY"),
    timeline: pick("TIMELINE"),
    gallery: pick("GALLERY"),
    faq: pick("FAQ"),
  };
}
