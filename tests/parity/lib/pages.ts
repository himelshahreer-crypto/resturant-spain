import type { Browser, BrowserContext, Page } from "@playwright/test";
import { DESIGN_URL, PORT_URL } from "../../../playwright.config";
import { prepareDesignContext } from "./baseline";
import { freezeTime, loadAssets } from "./stabilize";

const openContexts = new Set<BrowserContext>();

/**
 * Closes every context opened by openDesign/openPort. Call in test.afterEach: each test
 * opens two full pages, and leaking them made later tests slow and flaky (dozens of
 * renderer processes on a 4-core machine).
 */
export async function closeOpenPages() {
  await Promise.all([...openContexts].map((c) => c.close().catch(() => {})));
  openContexts.clear();
}

export interface OpenOptions {
  width: number;
  height?: number;
  path?: string;
  /** Design only: language, applied through its saved state (as for a returning visitor). */
  lang?: "es" | "ca" | "en";
  /** Design only: starting view, applied through its saved state. */
  view?: "home" | "menu";
}

/** Opens the original design (offline, paused clock). Call settle() before capturing. */
export async function openDesign(browser: Browser, { width, height = 900, lang, view }: OpenOptions): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  openContexts.add(context);
  await prepareDesignContext(context);
  if (lang || view)
    await context.addInitScript((saved) => localStorage.setItem("kf4", JSON.stringify({ v: 1, ...saved })), {
      ...(lang ? { lang } : {}),
      ...(view ? { view } : {}),
    });
  const page = await context.newPage();
  await freezeTime(page);
  await page.goto(`${DESIGN_URL}/`);
  await page.waitForSelector("#dc-root main");
  await loadAssets(page);
  return page;
}

/** Opens the Next.js static export the same way. */
export async function openPort(browser: Browser, { width, height = 900, path = "/" }: OpenOptions): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  openContexts.add(context);
  const page = await context.newPage();
  await freezeTime(page);
  await page.goto(`${PORT_URL}${path}`);
  // Wait for hydration: KebabApp sets this once its effects (reveal, sweep…) are wired.
  await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
  await loadAssets(page);
  return page;
}
