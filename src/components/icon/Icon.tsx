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
 * Port of the design's `<kf-i>` web component (design/kf-icons.js).
 * The host gets the same inline styles the component set on itself
 * (display/flex/line-height override anything passed in, as they did there),
 * and the SVG markup is identical. Renders on the server, ships no JS.
 */
export function Icon({ name, size = 20, stroke = 2.5, style, className }: IconProps) {
  return (
    <span
      data-icon={name}
      className={className}
      style={{ ...style, display: "inline-flex", flex: "none", lineHeight: 0 }}
    >
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
        // Static, build-time constant from paths.ts (generated from the design), never user input.
        dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      />
    </span>
  );
}
