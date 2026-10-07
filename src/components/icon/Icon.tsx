"use client";
import { useState, type CSSProperties } from "react";
import { isAppMounted } from "./mount-phase";
import { ICON_PATHS, type IconName } from "./paths";

export type { IconName };

interface IconProps {
  /** Icon name, same as the design's `<kf-i n="…">`. */
  name: IconName;
  /** Pixel size (`s`), default 20. */
  size?: number | string;
  /** Stroke width (`w`), default 2.5. */
  stroke?: number | string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Port of the design's `<kf-i>` web component (design/kf-icons.js), as it actually
 * renders in the approved design. Verified in the browser with a mutation observer:
 *
 * - kf-icons.js sets `display:inline-flex; flex:none; line-height:0` on itself when it
 *   connects. For icons present in the app's FIRST render, React strips those three
 *   properties right after mount (the author's own style, e.g. a colour, stays). Those
 *   icons are plain inline elements whose SVG sits on the text baseline, which adds the
 *   descender gap under each icon (a 17px icon occupies 21px).
 * - Icons mounted LATER (the cart stepper, the menu page after navigating, …) keep the
 *   component's styles, merged after the author's.
 *
 * So each instance decides once, when it mounts, which of the two it is.
 *
 * The design drew the SVG inside a shadow root, so page rules such as
 * `.kf-journey-road svg { position:absolute; inset:0; width:100%; … }` never reached it.
 * Here the SVG is in the light DOM, so it carries inline styles that restore the shadow-DOM
 * defaults (inline beats the non-!important design CSS).
 */
export function Icon({ name, size = 20, stroke = 2.5, style, className }: IconProps) {
  const [mountedLater] = useState(isAppMounted);
  const hostStyle = mountedLater ? { ...style, flex: "0 0 auto", display: "inline-flex", lineHeight: 0 } : style;
  return (
    <span data-icon={name} className={className} style={hostStyle}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ position: "static", inset: "auto", width: `${size}px`, height: `${size}px`, display: "inline" }}
        // Static, build-time constant from paths.ts (generated from the design), never user input.
        dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      />
    </span>
  );
}
