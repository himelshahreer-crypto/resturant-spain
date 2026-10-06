import type { Browser, Page } from "@playwright/test";
import { DESIGN_URL, PORT_URL } from "../../../playwright.config";
import { prepareDesignContext } from "./baseline";
import { freezeTime, loadAssets } from "./stabilize";

export interface OpenOptions {
  width: number;
  height?: number;
  path?: string;
}

/** Opens the original design (offline, paused clock). Call settle() before capturing. */
export async function openDesign(browser: Browser, { width, height = 900 }: OpenOptions): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await prepareDesignContext(context);
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
  const page = await context.newPage();
  await freezeTime(page);
  await page.goto(`${PORT_URL}${path}`);
  // Wait for hydration: KebabApp sets this once its effects (reveal, sweep…) are wired.
  await page.waitForSelector("html[data-kf-ready]", { state: "attached" });
  await loadAssets(page);
  return page;
}
