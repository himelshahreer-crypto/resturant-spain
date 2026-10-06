import type { Page } from "@playwright/test";

/** Every breakpoint in the design (420, 480, 640, 768, 860, 900, 960) falls between two of these. */
export const VIEWPORTS = [360, 390, 414, 768, 1024, 1280, 1440, 1920] as const;

export interface ParityState {
  name: string;
  /** Path on the port; the design is always loaded at "/" and driven by `act`. */
  portPath: string;
  /** Interaction that puts the page into the state (runs on both implementations). */
  act?: (page: Page) => Promise<void>;
  fullPage?: boolean;
}

/** States checked in Phase 2. Interactions are added as each part is ported. */
export const STATES: ParityState[] = [
  { name: "home", portPath: "/", fullPage: true },
  // Phase 2 adds: home-scrolled, menu, menu-tacos, menu-search-empty, cart, checkout,
  // checkout-errors, confirmation, mobile-nav, and the ca/en variants of each.
];
