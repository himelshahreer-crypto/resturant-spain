import type { CSSProperties } from "react";
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
 * renders in the approved design:
 *
 * - kf-icons.js sets `display:inline-flex; flex:none; line-height:0` on the host, but the
 *   design runtime (React) then rewrites the host's `style` attribute, so those never apply
 *   (verified: every `<kf-i>` has `style=""` or only the author's style). The host is a plain
 *   inline element and the SVG sits on the text baseline, which adds the descender gap under
 *   each icon (a 17px icon occupies 21px). The port reproduces that, not the intended styles.
 * - The design drew the SVG inside a shadow root, so page rules such as
 *   `.kf-journey-road svg { position:absolute; inset:0; width:100%; … }` never reached it.
 *   Here the SVG is in the light DOM, so it carries inline styles that restore the shadow-DOM
 *   defaults (inline beats the non-!important design CSS).
 */
export function Icon({ name, size = 20, stroke = 2.5, style, className }: IconProps) {
  return (
    <span data-icon={name} className={className} style={style}>
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
