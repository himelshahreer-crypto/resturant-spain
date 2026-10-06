import type { Page } from "@playwright/test";

/** Root of the page content in each implementation (same depth under <body>). */
export const ROOTS = {
  design: "#dc-root > .sc-host > *",
  port: "#kf-root > .kf-host > *",
} as const;

export interface Snap {
  path: string;
  tag: string;
  rect: [number, number, number, number];
  text: string;
  attrs: Record<string, string>;
  style: Record<string, string>;
}

/** Computed properties compared between the design and the port. */
export const STYLE_PROPS = [
  "display",
  "position",
  "visibility",
  "opacity",
  "z-index",
  "overflow-x",
  "overflow-y",
  "color",
  "background-color",
  "background-image",
  "background-position",
  "background-size",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "text-decoration-line",
  "white-space",
  "font-variant-numeric",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-style",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "box-shadow",
  "transform",
  "filter",
  "backdrop-filter",
  "mask-image",
  "object-fit",
  "object-position",
  "cursor",
  "animation-name",
  "animation-duration",
  "animation-delay",
  "transition-property",
  "transition-duration",
] as const;

const ATTRS = [
  "aria-label",
  "aria-pressed",
  "aria-expanded",
  "aria-current",
  "aria-hidden",
  "role",
  "href",
  "target",
  "rel",
  "type",
  "placeholder",
  "autocomplete",
  "src",
  "alt",
  "id",
  "data-reveal",
  "data-wave",
  "data-chip",
  "data-noripple",
  "data-pop",
  "data-screen-label",
];

/**
 * Walks the rendered content in document order and records each element's
 * tag, box, own text, a few semantic attributes and the computed styles above.
 * Icons (`<kf-i>` in the design, `<span data-icon>` in the port) are compared
 * as one unit by name and box; their SVG internals are covered by unit tests.
 */
export async function collect(page: Page, rootSelector: string): Promise<Snap[]> {
  return page.evaluate(
    ({ rootSelector, props, attrs }) => {
      const origin = location.origin;
      const norm = (v: string) =>
        v
          .split(origin)
          .join("")
          .replace(/url\("\/?/g, 'url("/');
      const out: Snap[] = [];
      const skip = new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT"]);
      // Transient spans the design's ripple/sweep effects append to buttons and cards.
      const isEffect = (el: Element) => {
        const st = el.getAttribute("style") || "";
        return (
          el.tagName === "SPAN" &&
          st.includes("pointer-events: none") &&
          (st.includes("skewX") || st.includes("rgba(255, 255, 255, 0.45)"))
        );
      };
      const walk = (el: Element, path: string) => {
        const isIcon = el.tagName === "KF-I" || el.hasAttribute("data-icon");
        const tag = isIcon ? `icon:${el.getAttribute("n") ?? el.getAttribute("data-icon")}` : el.tagName.toLowerCase();
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const style: Record<string, string> = {};
        for (const p of props) style[p] = norm(cs.getPropertyValue(p));
        const a: Record<string, string> = {};
        for (const n of attrs) {
          const v = el.getAttribute(n);
          if (v != null) a[n] = norm(v);
        }
        let text = "";
        if (!isIcon) for (const n of el.childNodes) if (n.nodeType === 3) text += n.textContent;
        out.push({
          path,
          tag,
          text: text.replace(/\s+/g, " ").trim(),
          attrs: a,
          style,
          rect: [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 2) / 2) as Snap["rect"],
        });
        if (isIcon) return;
        let i = 0;
        for (const c of el.children)
          if (!skip.has(c.tagName) && !c.hasAttribute("data-fx") && !isEffect(c))
            walk(c, `${path} > ${c.tagName.toLowerCase()}[${i++}]`);
      };
      document.querySelectorAll(rootSelector).forEach((el, i) => walk(el, `root[${i}]`));
      return out;
    },
    { rootSelector, props: STYLE_PROPS as unknown as string[], attrs: ATTRS },
  );
}
