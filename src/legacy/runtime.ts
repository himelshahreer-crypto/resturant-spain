// Small helpers reproducing the design runtime's rendering rules (design/support.js),
// used by the generated DesignTemplate.tsx.
import { Fragment, createElement, isValidElement, type CSSProperties, type ReactNode } from "react";

/**
 * Text interpolation: React elements and arrays render as-is, null/undefined/booleans
 * render nothing, anything else renders as <span class="sc-interp">value</span>.
 */
export function interp(value: unknown): ReactNode {
  if (value === undefined || value === null || typeof value === "boolean") return null;
  if (isValidElement(value) || Array.isArray(value)) return createElement(Fragment, null, value as ReactNode);
  return createElement("span", { className: "sc-interp" }, String(value));
}

/** The runtime's style-string parser, applied to resolved (interpolated) style strings. */
export function cssToObj(css: string): CSSProperties {
  const o: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = decl
      .slice(i + 1)
      .trim();
  }
  return o as CSSProperties;
}

/** className joining as the runtime does it: [className, ...pseudoClasses].filter(Boolean).join(" "). */
export function cx(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** sc-for: anything that isn't an array renders nothing. Items are untyped, like the design's view model. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asArray(list: unknown): any[] {
  return Array.isArray(list) ? list : [];
}
