import type { Page } from "@playwright/test";
import { waitForApp } from "./lib/stabilize";

/** Every breakpoint in the design (420, 480, 640, 768, 860, 900, 960) falls between two of these. */
export const VIEWPORTS = [360, 390, 414, 768, 1024, 1280, 1440, 1920] as const;

type Act = (page: Page) => Promise<void>;

export interface ParityState {
  name: string;
  /** Port URL to open. The design always opens at "/". */
  portPath?: string;
  /** Language for the design (set through its own saved state, as a returning visitor). */
  designLang?: "ca" | "en";
  /** View the design starts on (saved state too): the equivalent of opening /menu/ directly. */
  designView?: "menu";
  /** Interaction that puts the page into the state; runs identically on both implementations. */
  act?: Act;
  /** Capture only the viewport (the page is not expanded), e.g. for scroll-dependent states. */
  viewportOnly?: boolean;
  /**
   * Compare only this part of the page (a selector relative to the page wrapper's children),
   * for states that exist to check one region.
   */
  scope?: string;
  /** Only run at these widths (e.g. the hamburger exists below 860 px). */
  widths?: (w: number) => boolean;
}

/**
 * Clicks with a DOM click event, without moving the mouse. A real pointer would leave
 * hover-triggered sweeps (and their lasting `position/overflow` styles) on whatever ends
 * up under the cursor when a drawer opens, which depends on timing. Pointer effects
 * (ripple, hover sweep) are covered by their own behaviour tests.
 */
const click =
  (selector: string, text?: string): Act =>
  async (page) => {
    const loc = text ? page.locator(selector, { hasText: text }) : page.locator(selector);
    await loc.locator("visible=true").first().dispatchEvent("click");
  };
const seq =
  (...acts: Act[]): Act =>
  async (page) => {
    for (const a of acts) await a(page);
  };
const until =
  (predicate: string, what: string): Act =>
  (page) =>
    waitForApp(page, predicate, what);

const toMenu = seq(
  click("button", "Pedir ahora"),
  until(`!!document.querySelector('main[data-screen-label="Menu"]')`, "menu view"),
);
const addTwo = seq(
  click("button", "Añadir"),
  until(`document.querySelectorAll('.kf-floating-cart').length === 1`, "floating cart"),
  click("button", "Añadir"),
);
const openCart = seq(
  addTwo,
  click(".kf-floating-cart"),
  until(`!!document.querySelector('[data-drawer]')`, "cart drawer"),
);
const toCheckout = seq(
  openCart,
  click("[data-drawer] button", "Continuar"),
  until(`document.querySelectorAll('[data-drawer] input').length === 4`, "checkout form"),
);
const fill: Act = async (page) => {
  const inputs = page.locator("[data-drawer] input");
  const values = ["Laura Pérez", "laura@example.com", "+34 612 345 678", "Carrer del Mar 45, 2º 1ª"];
  for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
};

export const STATES: ParityState[] = [
  { name: "home" },
  {
    name: "home-scrolled",
    viewportOnly: true,
    // This state checks the header/top bar switching to solid after scrolling. Mid-page, some
    // reveal element always sits on the 12 % threshold at some width, and its own reveal motion
    // moves it back across, so even the design has no stable end state there; the rest of the
    // page is covered at every width by the other states.
    scope: ":scope > :is(div:first-child, header)",
    // Instant (not wheel/smooth) scroll, so the final position is exact.
    act: seq(
      async (p) => p.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" })),
      until("scrollY === 300", "scroll"),
      // …and for the scroll handler to have re-rendered the header as solid.
      until("!document.querySelector('header.kf-nav-transparent')", "solid header"),
    ),
  },
  { name: "menu", act: toMenu },
  { name: "menu-tacos", act: seq(toMenu, click(".kf-cat-chips button", "Tacos fritos")) },
  {
    name: "menu-search-empty",
    act: seq(
      toMenu,
      async (p) => p.locator("main input").fill("zzz"),
      until(`document.body.innerText.includes("zzz")`, "no results"),
    ),
  },
  { name: "cart", act: openCart },
  { name: "checkout", act: toCheckout },
  { name: "checkout-errors", act: seq(toCheckout, click("[data-drawer] button", "Confirmar pedido")) },
  {
    name: "confirmation",
    act: seq(
      toCheckout,
      fill,
      click("[data-drawer] button", "Confirmar pedido"),
      until(`!!document.querySelector('[data-conf]')`, "confirmation"),
    ),
  },
  {
    name: "mobile-nav",
    widths: (w) => w < 860,
    act: seq(click(".kf-nav-hamburger"), until(`!!document.querySelector('[data-nav-drawer]')`, "nav drawer")),
  },
  { name: "home-ca", portPath: "/ca/", designLang: "ca" },
  { name: "home-en", portPath: "/en/", designLang: "en" },
  { name: "menu-direct", portPath: "/menu/", designView: "menu" },
  { name: "menu-direct-en", portPath: "/en/menu/", designLang: "en", designView: "menu" },
];
