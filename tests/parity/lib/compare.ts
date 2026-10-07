import type { Snap } from "./collect";

export interface Diff {
  path: string;
  field: string;
  design: string;
  port: string;
}

const RECT_TOLERANCE = 1; // px

/**
 * Compares two snapshots element by element. The DOM structure must match
 * exactly (the port keeps the design's tree); after the first structural
 * divergence the rest would only be noise, so comparison stops there.
 */
export function compareSnaps(design: Snap[], port: Snap[], limit = 40): Diff[] {
  const diffs: Diff[] = [];
  const n = Math.max(design.length, port.length);
  for (let i = 0; i < n && diffs.length < limit; i++) {
    const d = design[i],
      p = port[i];
    if (!d || !p || d.tag !== p.tag) {
      diffs.push({
        path: (d ?? p).path,
        field: "structure",
        design: d ? d.tag : "(missing)",
        port: p ? p.tag : "(missing)",
      });
      break;
    }
    if (d.text !== p.text) diffs.push({ path: d.path, field: "text", design: d.text, port: p.text });
    d.rect.forEach((v, k) => {
      if (Math.abs(v - p.rect[k]) > RECT_TOLERANCE)
        diffs.push({
          path: d.path,
          field: ["x", "y", "width", "height"][k],
          design: String(v),
          port: String(p.rect[k]),
        });
    });
    // The accessibility layer may add attributes the design lacks (role, aria-label, id) on the
    // elements it marks with data-kf-a11y; anything it changes that the design *has* still counts.
    const a11y = "data-kf-a11y" in p.attrs;
    for (const k of new Set([...Object.keys(d.attrs), ...Object.keys(p.attrs)]))
      if (k !== "data-kf-a11y" && !(a11y && d.attrs[k] === undefined) && d.attrs[k] !== p.attrs[k])
        diffs.push({ path: d.path, field: `@${k}`, design: d.attrs[k] ?? "(none)", port: p.attrs[k] ?? "(none)" });
    for (const k of Object.keys(d.style))
      if (d.style[k] !== p.style[k]) diffs.push({ path: d.path, field: k, design: d.style[k], port: p.style[k] });
  }
  return diffs.slice(0, limit);
}

export function formatDiffs(diffs: Diff[]): string {
  return diffs
    .map((x) => `  ${x.path}\n    ${x.field}: design=${JSON.stringify(x.design)} port=${JSON.stringify(x.port)}`)
    .join("\n");
}
