// First paint: before any JavaScript runs, the port's static HTML + CSS must already show the
// header the design shows (transparent over the hero at >= 900 px, solid below).
import { expect, test } from "@playwright/test";
import { PORT_URL } from "../../playwright.config";
import { collect, ROOTS } from "./lib/collect";
import { compareSnaps, formatDiffs } from "./lib/compare";
import { closeOpenPages, openDesign } from "./lib/pages";
import { loadAssets, settle } from "./lib/stabilize";
import { VIEWPORTS } from "./matrix";

test.afterEach(closeOpenPages);

const HEADER = ":scope > :is(div:first-child, header)";

for (const width of VIEWPORTS) {
  test(`first paint (no JS) header @ ${width}px matches the design`, async ({ browser }) => {
    const design = await openDesign(browser, { width });
    await settle(design, `${ROOTS.design} > :is(div:first-child, header)`);

    const context = await browser.newContext({
      viewport: { width, height: 900 },
      javaScriptEnabled: false,
      reducedMotion: "reduce",
    });
    const port = await context.newPage();
    await port.goto(`${PORT_URL}/`);
    await loadAssets(port);

    const snap = await collect(port, ROOTS.port, HEADER);
    expect(snap.length).toBeGreaterThan(20);
    const diffs = compareSnaps(await collect(design, ROOTS.design, HEADER), snap);
    await context.close();
    expect(diffs, formatDiffs(diffs)).toEqual([]);
  });
}
